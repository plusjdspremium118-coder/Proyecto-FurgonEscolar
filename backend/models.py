"""
models.py — Entidades de dominio para RutaSegura.
Cumple con RNF-03: Separación estricta entre modelos de dominio y capas de acceso a datos (DAO).
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class Usuario:
    id: Optional[int]
    email: str
    password_hash: str
    nombre: str
    rol: str  # 'conductor' | 'apoderado'
    intentos_fallidos: int = 0
    bloqueado_hasta: Optional[datetime] = None

@dataclass
class Estudiante:
    id: str
    nombre: str
    grado: str
    direccion: str
    parada_id: int
    apoderado_id: int
    asiste_hoy: bool = True
    estado_viaje: str = 'esperando'  # 'esperando' | 'en_viaje' | 'entregado' | 'recibido'
    hora_subida: Optional[str] = None
    hora_bajada: Optional[str] = None
    codigo_retiro: str = '8429'

@dataclass
class UbicacionGPS:
    id: Optional[int]
    conductor_id: int
    recorrido_id: int
    latitud: float
    longitud: float
    velocidad_kmh: float
    timestamp: datetime = datetime.now()

@dataclass
class Recorrido:
    id: Optional[int]
    conductor_id: int
    patente_furgon: str
    estado: str  # 'iniciado' | 'finalizado'
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    codigo_cierre_seguridad: str = '1234'
