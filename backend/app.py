"""
app.py - Servidor Backend FastAPI conectado a Supabase para RutaSegura.
- Arquitectura DAO (RNF-03).
- Seguridad: PBKDF2-SHA256, tokens anti-CSRF.
- WebSockets GPS en tiempo real (RF-05, RF-06).
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json

from database import init_db, get_supabase
from dao.estudiante_dao import EstudianteDAO
from dao.recorrido_dao import RecorridoDAO
from dao.gps_dao import GpsDAO
from dao.usuario_dao import UsuarioDAO

app = FastAPI(
    title="RutaSegura API (Supabase)",
    description="Backend con Supabase, DAO, WebSockets y PBKDF2-SHA256",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

# --- WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                disconnected.append(connection)
        for c in disconnected:
            self.disconnect(c)

manager = ConnectionManager()

# --- PYDANTIC MODELS ---
class LoginRequest(BaseModel):
    correo: str
    contrasena: str
    rol: Optional[str] = None

class RegistroRequest(BaseModel):
    correo: str
    contrasena: str
    nombre: str
    rol: str
    licencia: Optional[str] = None
    telefono_emergencia: Optional[str] = None
    studentName: Optional[str] = None
    studentGrade: Optional[str] = None
    studentStop: Optional[str] = None

class SubidaRequest(BaseModel):
    estudiante_id: str
    hora: str

class BajadaRequest(BaseModel):
    estudiante_id: str
    hora: str

class CierreRecorridoRequest(BaseModel):
    recorrido_id: Optional[str] = None
    codigo_seguridad: str
    hora_fin: Optional[str] = None

class IniciarViajeRequest(BaseModel):
    conductor_id: Optional[str] = None
    patente: str = "ABCD-12"

class ResetDiaRequest(BaseModel):
    confirmar: bool = False

# --- ENDPOINTS AUTH ---

@app.post("/api/auth/login")
def login(req: LoginRequest):
    resultado = UsuarioDAO.validar_login(req.correo, req.contrasena)
    if not resultado["valido"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=resultado["motivo"])
    usuario = resultado["usuario"]
    return {
        "status": "ok",
        "mensaje": "Inicio de sesion exitoso",
        "usuario": {
            "id": usuario["id"],
            "correo": usuario["correo"],
            "nombre": usuario["nombre"],
            "rol": usuario["rol"],
            "csrf_token": usuario.get("csrf_token")
        }
    }

@app.post("/api/auth/registro")
def registro(req: RegistroRequest):
    try:
        nuevo_user = UsuarioDAO.crear_usuario(
            correo=req.correo,
            contrasena=req.contrasena,
            nombre=req.nombre,
            rol=req.rol,
            licencia=req.licencia,
            telefono_emergencia=req.telefono_emergencia
        )
        nuevo_id = nuevo_user.get("id")
        if req.rol == "apoderado" and req.studentName and nuevo_id:
            EstudianteDAO.crear_estudiante(
                nombre=req.studentName,
                direccion=req.studentStop or "Av. Providencia 1345",
                grado=req.studentGrade or "1 Basico",
                id_apoderado=nuevo_id
            )
        return {
            "status": "ok",
            "mensaje": "Usuario registrado exitosamente en Supabase",
            "usuario": {
                "id": nuevo_id,
                "correo": nuevo_user.get("correo"),
                "nombre": nuevo_user.get("nombre"),
                "rol": nuevo_user.get("rol"),
                "csrf_token": nuevo_user.get("csrf_token")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error en registro: {str(e)}")

# --- ENDPOINTS ESTUDIANTES ---

@app.get("/api/estudiantes")
def listar_estudiantes():
    """Retorna todos los escolares (uso del conductor)."""
    return EstudianteDAO.obtener_todos()

@app.get("/api/estudiantes/apoderado/{apoderado_id}")
def listar_estudiantes_por_apoderado(apoderado_id: str):
    """Retorna solo los escolares vinculados a un apoderado especifico."""
    return EstudianteDAO.obtener_por_apoderado(apoderado_id)

# --- ENDPOINTS ASISTENCIA ---

@app.post("/api/asistencia/subida")
def registrar_subida(req: SubidaRequest):
    exito = EstudianteDAO.registrar_subida(req.estudiante_id, req.hora)
    if not exito:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return {"status": "ok", "estado": "en_viaje", "hora": req.hora}

@app.post("/api/asistencia/bajada")
def registrar_bajada(req: BajadaRequest):
    exito = EstudianteDAO.registrar_bajada(req.estudiante_id, req.hora)
    if not exito:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return {"status": "ok", "estado": "entregado", "hora": req.hora}

@app.post("/api/asistencia/no-asiste")
def marcar_no_asiste(req: SubidaRequest):
    EstudianteDAO.marcar_no_asiste(req.estudiante_id)
    return {"status": "ok", "estado": "no_asiste"}

@app.post("/api/asistencia/confirmar-recepcion")
def confirmar_recepcion(req: SubidaRequest):
    EstudianteDAO.confirmar_recepcion(req.estudiante_id)
    return {"status": "ok", "estado": "recibido"}

@app.post("/api/asistencia/reset-dia")
def reset_dia_escolar(req: ResetDiaRequest):
    """Reinicia estados diarios de todos los escolares (inicio del dia)."""
    if not req.confirmar:
        raise HTTPException(status_code=400, detail="Debes confirmar el reset del dia")
    EstudianteDAO.resetear_dia()
    return {"status": "ok", "mensaje": "Estados diarios reiniciados correctamente"}

# --- ENDPOINTS VIAJE / RECORRIDO ---

@app.post("/api/viaje/iniciar")
def iniciar_viaje(req: IniciarViajeRequest):
    viaje = RecorridoDAO.iniciar_recorrido(req.conductor_id or "", req.patente)
    return {"status": "ok", "viaje": viaje, "estado": "en_curso"}

@app.get("/api/viaje/activo")
def obtener_viaje_activo():
    """Retorna el viaje actualmente en curso."""
    viaje = RecorridoDAO.obtener_recorrido_activo()
    if not viaje:
        return {"status": "sin_viaje", "viaje": None}
    return {"status": "ok", "viaje": viaje}

@app.get("/api/viaje/ruta-optimizada")
def obtener_ruta_optimizada():
    """RF-02: Retorna la ruta optimizada de escolares que aun esperan."""
    return RecorridoDAO.obtener_secuencia_optimizada()

@app.post("/api/recorrido/finalizar")
def finalizar_recorrido(req: CierreRecorridoRequest):
    exito = RecorridoDAO.finalizar_recorrido(req.recorrido_id or "", req.codigo_seguridad)
    if not exito:
        raise HTTPException(status_code=400, detail="Codigo de cierre incorrecto o no hay viaje activo")
    return {"status": "ok", "mensaje": "Recorrido finalizado exitosamente"}

@app.get("/api/recorrido/historial")
def historial_recorridos(conductor_id: Optional[str] = None):
    """Retorna el historial de viajes finalizados."""
    return RecorridoDAO.obtener_historial_viajes(conductor_id)

# --- ENDPOINT ESTADO GENERAL ---

@app.get("/api/health")
def health_check():
    """Verifica el estado del servidor y la conexion a Supabase."""
    try:
        sb = get_supabase()
        res = sb.table("usuarios").select("id").limit(1).execute()
        return {
            "status": "ok",
            "supabase": "conectado",
            "usuarios": len(res.data)
        }
    except Exception as e:
        return {"status": "error", "supabase": str(e)}

# --- WEBSOCKET GPS ---

@app.websocket("/ws/gps")
async def websocket_gps(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data_text = await websocket.receive_text()
            data = json.loads(data_text)

            if data.get("type") == "GPS_PING":
                lat = data.get("lat")
                lng = data.get("lng")
                conductor_id = data.get("conductor_id")
                recorrido_id = data.get("recorrido_id")
                speed = data.get("speed", 35.0)

                # Guardar en ubicaciones_gps
                try:
                    GpsDAO.guardar_coordenada(
                        conductor_id=conductor_id,
                        recorrido_id=recorrido_id,
                        lat=lat,
                        lng=lng,
                        velocidad=speed,
                        timestamp_iso=data.get("timestamp")
                    )
                except Exception as e:
                    print(f"[WARN] GPS save: {e}")

                # Actualizar posicion actual en tabla viajes
                if recorrido_id and recorrido_id not in ("default", "1", "None", ""):
                    try:
                        RecorridoDAO.actualizar_posicion(recorrido_id, lat, lng)
                    except Exception as e:
                        print(f"[WARN] GPS viaje update: {e}")

                # Broadcast a todos los clientes conectados
                await manager.broadcast({
                    "type": "GPS_UPDATE",
                    "lat": lat,
                    "lng": lng,
                    "speed": speed,
                    "timestamp": data.get("timestamp"),
                    "conductor_id": conductor_id,
                    "recorrido_id": recorrido_id
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
