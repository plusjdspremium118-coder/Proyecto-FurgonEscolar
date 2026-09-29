"""
gps_dao.py - DAO para GPS conectado a Supabase.
Schema real de ubicaciones_gps: id, conductor_id, recorrido_id, latitud, longitud, velocidad_kmh, timestamp
RF-05: Transmision de coordenadas GPS cada 5 segundos.
"""

from typing import Optional, List
from database import get_supabase


class GpsDAO:

    @staticmethod
    def guardar_coordenada(conductor_id: str, recorrido_id: str,
                           lat: float, lng: float,
                           velocidad: float = 35.0,
                           timestamp_iso: str = None) -> dict:
        """Persiste una coordenada GPS en Supabase."""
        sb = get_supabase()
        from datetime import datetime, timezone
        ts = timestamp_iso or datetime.now(timezone.utc).isoformat()

        data = {
            "latitud": lat,
            "longitud": lng,
            "velocidad_kmh": velocidad,
            "timestamp": ts
        }
        # Solo agregar si no son None para evitar FK errors
        if conductor_id and conductor_id != "default":
            data["conductor_id"] = conductor_id
        if recorrido_id and recorrido_id not in ("default", "1"):
            data["recorrido_id"] = recorrido_id

        res = sb.table("ubicaciones_gps").insert(data).execute()
        return res.data[0] if res.data else {}

    @staticmethod
    def actualizar_gps_viaje(id_viaje: str, lat: float, lng: float) -> bool:
        """Actualiza latitud/longitud actual en la tabla viajes."""
        sb = get_supabase()
        res = sb.table("viajes").update({
            "latitud_actual": lat,
            "longitud_actual": lng
        }).eq("id_viaje", id_viaje).execute()
        return len(res.data) > 0

    @staticmethod
    def obtener_ultima_ubicacion(viaje_id: str) -> Optional[dict]:
        """Retorna la ultima coordenada GPS registrada."""
        sb = get_supabase()
        res = sb.table("ubicaciones_gps").select("*").eq("recorrido_id", viaje_id).order("timestamp", desc=True).limit(1).execute()
        return res.data[0] if res.data else None

    @staticmethod
    def obtener_historial_recorrido(viaje_id: str) -> List[dict]:
        """Retorna el historial completo de coordenadas GPS."""
        sb = get_supabase()
        res = sb.table("ubicaciones_gps").select("*").eq("recorrido_id", viaje_id).order("timestamp").execute()
        return res.data or []
