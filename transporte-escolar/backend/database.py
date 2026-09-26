"""
database.py — Gestor de conexión a base de datos relacional (SQLite / PostgreSQL).
Cumplimiento de RNF-03: Conexión centralizada reutilizada exclusivamente por clases DAO.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rutasegura.db")

def get_connection():
    """Retorna una conexión activa a la base de datos."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializa el esquema de base de datos con tablas normalizadas."""
    conn = get_connection()
    cursor = conn.cursor()

    # Tabla Usuarios (RF-01, Sistema Login y Bloqueo de Cuenta)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol TEXT NOT NULL CHECK(rol IN ('conductor', 'apoderado')),
        intentos_fallidos INTEGER DEFAULT 0,
        bloqueado_hasta TEXT
    );
    """)

    # Tabla Estudiantes (RF-03, RF-04: Control de Asistencia, Subida y Bajada)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS estudiantes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        grado TEXT NOT NULL,
        direccion TEXT NOT NULL,
        parada_id INTEGER NOT NULL,
        apoderado_id INTEGER,
        asiste_hoy INTEGER DEFAULT 1,
        estado_viaje TEXT DEFAULT 'esperando' CHECK(estado_viaje IN ('esperando', 'en_viaje', 'entregado', 'recibido')),
        hora_subida TEXT,
        hora_bajada TEXT,
        codigo_retiro TEXT DEFAULT '8429',
        FOREIGN KEY (apoderado_id) REFERENCES usuarios(id)
    );
    """)

    # Tabla Recorridos (RF-02, RF-07: Iniciar, Optimizar y Finalizar con código)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recorridos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conductor_id INTEGER NOT NULL,
        patente_furgon TEXT NOT NULL,
        estado TEXT DEFAULT 'iniciado' CHECK(estado IN ('iniciado', 'finalizado')),
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT,
        codigo_cierre_seguridad TEXT DEFAULT '1234',
        FOREIGN KEY (conductor_id) REFERENCES usuarios(id)
    );
    """)

    # Tabla Ubicación GPS (RF-05: Transmisión cada 5 segundos)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ubicaciones_gps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conductor_id INTEGER NOT NULL,
        recorrido_id INTEGER NOT NULL,
        latitud REAL NOT NULL,
        longitud REAL NOT NULL,
        velocidad_kmh REAL NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (recorrido_id) REFERENCES recorridos(id)
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("✅ Base de datos inicializada exitosamente.")
