import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ROUTE_STOPS, MAP_CENTER, MAP_ZOOM, fetchRoute } from '../data/routeData';

/**
 * RouteMap — Componente de mapa reutilizable con rutas reales de OSRM.
 *
 * Props:
 *  - busPosition: { lat, lng } | null — posición actual del furgón
 *  - showStops: boolean — mostrar marcadores de paradas
 *  - interactive: boolean — permitir zoom/drag
 *  - className: string — clases CSS adicionales
 *  - children: ReactNode — capas adicionales
 */

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/* ── Custom marker icons ──────────────────── */

function createBusIcon() {
  return L.divIcon({
    className: 'bus-marker',
    html: `
      <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; inset:0; border-radius:50%; background:rgba(232,161,24,0.3); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:38px; height:38px; border-radius:50%; background:#E8A118; border:3px solid #FFFFFF; box-shadow:0 4px 12px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; font-size:18px; color:white; z-index:2;">
          🚌
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });
}

function createStopIcon(type, id, isHighlighted = false) {
  if (type === 'school') {
    return L.divIcon({
      className: 'stop-marker',
      html: `
        <div style="width:34px; height:34px; border-radius:50%; background:#DC2626; border:3px solid #FFFFFF; box-shadow:0 3px 10px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; font-size:16px;">
          🏫
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -20],
    });
  }

  if (isHighlighted) {
    return L.divIcon({
      className: 'stop-marker-highlighted',
      html: `
        <div style="position:relative; width:38px; height:38px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; inset:0; border-radius:50%; background:rgba(22,163,74,0.35); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="width:32px; height:32px; border-radius:50%; background:#16A34A; border:3px solid #FFFFFF; box-shadow:0 4px 12px rgba(22,163,74,0.4); display:flex; align-items:center; justify-content:center; color:#FFFFFF; font-size:14px; font-weight:900; z-index:2;">
            ★
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20],
    });
  }

  return L.divIcon({
    className: 'stop-marker',
    html: `
      <div style="width:28px; height:28px; border-radius:50%; background:#0F172A; border:2.5px solid #FFFFFF; box-shadow:0 3px 8px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; color:#FFFFFF; font-size:12px; font-weight:800; font-family:sans-serif;">
        ${id || '•'}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

/* ── Component to follow bus position ─────── */

function FollowBus({ position }) {
  const map = useMap();
  const isFirst = useRef(true);

  useEffect(() => {
    if (position && isFirst.current) {
      map.setView([position.lat, position.lng], MAP_ZOOM, { animate: true });
      isFirst.current = false;
    }
  }, [position, map]);

  return null;
}

function MapCenterController({ centerPosition }) {
  const map = useMap();
  useEffect(() => {
    if (centerPosition && typeof centerPosition.lat === 'number' && typeof centerPosition.lng === 'number') {
      map.flyTo([centerPosition.lat, centerPosition.lng], centerPosition.zoom || 15, {
        animate: true,
        duration: 1,
      });
    }
  }, [centerPosition, map]);
  return null;
}

/* ── Main RouteMap component ─────────────── */

export default function RouteMap({
  busPosition = null,
  centerPosition = null,
  showStops = true,
  highlightStopName = null,
  interactive = true,
  className = '',
  layerPosition = 'default', // 'default' | 'drive' | 'none'
  children,
}) {
  const [routePath, setRoutePath] = useState([]);
  const [mapType, setMapType] = useState('google'); // 'google' | 'satellite'

  useEffect(() => {
    fetchRoute(ROUTE_STOPS).then(setRoutePath);
  }, []);

  return (
    <div className={`relative w-full h-full ${className} ${layerPosition === 'drive' ? '[&_.leaflet-top]:top-20' : ''}`}>
      {/* Selector de capa de mapa con estilo armónico y posición adaptada */}
      {interactive && layerPosition !== 'none' && (
        <div
          className={`absolute ${
            layerPosition === 'drive'
              ? 'top-20 right-3 sm:top-20 sm:right-4'
              : layerPosition === 'below-header'
              ? 'top-14 right-3'
              : 'top-3 right-3'
          } z-[900] flex items-center bg-white/95 backdrop-blur-md rounded-2xl p-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#FDE68A] text-xs font-bold text-[#64748B] transition-all`}
        >
          <div className="w-5 h-5 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 ml-0.5 mr-1" title="Capas de mapa">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <button
            type="button"
            id="btn-layer-calles"
            onClick={() => setMapType('google')}
            className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold ${
              mapType === 'google'
                ? 'bg-gradient-to-r from-[#D97706] to-[#E8A118] text-white shadow-xs font-black'
                : 'text-[#64748B] hover:text-[#92400E] hover:bg-[#FEF3C7]/60'
            }`}
          >
            Calles
          </button>
          <button
            type="button"
            id="btn-layer-satelite"
            onClick={() => setMapType('satellite')}
            className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold ${
              mapType === 'satellite'
                ? 'bg-gradient-to-r from-[#1E293B] to-[#0F172A] text-white shadow-xs font-black'
                : 'text-[#64748B] hover:text-[#92400E] hover:bg-[#FEF3C7]/60'
            }`}
          >
            Satélite
          </button>
        </div>
      )}

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        attributionControl={true}
        className="w-full h-full rounded-none"
        style={{ background: '#f0f3f6' }}
      >
        {/* Capas de mapas en alta resolución */}
        {mapType === 'google' && (
          <TileLayer
            attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            maxZoom={20}
          />
        )}

        {mapType === 'satellite' && (
          <TileLayer
            attribution='&copy; <a href="https://maps.google.com">Google Maps Satélite</a>'
            url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            maxZoom={20}
          />
        )}

        {/* Route polyline */}
        {routePath.length > 0 && (
          <>
            {/* Sombra de la ruta */}
            <Polyline
              positions={routePath}
              pathOptions={{
                color: '#0F172A',
                weight: 8,
                opacity: 0.18,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Línea principal de ruta - Amarillo ámbar institucional */}
            <Polyline
              positions={routePath}
              pathOptions={{
                color: mapType === 'satellite' ? '#FACC15' : '#E8A118',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* Stop markers */}
        {showStops &&
          ROUTE_STOPS.map((stop) => {
            const isHighlighted = Boolean(
              highlightStopName &&
              (stop.name.toLowerCase().includes(highlightStopName.toLowerCase()) ||
               highlightStopName.toLowerCase().includes(stop.name.toLowerCase()))
            );
            return (
              <Marker
                key={stop.id}
                position={[stop.lat, stop.lng]}
                icon={createStopIcon(stop.type, stop.id, isHighlighted)}
              >
                <Popup>
                  {isHighlighted && (
                    <div className="inline-block text-[11px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-md mb-1.5">
                      ★ Tu parada asignada
                    </div>
                  )}
                  <div className="font-bold text-[13px] text-[#0F172A]">{stop.name}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    {stop.type === 'school' ? '🏫 Establecimiento educacional' : `📍 Parada ${stop.id}: ${stop.address}`}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Bus marker */}
        {busPosition && (
          <Marker
            position={[busPosition.lat, busPosition.lng]}
            icon={createBusIcon()}
          >
            <Popup>
              <div className="font-bold text-[13px] text-[#0F172A]">🚌 Furgón Los Robles</div>
              <div className="text-[11px] text-[#22C55E] font-medium mt-0.5">● Transmisión GPS en vivo</div>
            </Popup>
          </Marker>
        )}

        {busPosition && <FollowBus position={busPosition} />}
        {centerPosition && <MapCenterController centerPosition={centerPosition} />}

        {children}
      </MapContainer>
    </div>
  );
}
