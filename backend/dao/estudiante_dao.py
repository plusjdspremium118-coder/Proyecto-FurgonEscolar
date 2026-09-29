"""
estudiante_dao.py - DAO para Escolares conectado a Supabase.
Schema real escolares: id, nombre_completo, direccion_hogar, grado, parada_id, id_apoderado, asiste_hoy, estado_actual, hora_subida, hora_bajada, codigo_retiro
Schema real asistencia: id_registro, id_viaje, id_escolar, hora_subida, hora_bajada
RF-03: Registro de Subida. RF-04: Registro de Bajada.
"""

from typing import Optional, List
from database import get_supabase


class EstudianteDAO:

    @staticmethod
    def obtener_todos() -> List[dict]:
        """Retorna todos los escolares desde Supabase."""
        sb = get_supabase()
        res = sb.table("escolares").select("*").order("parada_id").execute()
        return res.data or []

    @staticmethod
    def obtener_por_apoderado(id_apoderado: str) -> List[dict]:
        """Retorna solo los escolares de un apoderado especifico."""
        sb = get_supabase()
        res = sb.table("escolares").select("*").eq("id_apoderado", id_apoderado).execute()
        return res.data or []

    @staticmethod
    def obtener_por_id(estudiante_id: str) -> Optional[dict]:
        """Obtiene un escolar por su UUID."""
        sb = get_supabase()
        res = sb.table("escolares").select("*").eq("id", estudiante_id).execute()
        return res.data[0] if res.data else None

    @staticmethod
    def crear_estudiante(nombre: str, direccion: str, grado: str,
                         id_apoderado: str, parada_id: int = 1) -> dict:
        """Registra un nuevo escolar vinculado a su apoderado."""
        sb = get_supabase()
        res = sb.table("escolares").insert({
            "nombre_completo": nombre,
            "direccion_hogar": direccion,
            "grado": grado,
            "parada_id": parada_id,
            "id_apoderado": id_apoderado,
            "estado_actual": "esperando",
            "asiste_hoy": True,
            "codigo_retiro": "8429"
        }).execute()
        return res.data[0] if res.data else {}

    @staticmethod
    def registrar_subida(estudiante_id: str, hora: str) -> bool:
        """RF-03: Marca al escolar como en_viaje y registra hora de subida."""
        sb = get_supabase()
        res = sb.table("escolares").update({
            "estado_actual": "en_viaje",
            "hora_subida": hora
        }).eq("id", estudiante_id).execute()

        # Registrar en tabla asistencia - obtener viaje activo primero
        try:
            viaje_activo = sb.table("viajes").select("id_viaje").eq("estado", "en_curso").limit(1).execute()
            if viaje_activo.data:
                id_viaje = viaje_activo.data[0]["id_viaje"]
                # Upsert: si ya existe registro para este escolar en este viaje, actualizar
                existe = sb.table("asistencia").select("id_registro").eq("id_escolar", estudiante_id).eq("id_viaje", id_viaje).execute()
                if existe.data:
                    sb.table("asistencia").update({"hora_subida": hora}).eq("id_registro", existe.data[0]["id_registro"]).execute()
                else:
                    sb.table("asistencia").insert({
                        "id_viaje": id_viaje,
                        "id_escolar": estudiante_id,
                        "hora_subida": hora
                    }).execute()
        except Exception as e:
            print(f"[WARN] No se pudo registrar asistencia subida: {e}")

        return len(res.data) > 0

    @staticmethod
    def registrar_bajada(estudiante_id: str, hora: str) -> bool:
        """RF-04: Marca al escolar como entregado y registra hora de bajada."""
        sb = get_supabase()
        res = sb.table("escolares").update({
            "estado_actual": "entregado",
            "hora_bajada": hora
        }).eq("id", estudiante_id).execute()

        # Registrar en tabla asistencia
        try:
            viaje_activo = sb.table("viajes").select("id_viaje").eq("estado", "en_curso").limit(1).execute()
            if viaje_activo.data:
                id_viaje = viaje_activo.data[0]["id_viaje"]
                existe = sb.table("asistencia").select("id_registro").eq("id_escolar", estudiante_id).eq("id_viaje", id_viaje).execute()
                if existe.data:
                    sb.table("asistencia").update({"hora_bajada": hora}).eq("id_registro", existe.data[0]["id_registro"]).execute()
                else:
                    sb.table("asistencia").insert({
                        "id_viaje": id_viaje,
                        "id_escolar": estudiante_id,
                        "hora_bajada": hora
                    }).execute()
        except Exception as e:
            print(f"[WARN] No se pudo registrar asistencia bajada: {e}")

        return len(res.data) > 0

    @staticmethod
    def marcar_no_asiste(estudiante_id: str) -> bool:
        """Marca que el escolar no asiste hoy."""
        sb = get_supabase()
        res = sb.table("escolares").update({
            "asiste_hoy": False,
            "estado_actual": "no_asiste"
        }).eq("id", estudiante_id).execute()
        return len(res.data) > 0

    @staticmethod
    def confirmar_recepcion(estudiante_id: str) -> bool:
        """Confirma que el apoderado recibio al escolar."""
        sb = get_supabase()
        res = sb.table("escolares").update({
            "estado_actual": "recibido"
        }).eq("id", estudiante_id).execute()
        return len(res.data) > 0

    @staticmethod
    def resetear_dia() -> bool:
        """Reinicia los estados diarios de todos los escolares para un nuevo dia."""
        sb = get_supabase()
        res = sb.table("escolares").update({
            "estado_actual": "esperando",
            "asiste_hoy": True,
            "hora_subida": None,
            "hora_bajada": None
        }).neq("id", "").execute()
        return len(res.data) > 0
