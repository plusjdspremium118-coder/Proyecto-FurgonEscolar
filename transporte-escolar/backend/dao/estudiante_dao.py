"""
estudiante_dao.py — Data Access Object (DAO) para la entidad Estudiante.
Cumplimiento estricto de RNF-03: 100% de consultas SQL aisladas en esta clase.

Requisitos Funcionales cubiertos:
- RF-03 (HU-03): Registro de Subida -> El estado del escolar cambia a 'en_viaje'.
- RF-04 (HU-04): Registro de Bajada -> El estado del escolar cambia a 'entregado'.
"""

from typing import List, Optional
from database import get_connection
from models import Estudiante

class EstudianteDAO:
    @staticmethod
    def obtener_todos() -> List[dict]:
        """Obtiene la lista completa de escolares con su estado actual."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estudiantes ORDER BY nombre ASC;")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def obtener_por_id(estudiante_id: str) -> Optional[dict]:
        """Busca un estudiante por su identificador único."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estudiantes WHERE id = ?;", (estudiante_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def registrar_subida(estudiante_id: str, hora_actual: str) -> bool:
        """
        RF-03 (HU-03): Registro de Subida en tiempo real.
        El estado del escolar cambia a 'en_viaje' en la BD con su hora exacta.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE estudiantes 
            SET estado_viaje = 'en_viaje', hora_subida = ?
            WHERE id = ?;
        """, (hora_actual, estudiante_id))
        filas_afectadas = cursor.rowcount
        conn.commit()
        conn.close()
        return filas_afectadas > 0

    @staticmethod
    def registrar_bajada(estudiante_id: str, hora_actual: str) -> bool:
        """
        RF-04 (HU-04): Registro de Bajada en tiempo real.
        El estado del escolar cambia a 'entregado' en la BD con su hora exacta.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE estudiantes 
            SET estado_viaje = 'entregado', hora_bajada = ?
            WHERE id = ?;
        """, (hora_actual, estudiante_id))
        filas_afectadas = cursor.rowcount
        conn.commit()
        conn.close()
        return filas_afectadas > 0

    @staticmethod
    def confirmar_asistencia(estudiante_id: str, asiste: bool) -> bool:
        """Confirmación de asistencia por parte del apoderado (Asiste / No asiste)."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE estudiantes 
            SET asiste_hoy = ?
            WHERE id = ?;
        """, (1 if asiste else 0, estudiante_id))
        filas_afectadas = cursor.rowcount
        conn.commit()
        conn.close()
        return filas_afectadas > 0

    @staticmethod
    def actualizar_codigo_retiro(estudiante_id: str, nuevo_codigo: str) -> bool:
        """Actualiza el código de seguridad de retiro generado por el apoderado."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE estudiantes 
            SET codigo_retiro = ?
            WHERE id = ?;
        """, (nuevo_codigo, estudiante_id))
        filas_afectadas = cursor.rowcount
        conn.commit()
        conn.close()
        return filas_afectadas > 0
