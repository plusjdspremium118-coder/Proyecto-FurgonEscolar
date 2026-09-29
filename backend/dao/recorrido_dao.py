"""
recorrido_dao.py - DAO para Viajes conectado a Supabase.
Schema real viajes: id_viaje, id_conductor, patente_furgon, fecha_viaje, latitud_actual, longitud_actual, estado, hora_fin, codigo_cierre_seguridad
RF-02: Optimizacion de ruta. RF-07: Finalizacion con codigo de seguridad.
"""

from typing import Optional, List
from database import get_supabase
from datetime import datetime, date


class RecorridoDAO:

    @staticmethod
    def iniciar_recorrido(conductor_id: str, patente_furgon: str) -> dict:
        """Registra el inicio de un nuevo viaje en Supabase."""
        sb = get_supabase()

        # Verificar si ya hay un viaje en curso para no duplicar
        activo = sb.table("viajes").select("id_viaje,estado").eq("estado", "en_curso").execute()
        if activo.data:
            return activo.data[0]

        data = {
            "patente_furgon": patente_furgon,
            "estado": "en_curso",
            "fecha_viaje": str(date.today()),
            "codigo_cierre_seguridad": "1234",
            "latitud_actual": -33.4372,
            "longitud_actual": -70.6506
        }
        # Solo agregar conductor si es un UUID valido
        if conductor_id and conductor_id not in ("default", "None", ""):
            data["id_conductor"] = conductor_id

        res = sb.table("viajes").insert(data).execute()
        return res.data[0] if res.data else {}

    @staticmethod
    def obtener_recorrido_activo() -> Optional[dict]:
        """Retorna el viaje actualmente en curso."""
        sb = get_supabase()
        res = sb.table("viajes").select("*").eq("estado", "en_curso").limit(1).execute()
        return res.data[0] if res.data else None

    @staticmethod
    def finalizar_recorrido(recorrido_id: str, codigo_seguridad: str) -> bool:
        """RF-07: Finaliza el recorrido verificando el codigo de seguridad."""
        sb = get_supabase()

        # Buscar viaje activo
        if recorrido_id and recorrido_id not in ("1", "default", "None", ""):
            res_viaje = sb.table("viajes").select("id_viaje,codigo_cierre_seguridad").eq("id_viaje", recorrido_id).execute()
        else:
            res_viaje = sb.table("viajes").select("id_viaje,codigo_cierre_seguridad").eq("estado", "en_curso").limit(1).execute()

        if not res_viaje.data:
            return False

        viaje = res_viaje.data[0]
        stored_code = viaje.get("codigo_cierre_seguridad", "1234")

        if codigo_seguridad and codigo_seguridad != stored_code:
            return False

        now = datetime.now().isoformat()
        res = sb.table("viajes").update({
            "estado": "finalizado",
            "hora_fin": now
        }).eq("id_viaje", viaje["id_viaje"]).execute()

        return len(res.data) > 0

    @staticmethod
    def actualizar_posicion(id_viaje: str, lat: float, lng: float) -> bool:
        """Actualiza la posicion actual del furgon en la tabla viajes."""
        sb = get_supabase()
        res = sb.table("viajes").update({
            "latitud_actual": lat,
            "longitud_actual": lng
        }).eq("id_viaje", id_viaje).execute()
        return len(res.data) > 0

    @staticmethod
    def obtener_secuencia_optimizada() -> List[dict]:
        """RF-02: Retorna la secuencia optima de paradas por numero de parada."""
        sb = get_supabase()
        res = sb.table("escolares").select("*").eq("asiste_hoy", True).eq("estado_actual", "esperando").order("parada_id").execute()
        return res.data or []

    @staticmethod
    def obtener_historial_viajes(conductor_id: str = None) -> List[dict]:
        """Retorna el historial de viajes finalizados."""
        sb = get_supabase()
        query = sb.table("viajes").select("*").eq("estado", "finalizado").order("fecha_viaje", desc=True)
        if conductor_id:
            query = query.eq("id_conductor", conductor_id)
        res = query.execute()
        return res.data or []
