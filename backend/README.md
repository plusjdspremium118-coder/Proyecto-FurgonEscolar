# Backend RutaSegura — Arquitectura DAO en Python

Este backend cumple con el requisito no funcional **RNF-03**:
> *"El backend del sistema deberá estar construido utilizando Python e implementando el patrón de diseño DAO (Data Access Object). 100% de consultas SQL aisladas en clases DAO."*

---

## 🏛️ Estructura del Patrón DAO

```
backend/
├── app.py                 # API REST y WebSocket con FastAPI
├── database.py            # Gestor de conexiones SQL relacionales
├── models.py              # Entidades del dominio (Usuario, Estudiante, Recorrido, UbicacionGPS)
├── requirements.txt       # Dependencias del servidor
└── dao/                   # 100% de consultas SQL aisladas
    ├── estudiante_dao.py  # RF-03 (Subida 'en_viaje') y RF-04 (Bajada 'entregado')
    ├── gps_dao.py         # RF-05 (Coordenadas cada 5s) y RF-06 (Seguimiento apoderados)
    ├── recorrido_dao.py   # RF-02 (Ruta óptima) y RF-07 (Cierre con código de seguridad)
    └── usuario_dao.py     # RF-01 (Roles) y Bloqueo tras 3 intentos fallidos
```

---

## 🚀 Requisitos Funcionales Implementados en el Backend
* **RF-01**: Autenticación por roles (`usuario_dao.py`).
* **RF-02**: Trazado y registro de paradas óptimas (`recorrido_dao.py`).
* **RF-03**: Registro de Subida en tiempo real (`estudiante_dao.registrar_subida()`), cambiando estado a **`en_viaje`**.
* **RF-04**: Registro de Bajada en tiempo real (`estudiante_dao.registrar_bajada()`), cambiando estado a **`entregado`**.
* **RF-05**: Transmisión GPS al menos cada 5 segundos vía WebSocket (`gps_dao.py`).
* **RF-06**: Broadcast seguro a los apoderados vía WebSocket.
* **RF-07 & RNF-02**: Finalización de recorrido con código de seguridad y detención estricta del sensor GPS.

---

## 🛠️ Cómo ejecutar el backend
```bash
cd backend
pip install -r requirements.txt
python database.py        # Inicializa las tablas SQLite normalizadas
uvicorn app:app --reload  # Levanta el servidor en http://localhost:8000
```
