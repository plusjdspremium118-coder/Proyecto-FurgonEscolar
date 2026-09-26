"""
gps_dao.py — Data Access Object (DAO) para la entidad UbicacionGPS.
Cumplimiento estricto de RNF-03: 100% de consultas SQL aisladas en esta clase.

Requisitos Funcionales cubiertos:
- RF-05 (HU-05): Transmisión GPS -> El servidor recibe lat/lon al menos cada 5 segundos.
- RF-06 (HU-06): Seguimiento Apoderados -> Visualización de ubicación en tiempo real.
- RF-07 / RNF-02: Detención estricta al finalizar (Cero peticiones al hardware al estar inactivo).
"""

from typing import List, Optional
from database import get_connection

class GpsDAO:
    @staticmethod
    def guardar_coordenada(conductor_id: int, recorrido_id: int, lat: float, lng: float, velocidad: float, timestamp_iso: str) -> int:
        """
        RF-05: Guarda la posición GPS capturada en tiempo real cada 5 segundos.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ubicaciones_gps (conductor_id, recorrido_id, latitud, longitud, velocidad_kmh, timestamp)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (conductor_id, recorrido_id, lat, lng, velocidad, timestamp_iso))
        nuevo_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return nuevo_id

    @staticmethod
    def obtener_ultima_ubicacion(recorrido_id: int) -> Optional[dict]:
        """
        RF-06: Obtiene la última posición GPS transmitida para el mapa del apoderado.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM ubicaciones_gps 
            WHERE recorrido_id = ? 
            ORDER BY id DESC LIMIT 1;
        """, (recorrido_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def obtener_historial_recorrido(recorrido_id: int) -> List[dict]:
        """Retorna todas las coordenadas del recorrido para dibujar la traza histórica."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT latitud, longitud, timestamp, velocidad_kmh 
            FROM ubicaciones_gps 
            WHERE recorrido_id = ? 
            ORDER BY id ASC;
        """, (recorrido_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
