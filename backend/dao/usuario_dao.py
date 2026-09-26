"""
usuario_dao.py — Data Access Object (DAO) para la entidad Usuario.
Cumplimiento estricto de RNF-03: 100% de consultas SQL aisladas en esta clase.

Requisitos Funcionales cubiertos:
- RF-01 (HU-01): Autenticación basada en Roles (Conductor o Apoderado).
- Caso de uso Login: Error 3 veces en iniciar sesión -> Bloquear Cuenta.
"""

from typing import Optional
from database import get_connection

class UsuarioDAO:
    @staticmethod
    def buscar_por_email(email: str) -> Optional[dict]:
        """Obtiene un usuario por su correo electrónico."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM usuarios WHERE email = ?;", (email,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def registrar_intento_fallido(email: str) -> int:
        """Incrementa el contador de intentos fallidos de contraseña."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE usuarios 
            SET intentos_fallidos = intentos_fallidos + 1 
            WHERE email = ?;
        """, (email,))
        conn.commit()
        
        cursor.execute("SELECT intentos_fallidos FROM usuarios WHERE email = ?;", (email,))
        row = cursor.fetchone()
        conn.close()
        return row['intentos_fallidos'] if row else 1

    @staticmethod
    def bloquear_cuenta(email: str, minutos: int = 1) -> bool:
        """Bloquea temporalmente la cuenta tras 3 intentos fallidos consecutivos."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE usuarios 
            SET bloqueado_hasta = datetime('now', '+' || ? || ' minute')
            WHERE email = ?;
        """, (minutos, email))
        filas = cursor.rowcount
        conn.commit()
        conn.close()
        return filas > 0

    @staticmethod
    def restablecer_intentos(email: str) -> bool:
        """Restablece los intentos fallidos al iniciar sesión exitosamente."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE usuarios 
            SET intentos_fallidos = 0, bloqueado_hasta = NULL 
            WHERE email = ?;
        """, (email,))
        filas = cursor.rowcount
        conn.commit()
        conn.close()
        return filas > 0
