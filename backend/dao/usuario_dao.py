"""
usuario_dao.py — DAO para la entidad Usuario conectado a Supabase.
- RF-01: Autenticación con roles.
- Bloqueo automático tras 3 intentos fallidos consecutivos.
- Hashing PBKDF2-SHA256 con sal única por usuario.
- Prevención SQL Injection mediante consultas parametrizadas de Supabase.
"""

from typing import Optional
from database import get_supabase
from security import hash_password, verify_password, generate_csrf_token


class UsuarioDAO:

    @staticmethod
    def buscar_por_email(correo: str) -> Optional[dict]:
        """Obtiene un usuario por su correo electrónico."""
        sb = get_supabase()
        res = sb.table("usuarios").select("*").eq("correo", correo).execute()
        return res.data[0] if res.data else None

    @staticmethod
    def crear_usuario(correo: str, contrasena: str, nombre: str, rol: str,
                      licencia: str = None, telefono_emergencia: str = None) -> dict:
        """Registra un nuevo usuario con contraseña cifrada PBKDF2-SHA256."""
        sb = get_supabase()
        pwd_hash, salt = hash_password(contrasena)
        csrf_token = generate_csrf_token()

        data = {
            "correo": correo,
            "contrasena_hash": pwd_hash,
            "salt": salt,
            "nombre": nombre,
            "rol": rol,
            "intentos_fallidos": 0,
            "csrf_token": csrf_token
        }
        if licencia:
            data["licencia"] = licencia
        if telefono_emergencia:
            data["telefono_emergencia"] = telefono_emergencia

        res = sb.table("usuarios").insert(data).execute()
        return res.data[0] if res.data else {}

    @staticmethod
    def validar_login(correo: str, contrasena: str) -> dict:
        """
        Valida las credenciales y gestiona el bloqueo por fuerza bruta.
        Retorna: { valido: bool, usuario: dict|None, motivo: str }
        """
        sb = get_supabase()
        usuario = UsuarioDAO.buscar_por_email(correo)

        if not usuario:
            return {"valido": False, "motivo": "Correo no registrado en el sistema."}

        intentos = usuario.get("intentos_fallidos", 0)
        if intentos >= 3:
            return {"valido": False, "motivo": "Cuenta bloqueada por 3 intentos fallidos. Contacta al administrador."}

        stored_hash = usuario.get("contrasena_hash", "")
        salt = usuario.get("salt", "")

        if not verify_password(contrasena, stored_hash, salt):
            UsuarioDAO.bloquear_cuenta(usuario["id"], intentos + 1)
            restantes = max(0, 2 - intentos)
            return {"valido": False, "motivo": f"Contraseña incorrecta. Intentos restantes: {restantes}."}

        # Login exitoso: reiniciar intentos y generar nuevo CSRF token
        csrf_token = generate_csrf_token()
        sb.table("usuarios").update({
            "intentos_fallidos": 0,
            "csrf_token": csrf_token
        }).eq("id", usuario["id"]).execute()

        usuario["csrf_token"] = csrf_token
        return {"valido": True, "usuario": usuario}

    @staticmethod
    def bloquear_cuenta(usuario_id: str, intentos: int) -> None:
        """Incrementa intentos fallidos o bloquea la cuenta."""
        sb = get_supabase()
        sb.table("usuarios").update({"intentos_fallidos": intentos}).eq("id", usuario_id).execute()

    @staticmethod
    def restablecer_intentos(usuario_id: str) -> None:
        """Restablece el contador de intentos fallidos."""
        sb = get_supabase()
        sb.table("usuarios").update({"intentos_fallidos": 0}).eq("id", usuario_id).execute()
