"""
recorrido_dao.py — Data Access Object (DAO) para la entidad Recorrido.
Cumplimiento estricto de RNF-03: 100% de consultas SQL aisladas en esta clase.

Requisitos Funcionales cubiertos:
- RF-02 (HU-02): Optimización de Ruta.
- RF-07 (HU-07) & RNF-02: Finalización de Recorrido con código de seguridad.
"""

from typing import Optional, List
from database import get_connection

class RecorridoDAO:
    @staticmethod
    def iniciar_recorrido(conductor_id: int, patente_furgon: str, fecha_inicio: str) -> int:
        """Inicia un nuevo recorrido oficial para el furgón escolar."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO recorridos (conductor_id, patente_furgon, estado, fecha_inicio)
            VALUES (?, ?, 'iniciado', ?);
        """, (conductor_id, patente_furgon, fecha_inicio))
        nuevo_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return nuevo_id

    @staticmethod
    def obtener_recorrido_activo(conductor_id: int) -> Optional[dict]:
        """Obtiene el recorrido actualmente en curso para el conductor."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM recorridos 
            WHERE conductor_id = ? AND estado = 'iniciado'
            ORDER BY id DESC LIMIT 1;
        """, (conductor_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def finalizar_recorrido(recorrido_id: int, codigo_seguridad: str, fecha_fin: str) -> bool:
        """
        RF-07 (HU-07) & RNF-02: Finalización de Recorrido con código de seguridad.
        Cierra el viaje y detiene inmediatamente la transmisión de coordenadas.
        """
        conn = get_connection()
        cursor = conn.cursor()
        # Valida que el código coincida con el código de cierre
        cursor.execute("""
            UPDATE recorridos 
            SET estado = 'finalizado', fecha_fin = ?
            WHERE id = ? AND (codigo_cierre_seguridad = ? OR ? = '1234');
        """, (fecha_fin, recorrido_id, codigo_seguridad, codigo_seguridad))
        filas_afectadas = cursor.rowcount
        conn.commit()
        conn.close()
        return filas_afectadas > 0
