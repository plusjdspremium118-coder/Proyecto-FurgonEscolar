/**
 * routeData.js — Datos de ruta y optimización algorítmica para Santiago de Chile.
 * Cumplimiento de RF-02 (Optimización de Ruta):
 * "El sistema deberá calcular y trazar la ruta óptima en el mapa desde el punto actual
 * hasta las direcciones de los escolares asignados, priorizando desde el más cercano."
 */

export const ROUTE_STOPS = [
  { id: 1, name: 'Colegio Los Andes',      lat: -33.4372, lng: -70.6506, type: 'school', address: 'Av. El Cerro 1983' },
  { id: 2, name: 'Parada Av. Providencia', lat: -33.4260, lng: -70.6100, type: 'stop',   address: 'Av. Providencia 2100' },
  { id: 3, name: 'Parada Los Leones',      lat: -33.4220, lng: -70.6050, type: 'stop',   address: 'Nueva Providencia 1881' },
  { id: 4, name: 'Parada Tobalaba',        lat: -33.4190, lng: -70.5970, type: 'stop',   address: 'Av. Tobalaba 450' },
  { id: 5, name: 'Parada Apoquindo',       lat: -33.4170, lng: -70.5870, type: 'stop',   address: 'Av. Apoquindo 3000' },
];

export const MAP_CENTER = [-33.4260, -70.6100];
export const MAP_ZOOM = 14;

export const MOCK_STUDENTS = [
  { id: 'martin',    name: 'Martín Reyes',     grade: '4° Básico', stopId: 3, status: 'a_bordo', avatar: '👦', address: 'Av. Providencia 1345' },
  { id: 'sofia_m',   name: 'Sofía Martínez',   grade: '3° Básico', stopId: 2, status: 'a_bordo', avatar: '👧', address: 'Av. Providencia 2100' },
  { id: 'tomas_h',   name: 'Tomás Herrera',    grade: '5° Básico', stopId: 3, status: 'esperando', avatar: '👦', address: 'Nueva Providencia 1881' },
  { id: 'valentina_l', name: 'Valentina López',grade: '2° Básico', stopId: 4, status: 'esperando', avatar: '👧', address: 'Av. Tobalaba 450' },
  { id: 'matias_g',  name: 'Matías González',  grade: '4° Básico', stopId: 5, status: 'esperando', avatar: '👦', address: 'Av. Apoquindo 3000' },
];

/**
 * Fórmula de Haversine para calcular distancia en kilómetros entre dos puntos GPS.
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2);
}

/**
 * RF-02: Algoritmo de Optimización de Ruta (Nearestá Neighbor Heuristic / TSP).
 * Ordena las paradas desde la ubicación actual del furgón, priorizando siempre la parada más cercana.
 */
export function optimizeRouteStops(currentLocation, stopsToVisit) {
  const unvisited = [...stopsToVisit];
  const optimizedOrder = [];
  let currentPoint = currentLocation || ROUTE_STOPS[0];

  while (unvisited.length > 0) {
    // Buscar la parada no visitada más cercana
    let closestáIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = getDistanceKm(
        currentPoint.lat,
        currentPoint.lng,
        unvisited[i].lat,
        unvisited[i].lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestáIndex = i;
      }
    }

    const nextStop = unvisited.splice(closestáIndex, 1)[0];
    optimizedOrder.push({
      ...nextStop,
      distanceFromPrevKm: minDistance,
    });
    currentPoint = nextStop;
  }

  return optimizedOrder;
}

/**
 * Obtiene la ruta real usando la API externa de OSRM (OpenStreetMap).
 * Retorna array de [lat, lng] para Leaflet.
 */
export async function fetchRoute(waypoints) {
  try {
    const coords = waypoints.map((wp) => `${wp.lng},${wp.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
    return waypoints.map((wp) => [wp.lat, wp.lng]);
  } catch (error) {
    console.warn('⚠️ Error en API OSRM, usando línea directa:', error);
    return waypoints.map((wp) => [wp.lat, wp.lng]);
  }
}

/**
 * Obtiene la duración estáimada en minutos de la ruta.
 */
export async function fetchRouteDuration(waypoints) {
  try {
    const coords = waypoints.map((wp) => `${wp.lng},${wp.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return Math.round(data.routes[0].duration / 60);
    }
    return 15;
  } catch {
    return 15;
  }
}
