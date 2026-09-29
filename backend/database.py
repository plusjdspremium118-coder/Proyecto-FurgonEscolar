"""
database.py — Gestor de conexión a Supabase (PostgreSQL en la nube) para RutaSegura.
Cumple con:
- Arquitectura DAO (RNF-03): Conexión centralizada reutilizada exclusivamente por clases DAO.
- Seguridad: Inicialización y sembrado con contraseñas cifradas PBKDF2-SHA256.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from security import hash_password

# Cargar variables de entorno desde .env
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tpmbmaqfdwaqbombnkmt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

_supabase_client: Client = None

def get_supabase() -> Client:
    """Retorna la instancia única del cliente oficial de Supabase."""
    global _supabase_client
    if _supabase_client is None:
        key = os.getenv('SUPABASE_KEY') or SUPABASE_KEY
        url = os.getenv('SUPABASE_URL') or SUPABASE_URL
        if not key:
            load_dotenv(env_path)
            key = os.getenv('SUPABASE_KEY', '')
        _supabase_client = create_client(url, key)
    return _supabase_client

# Alias para compatibilidad
get_connection = get_supabase

def init_db():
    """
    Verifica el estado de las tablas en Supabase y siembra datos iniciales
    de prueba si las tablas están vacías (con contraseñas cifradas y salt).
    """
    sb = get_supabase()
    try:
        res_users = sb.table("usuarios").select("id").execute()
        if len(res_users.data) == 0:
            print("[INFO] Sembrando usuarios iniciales en Supabase...")
            pwd_hash, salt = hash_password("password123")

            carlos_res = sb.table("usuarios").insert({
                "correo": "carlos.conductor@rutasegura.cl",
                "contrasena_hash": pwd_hash,
                "salt": salt,
                "nombre": "Carlos Pérez",
                "rol": "conductor",
                "licencia": "A3-Profesional",
                "telefono_emergencia": "+56 9 1122 3344"
            }).execute()

            sofia_res = sb.table("usuarios").insert({
                "correo": "sofia.reyes@email.cl",
                "contrasena_hash": pwd_hash,
                "salt": salt,
                "nombre": "Sofía Reyes",
                "rol": "apoderado",
                "telefono_emergencia": "+56 9 8765 4321"
            }).execute()

            apoderado_id = sofia_res.data[0]["id"]
            conductor_id = carlos_res.data[0]["id"]

            print("[INFO] Sembrando escolares iniciales...")
            sb.table("escolares").insert([
                {"nombre_completo": "Martín Morales", "direccion_hogar": "Av. Providencia 2100", "grado": "3° Básico A", "parada_id": 1, "id_apoderado": apoderado_id, "estado_actual": "esperando"},
                {"nombre_completo": "Sofía Reyes", "direccion_hogar": "Los Leones 1420", "grado": "1° Básico B", "parada_id": 2, "id_apoderado": apoderado_id, "estado_actual": "esperando"},
                {"nombre_completo": "Tomás González", "direccion_hogar": "Tobalaba 850", "grado": "2° Básico A", "parada_id": 3, "id_apoderado": apoderado_id, "estado_actual": "esperando"},
                {"nombre_completo": "Valentina Silva", "direccion_hogar": "Av. Apoquindo 4500", "grado": "Kinder", "parada_id": 4, "id_apoderado": apoderado_id, "estado_actual": "esperando"},
                {"nombre_completo": "Matías Rojas", "direccion_hogar": "Padre Hurtado 1200", "grado": "4° Básico B", "parada_id": 5, "id_apoderado": apoderado_id, "estado_actual": "esperando"}
            ]).execute()

            sb.table("viajes").insert({
                "id_conductor": conductor_id,
                "patente_furgon": "ABCD-12",
                "estado": "en_curso",
                "codigo_cierre_seguridad": "1234"
            }).execute()

            print("[OK] Datos semilla inicializados con éxito en Supabase.")
        else:
            print(f"[OK] Supabase conectado. Existen {len(res_users.data)} usuarios registrados.")
    except Exception as e:
        print(f"[WARN] Error inicializando datos en Supabase: {e}")

if __name__ == "__main__":
    init_db()
