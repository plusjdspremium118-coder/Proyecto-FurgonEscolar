import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RouteMap from '../components/RouteMap';
import { useTransportState } from '../data/useTransportState';
import { ROUTE_STOPS, optimizeRouteStops, getDistanceKm } from '../data/routeData';
import { gpsService } from '../services/gpsWebSocketService';

// Genera iniciales a partir del nombre del alumno
function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// Paleta de colores para avatares
const AVATAR_PALETTE = ['#3B82F6', '#8B5CF6', '#0EA5E9', '#10B981', '#E8A118'];

export default function Conductor() {
  const navigate = useNavigate();
  const {
    students,
    activePickupCode,
    isRouteActive,
    startRoute,
    finishRoute,
    recordBoarding,
    recordDropoff,
    sendDriverNotice,
  } = useTransportState();

  const [activeTab, setActiveTab] = useState('escolares');
  // Filtro interactivo por estado ('todos' | 'por_recoger' | 'a_bordo' | 'entregados' | 'ausentes')
  const [filterStatus, setFilterStatus] = useState('todos');
  const [isDriveMode, setIsDriveMode] = useState(false);
  const [mapCenterPosition, setMapCenterPosition] = useState(null);
  const [completedStopIds, setCompletedStopIds] = useState([]);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [inputCloseCode, setInputCloseCode] = useState('');
  const [closeError, setCloseError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [currentGps, setCurrentGps] = useState(null);
  const [gpsStatus, setGpsStatus] = useState(gpsService.getConnectionStatus());

  useEffect(() => {
    if (isRouteActive) gpsService.startTransmission();
    else gpsService.stopTransmission();
    const unsubscribe = gpsService.subscribe((pos, status) => {
      setCurrentGps(pos);
      setGpsStatus(status);
    });
    return () => unsubscribe();
  }, [isRouteActive]);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function handleStartRoute() {
    startRoute();
    gpsService.startTransmission();
    showToast('Recorrido iniciado. Transmisión GPS activa.');
  }

  function handleConfirmFinish() {
    setCloseError('');
    if (!inputCloseCode.trim()) { setCloseError('Ingresa el código PIN de cierre.'); return; }
    if (inputCloseCode.trim() !== '1234') { setCloseError('Código incorrecto. El PIN de prueba es: 1234'); return; }
    finishRoute('1234');
    gpsService.stopTransmission();
    setShowCloseModal(false);
    setInputCloseCode('');
    showToast('Recorrido finalizado. Sensor GPS detenido.');
  }

  function handleBoarding(student) {
    recordBoarding(student.id);
    showToast(`Subida de ${student.name} registrada.`);
  }

  function handleDropoff(student) {
    recordDropoff(student.id);
    showToast(`Bajada de ${student.name} registrada.`);
  }

  function handleNoticeRecogida(student) {
    sendDriverNotice(student.id, 'recogida_cerca');
    showToast(`Aviso de llegada enviado al apoderado de ${student.name}.`);
  }

  function handleNoticeEntrega(student) {
    sendDriverNotice(student.id, 'entrega_cerca');
    showToast(`Aviso de entrega enviado al apoderado de ${student.name}.`);
  }

  // Métricas cuantitativas
  const boardedCount = students.filter((s) => s.attending && (s.status === 'a_bordo' || s.status === 'en_viaje')).length;
  const deliveredCount = students.filter((s) => s.attending && (s.status === 'entregado' || s.status === 'recibido')).length;
  const absentCount = students.filter((s) => !s.attending).length;
  const waitingCount = students.filter((s) => s.attending && s.status === 'esperando').length;

  // Filtrado dinámico según la tarjeta métrica seleccionada
  const filteredStudents = students.filter((s) => {
    if (filterStatus === 'por_recoger') return s.attending && s.status === 'esperando';
    if (filterStatus === 'a_bordo') return s.attending && (s.status === 'a_bordo' || s.status === 'en_viaje');
    if (filterStatus === 'entregados') return s.attending && (s.status === 'entregado' || s.status === 'recibido');
    if (filterStatus === 'ausentes') return !s.attending;
    return true; // 'todos'
  });

  const currentBusLocation = currentGps || ROUTE_STOPS[0];
  const optimalStops = optimizeRouteStops(currentBusLocation, ROUTE_STOPS);

  // Próxima parada pendiente en la secuencia
  const nextStop = optimalStops.find(stop => !completedStopIds.includes(stop.id)) || optimalStops[0];

  function handleCenterOnStop(stop) {
    setMapCenterPosition({ lat: stop.lat, lng: stop.lng, zoom: 16, time: Date.now() });
    showToast(`Cámara enfocada en ${stop.name}.`);
  }

  function handleMarkArrival(stop) {
    if (!completedStopIds.includes(stop.id)) {
      setCompletedStopIds((prev) => [...prev, stop.id]);
    }
    // Notificar a alumnos de estáa parada
    const stopStudents = students.filter(s =>
      s.stop?.toLowerCase().includes(stop.name.toLowerCase()) ||
      stop.name.toLowerCase().includes(s.stop?.toLowerCase()) ||
      s.stopId === stop.id
    );
    stopStudents.forEach(st => {
      if (st.attending && st.status === 'esperando') {
        sendDriverNotice(st.id, 'recogida_cerca');
      }
    });
    showToast(`Llegada a ${stop.name} registrada. Alumnos notificados.`);
  }

  function getFilterLabel(status) {
    switch (status) {
      case 'por_recoger': return 'Por recoger';
      case 'a_bordo': return 'A bordo';
      case 'entregados': return 'Entregados';
      case 'ausentes': return 'Ausentes';
      default: return 'Todos';
    }
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-[#F1F5F9]">
      <div className="w-full max-w-[480px] h-[100dvh] sm:h-[840px] sm:max-h-[calc(100dvh-2rem)] sm:my-4 flex flex-col bg-white sm:rounded-lg sm:shadow-sm sm:border sm:border-[#E2E8F0] overflow-hidden relative">

        {/* ─── Toast Flotante ─── */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 animate-fade-in pointer-events-none">
            <div className="bg-[#0F172A] text-white px-5 py-4 rounded-lg shadow-2xl flex items-center justify-between gap-3 border border-white/10 pointer-events-auto">
              <p className="text-xs sm:text-sm text-[#F1F5F9] font-medium leading-relaxed">{toastMessage}</p>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-[#94A3B8] hover:text-white shrink-0 cursor-pointer p-1"
                title="Cerrar aviso"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ─── Header Principal ─── */}
        <header className="px-5 pt-4 pb-3.5 bg-white border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white select-none shrink-0 shadow-sm bg-gradient-to-tr from-[#D97706] to-[#F59E0B]">
              CP
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#64748B] leading-none truncate">Panel Conductor</p>
              <p className="text-sm sm:var(--muted)ase font-bold text-[#0F172A] mt-0.5 truncate">Carlos Pérez</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-logout-conductor"
              onClick={() => navigate('/login')}
              className="h-10 px-3.5 sm:px-4 rounded-lg text-xs font-bold text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] hover:bg-[#FEF3C7] hover:text-[#78350F] hover:border-[#FCD34D] transition-all cursor-pointer flex items-center gap-2 shadow-xs shrink-0 whitespace-nowrap active:scale-95"
              title="Cerrar sesión"
            >
              <div className="w-5 h-5 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706] shrink-0">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="leading-none">Salir</span>
            </button>
          </div>
        </header>

        {/* ─── Main Content con Scroll Natural ─── */}
        <main className="flex-1 overflow-y-auto custom-scroll">
          <div className="px-4 sm:px-5 py-4 space-y-4">

            {/* ── Consola Principal del Conductor y Furgón ── */}
            <div className="bg-white border border-[#CBD5E1] rounded-lg p-4 sm:p-5 shadow-2xs space-y-3.5">
              {/* Encabezado del vehículo y acceso a Modo Viaje */}
              <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-[#64748B] tracking-wider uppercase">Furgón Asignado</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="var(--muted)ase font-black text-[#0F172A]">Los Robles</h2>
                    <span className="text-xs font-mono font-black text-[#1E293B] bg-[#F1F5F9] border border-[#CBD5E1] px-2 py-0.5 rounded-md shadow-2xs">
                      ABCD-12
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs ${
                    gpsStatus.isConnected
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                      : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      gpsStatus.isConnected ? 'bg-[#22C55E] animate-pulse' : 'bg-[#F59E0B] animate-ping'
                    }`} />
                    <span>{gpsStatus.isConnected ? 'GPS Activo' : 'Buscando GPS'}</span>
                  </span>
                </div>
              </div>

              {/* ── KPI METRICS: Botones de Filtro Rápido Interactivos (5 Tarjetas) ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    Filtrar por estado
                  </p>
                  {filterStatus !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => setFilterStatus('todos')}
                      className="text-[11px] font-bold text-[#D97706] hover:underline cursor-pointer"
                    >
                      Mostrar todos ({students.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {/* 1. Total */}
                  <button
                    type="button"
                    id="kpi-filter-todos"
                    onClick={() => setFilterStatus('todos')}
                    className={`px-1 py-2 sm:py-2.5 rounded-xl text-center transition-all cursor-pointer select-none active:scale-95 ${
                      filterStatus === 'todos'
                        ? 'bg-[#0F172A] border-2 border-[#0F172A] text-white shadow-sm ring-2 ring-[#0F172A]/25 scale-[1.02]'
                        : 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <p className={`text-[10px] sm:text-xs font-bold truncate ${filterStatus === 'todos' ? 'text-white/80' : 'text-[#64748B]'}`}>
                      Total
                    </p>
                    <p className="text-sm sm:text-lg font-black mt-0.5">{students.length}</p>
                  </button>

                  {/* 2. Por recoger */}
                  <button
                    type="button"
                    id="kpi-filter-por-recoger"
                    onClick={() => setFilterStatus(filterStatus === 'por_recoger' ? 'todos' : 'por_recoger')}
                    className={`px-1 py-2 sm:py-2.5 rounded-xl text-center transition-all cursor-pointer select-none active:scale-95 ${
                      filterStatus === 'por_recoger'
                        ? 'bg-[#D97706] border-2 border-[#B45309] text-white shadow-sm ring-2 ring-[#D97706]/30 scale-[1.02]'
                        : 'bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7]'
                    }`}
                  >
                    <p className={`text-[10px] sm:text-xs font-bold truncate ${filterStatus === 'por_recoger' ? 'text-white/90' : 'text-[#92400E]'}`}>
                      Recoger
                    </p>
                    <p className="text-sm sm:text-lg font-black mt-0.5">{waitingCount}</p>
                  </button>

                  {/* 3. A bordo */}
                  <button
                    type="button"
                    id="kpi-filter-a-bordo"
                    onClick={() => setFilterStatus(filterStatus === 'a_bordo' ? 'todos' : 'a_bordo')}
                    className={`px-1 py-2 sm:py-2.5 rounded-xl text-center transition-all cursor-pointer select-none active:scale-95 ${
                      filterStatus === 'a_bordo'
                        ? 'bg-[#2563EB] border-2 border-[#1D4ED8] text-white shadow-sm ring-2 ring-[#2563EB]/30 scale-[1.02]'
                        : 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] hover:bg-[#DBEAFE]'
                    }`}
                  >
                    <p className={`text-[10px] sm:text-xs font-bold truncate ${filterStatus === 'a_bordo' ? 'text-white/90' : 'text-[#1E40AF]'}`}>
                      A bordo
                    </p>
                    <p className="text-sm sm:text-lg font-black mt-0.5">{boardedCount}</p>
                  </button>

                  {/* 4. Entregados */}
                  <button
                    type="button"
                    id="kpi-filter-entregados"
                    onClick={() => setFilterStatus(filterStatus === 'entregados' ? 'todos' : 'entregados')}
                    className={`px-1 py-2 sm:py-2.5 rounded-xl text-center transition-all cursor-pointer select-none active:scale-95 ${
                      filterStatus === 'entregados'
                        ? 'bg-[#16A34A] border-2 border-[#15803D] text-white shadow-sm ring-2 ring-[#16A34A]/30 scale-[1.02]'
                        : 'bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] hover:bg-[#DCFCE7]'
                    }`}
                  >
                    <p className={`text-[10px] sm:text-xs font-bold truncate ${filterStatus === 'entregados' ? 'text-white/90' : 'text-[#166534]'}`}>
                      Entregado
                    </p>
                    <p className="text-sm sm:text-lg font-black mt-0.5">{deliveredCount}</p>
                  </button>

                  {/* 5. Ausentes */}
                  <button
                    type="button"
                    id="kpi-filter-ausentes"
                    onClick={() => setFilterStatus(filterStatus === 'ausentes' ? 'todos' : 'ausentes')}
                    className={`px-1 py-2 sm:py-2.5 rounded-xl text-center transition-all cursor-pointer select-none active:scale-95 ${
                      filterStatus === 'ausentes'
                        ? 'bg-[#DC2626] border-2 border-[#B91C1C] text-white shadow-sm ring-2 ring-[#DC2626]/30 scale-[1.02]'
                        : 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2]'
                    }`}
                  >
                    <p className={`text-[10px] sm:text-xs font-bold truncate ${filterStatus === 'ausentes' ? 'text-white/90' : 'text-[#991B1B]'}`}>
                      Ausentes
                    </p>
                    <p className="text-sm sm:text-lg font-black mt-0.5">{absentCount}</p>
                  </button>
                </div>
              </div>

              {/* Botón de control de recorrido oficial */}
              {!isRouteActive ? (
                <button
                  type="button"
                  id="btn-iniciar-recorrido"
                  onClick={handleStartRoute}
                  className="w-full min-h-[48px] py-3 rounded-xl bg-gradient-to-r from-[#D97706] to-[#E8A118] hover:from-[#B45309] hover:to-[#D97706] text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Iniciar recorrido oficial</span>
                </button>
              ) : (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-2.5 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
                    <p className="text-xs font-bold text-[#14532D] truncate">
                      Recorrido activo · GPS transmitiendo
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#166534] bg-white border border-[#BBF7D0] px-2 py-0.5 rounded-lg shrink-0">
                    En vivo
                  </span>
                </div>
              )}
            </div>

            {/* Pestáañas Principales (Escolares / Mapa) */}
            <div className="flex bg-[#E2E8F0]/70 p-1 rounded-xl">
              <button
                type="button"
                id="tab-btn-escolares"
                onClick={() => setActiveTab('escolares')}
                className={`flex-1 min-h-[40px] py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'escolares'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span>Lista de Escolares</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'escolares' ? 'bg-[#F1F5F9] text-[#0F172A]' : 'bg-[#CBD5E1]/60 text-[#475569]'
                }`}>
                  {filteredStudents.length}
                </span>
              </button>
              <button
                type="button"
                id="tab-btn-mapa"
                onClick={() => setActiveTab('mapa')}
                className={`flex-1 min-h-[40px] py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'mapa'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span>Ruta en Mapa</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'mapa' ? 'bg-[#F1F5F9] text-[#0F172A]' : 'bg-[#CBD5E1]/60 text-[#475569]'
                }`}>
                  {ROUTE_STOPS.length}
                </span>
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TAB 1: LISTA DE ESCOLARES (Separación y Ergonomía Visual)
                ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'escolares' && (
              <div className="space-y-4">
                {/* Cabecera del filtro activo */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      Alumnos ({filteredStudents.length})
                    </span>
                    {filterStatus !== 'todos' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                        <span>Filtro: {getFilterLabel(filterStatus)}</span>
                        <button
                          type="button"
                          onClick={() => setFilterStatus('todos')}
                          className="ml-1 hover:text-[#0F172A] font-black cursor-pointer"
                          title="Quitar filtro"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>

                  {filterStatus !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => setFilterStatus('todos')}
                      className="text-xs font-bold text-[#D97706] hover:underline cursor-pointer"
                    >
                      Ver todos
                    </button>
                  )}
                </div>

                {/* Tarjetas de Alumnos con Espaciado Ergonómico (space-y-4 = 16px) */}
                <div className="space-y-4">
                  {filteredStudents.length === 0 ? (
                    <div className="bg-white border border-[#E2E8F0] rounded-lg py-12 px-4 text-center">
                      <div className="w-12 h-12 rounded-lg bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-[#0F172A]">No hay alumnos en el filtro "{getFilterLabel(filterStatus)}".</p>
                      <p className="text-xs text-[#64748B] mt-1">Puedes cambiar de filtro o ver el total de alumnos registrados.</p>
                      <button
                        type="button"
                        onClick={() => setFilterStatus('todos')}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E8A118] hover:bg-[#D97706] transition-all cursor-pointer shadow-2xs"
                      >
                        Ver todos los alumnos
                      </button>
                    </div>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const isAbsent = !student.attending;
                      const isBoarded = student.status === 'a_bordo' || student.status === 'en_viaje';
                      const isDropped = student.status === 'entregado';
                      const isConfirmed = student.status === 'recibido';
                      const isWaiting = student.status === 'esperando';

                      let statusBadge = {
                        label: 'Por recoger',
                        bg: 'bg-[#FFFBEB]',
                        text: 'text-[#92400E]',
                        border: 'border-[#FDE68A]',
                        dot: 'bg-[#F59E0B]',
                      };

                      if (isAbsent) {
                        statusBadge = {
                          label: 'No asiste',
                          bg: 'bg-[#FEF2F2]',
                          text: 'text-[#991B1B]',
                          border: 'border-[#FECACA]',
                          dot: 'bg-[#EF4444]',
                        };
                      } else if (isConfirmed) {
                        statusBadge = {
                          label: 'Recibido',
                          bg: 'bg-[#F0FDF4]',
                          text: 'text-[#166534]',
                          border: 'border-[#BBF7D0]',
                          dot: 'bg-[#22C55E]',
                        };
                      } else if (isDropped) {
                        statusBadge = {
                          label: 'Entregado',
                          bg: 'bg-[#EFF6FF]',
                          text: 'text-[#1E40AF]',
                          border: 'border-[#BFDBFE]',
                          dot: 'bg-[#3B82F6]',
                        };
                      } else if (isBoarded) {
                        statusBadge = {
                          label: 'A bordo',
                          bg: 'bg-[#EFF6FF]',
                          text: 'text-[#1E40AF]',
                          border: 'border-[#BFDBFE]',
                          dot: 'bg-[#3B82F6]',
                        };
                      }

                      const avatarColor = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];

                      return (
                        <div
                          key={student.id}
                          className="bg-white border border-[#CBD5E1] rounded-lg overflow-hidden shadow-2xs hover:border-[#94A3B8] transition-all"
                        >
                          {/* Cabecera del Alumno */}
                          <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-2xs"
                                style={{ background: isAbsent ? '#94A3B8' : avatarColor }}
                              >
                                {getInitials(student.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="text-sm sm:var(--muted)ase font-black text-[#0F172A] truncate">
                                    {student.name}
                                  </h3>
                                  {student.id === 'martin' && (
                                    <span className="text-[10px] font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-md">
                                      Pupilo
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-[#475569] font-medium mt-0.5">
                                  <span className="truncate">{student.stop}</span>
                                  <span>·</span>
                                  <span className="shrink-0">{student.grade}</span>
                                </div>
                              </div>
                            </div>

                            {/* Badge de estado amplio y legible */}
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                              <span>{statusBadge.label}</span>
                            </span>
                          </div>

                          {/* Sección de Contexto y Botones Ergonómicos (min 48px) */}
                          <div className="px-4 sm:px-4.5 pb-4.5 pt-1 space-y-3">
                            {isAbsent ? (
                              <div className="px-3.5 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2.5">
                                <svg className="w-5 h-5 text-[#EF4444] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                  <p className="text-xs sm:text-sm font-bold text-[#991B1B]">Inasistencia confirmada por apoderado</p>
                                  <p className="text-xs text-[#B91C1C] mt-0.5">Omitir parada en {student.stop}.</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Metadatos de apoderado y retiro */}
                                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 flex-wrap text-xs">
                                  <div className="flex items-center gap-2 text-[#475569] min-w-0">
                                    <span className="font-semibold text-[#1E293B]">Apoderado:</span>
                                    <span className="truncate">{student.parentName}</span>
                                    {student.boardedAt && (
                                      <>
                                        <span className="text-[#CBD5E1]">·</span>
                                        <span className="font-semibold text-[#1E293B]">Subió:</span>
                                        <span>{student.boardedAt}</span>
                                      </>
                                    )}
                                  </div>

                                  {student.id === 'martin' && (
                                    <div className="inline-flex items-center gap-1.5 bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-0.5 rounded-lg shrink-0">
                                      <span className="text-xs font-semibold text-[#92400E]">PIN Retiro:</span>
                                      <span className="font-mono font-black text-xs text-[#78350F]">{activePickupCode}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Botones táctiles ergonómicos: min 48px de altura, colores diferenciados */}
                                {(isWaiting || (!isBoarded && !isDropped && !isConfirmed)) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    {/* Botón 1: Avisar llegada (Claro con borde de contraste) */}
                                    <button
                                      type="button"
                                      id={`btn-avisar-recogida-${student.id}`}
                                      onClick={() => handleNoticeRecogida(student)}
                                      className={`min-h-[48px] h-12 rounded-xl text-xs sm:text-sm font-bold px-4 py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] ${
                                        student.lastNotice?.type === 'recogida_cerca'
                                          ? 'bg-[#F0FDF4] border-2 border-[#86EFAC] text-[#166534]'
                                          : 'bg-white border-2 border-[#CBD5E1] text-[#1E293B] hover:bg-[#F8FAFC]'
                                      }`}
                                    >
                                      {student.lastNotice?.type === 'recogida_cerca' ? (
                                        <>
                                          <svg className="w-4 h-4 text-[#16A34A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                          <span className="truncate">Aviso enviado ({student.lastNotice.time})</span>
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                          </svg>
                                          <span className="truncate">Avisar llegada</span>
                                        </>
                                      )}
                                    </button>

                                    {/* Botón 2: Confirmar subida (Ámbar corporativo de alto contraste) */}
                                    <button
                                      type="button"
                                      id={`btn-subir-${student.id}`}
                                      onClick={() => handleBoarding(student)}
                                      className="min-h-[48px] h-12 rounded-xl text-xs sm:text-sm font-black text-white px-4 py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-[#D97706] to-[#E8A118] hover:from-[#B45309] hover:to-[#D97706] shadow-xs active:scale-[0.99]"
                                    >
                                      <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-9 5h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v9a2 2 0 002 2zm1 0v2m8-2v2" />
                                      </svg>
                                      <span className="truncate">Confirmar subida</span>
                                    </button>
                                  </div>
                                )}

                                {isBoarded && !isDropped && !isConfirmed && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    {/* Botón 1: Avisar entrega (Azul informativo) */}
                                    <button
                                      type="button"
                                      id={`btn-avisar-entrega-${student.id}`}
                                      onClick={() => handleNoticeEntrega(student)}
                                      className={`min-h-[48px] h-12 rounded-xl text-xs sm:text-sm font-bold px-4 py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] ${
                                        student.lastNotice?.type === 'entrega_cerca'
                                          ? 'bg-[#F0FDF4] border-2 border-[#86EFAC] text-[#166534]'
                                          : 'bg-[#EFF6FF] border-2 border-[#BFDBFE] text-[#1D4ED8] hover:bg-[#DBEAFE]'
                                      }`}
                                    >
                                      {student.lastNotice?.type === 'entrega_cerca' ? (
                                        <>
                                          <svg className="w-4 h-4 text-[#16A34A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                          <span className="truncate">Aviso enviado ({student.lastNotice.time})</span>
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                          </svg>
                                          <span className="truncate">Avisar entrega</span>
                                        </>
                                      )}
                                    </button>

                                    {/* Botón 2: Confirmar bajada (Verde esmeralda de alto contraste) */}
                                    <button
                                      type="button"
                                      id={`btn-bajar-${student.id}`}
                                      onClick={() => handleDropoff(student)}
                                      className="min-h-[48px] h-12 rounded-xl text-xs sm:text-sm font-black text-white px-4 py-2.5 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                                    >
                                      <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="truncate">Confirmar bajada</span>
                                    </button>
                                  </div>
                                )}

                                {(isDropped || isConfirmed) && (
                                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                                    <div className="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                                      <svg className="w-4 h-4 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs sm:text-sm font-bold text-[#14532D]">
                                        {isConfirmed
                                          ? `Recibido por ${student.receivedConfirmation?.receiver || student.parentName}`
                                          : `Bajó del furgón a las ${student.deliveredAt}`}
                                      </p>
                                      <p className="text-xs text-[#16A34A] mt-0.5">
                                        {isConfirmed
                                          ? `Hora de entrega: ${student.receivedConfirmation?.time || student.deliveredAt}`
                                          : 'Entrega registrada con éxito'}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 2: RUTA EN MAPA
                ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'mapa' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#D97706] uppercase tracking-wider">Navegación GPS</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                        En vivo
                      </span>
                    </div>
                    <h3 className="var(--muted)ase sm:text-lg font-black text-[#0F172A] mt-0.5">Ruta optimizada</h3>
                  </div>

                  {/* El ÚNICO botón para activar Modo Viaje */}
                  <button
                    type="button"
                    id="btn-abrir-modo-viaje"
                    onClick={() => setIsDriveMode(true)}
                    className="h-10 px-4 rounded-lg bg-gradient-to-r from-[#D97706] to-[#E8A118] hover:from-[#B45309] hover:to-[#D97706] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all shrink-0"
                    title="Navegación en pantalla completa para el volante"
                  >
                    <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm0-14a6 6 0 100 12 6 6 0 000-12z" />
                      </svg>
                    </div>
                    <span>Modo Viaje</span>
                  </button>
                </div>

                {/* Mapa interactivo */}
                <div className="relative w-full h-[360px] sm:h-[420px] rounded-lg sm:rounded-lg overflow-hidden border border-[#E2E8F0] shadow-[0_4px_20px_rgba(0,0,0,0.08)] bg-[#F8FAFC]">
                  {!isDriveMode && (
                    <RouteMap
                      busPosition={currentBusLocation}
                      centerPosition={mapCenterPosition}
                      showStops={true}
                      interactive={true}
                      layerPosition="default"
                    />
                  )}
                </div>

                {/* Orden sugerido de paradas */}
                <div className="bg-white border border-[#CBD5E1] rounded-lg overflow-hidden shadow-2xs">
                  <div className="px-5 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC] flex items-center justify-between">
                    <p className="text-xs font-bold text-[#475569] uppercase tracking-wider">Secuencia de paradas sugerida</p>
                    <span className="text-xs text-[#64748B] font-semibold">{optimalStops.length} paradas</span>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {optimalStops.map((stop, idx) => {
                      const isDone = completedStopIds.includes(stop.id);
                      const isCurrent = stop.id === nextStop.id && !isDone;
                      const dist = getDistanceKm(currentBusLocation.lat, currentBusLocation.lng, stop.lat, stop.lng);

                      return (
                        <div
                          key={stop.id}
                          className={`flex items-center gap-3.5 px-4 sm:px-5 py-3.5 transition-colors ${
                            isCurrent ? 'bg-[#FFFBEB]/70' : isDone ? 'bg-[#F0FDF4]/50' : 'hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                              isDone ? 'bg-[#16A34A] text-white' : isCurrent ? 'bg-[#E8A118] text-white' : 'bg-[#E2E8F0] text-[#475569]'
                            }`}
                          >
                            {isDone ? '✓' : idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#0F172A] truncate">{stop.name}</p>
                            <p className="text-xs text-[#64748B] truncate mt-0.5">{stop.address}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-[#334155] bg-[#F1F5F9] px-2.5 py-1 rounded-lg border border-[#E2E8F0]">
                              {dist} km
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCenterOnStop(stop)}
                              className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] flex items-center justify-center text-[#D97706] shadow-2xs active:scale-95 cursor-pointer"
                              title="Centrar mapa en estáa parada"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ─── Footer: Finalizar recorrido ─── */}
        <footer className="shrink-0 px-4 sm:px-5 py-3.5 bg-white border-t border-[#E2E8F0] flex items-center justify-between gap-3" style={{ minHeight: '68px' }}>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0F172A] truncate">Ruta escolar activa</p>
            <p className="text-xs text-[#64748B] truncate">{boardedCount} escolares en viaje · {waitingCount} por recoger</p>
          </div>
          <button
            type="button"
            id="btn-abrir-finalizar"
            onClick={() => setShowCloseModal(true)}
            className="min-h-[44px] px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0F172A] hover:bg-[#1E293B] transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
          >
            Finalizar ruta
          </button>
        </footer>

        {/* ══════════════════════════════════════════════════════════════════
            MODO VIAJE / PANTALLA COMPLETA (Estilo Uber / Waze)
            ══════════════════════════════════════════════════════════════════ */}
        {isDriveMode && (
          <div className="fixed inset-0 z-[9999] bg-[#0F172A] flex flex-col overflow-hidden animate-fade-in">
            {/* Barra superior de navegación flotante con controles de conductor */}
            <header className="absolute top-0 left-0 right-0 z-[1001] px-3 sm:px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between gap-2.5 pointer-events-none">
              <button
                type="button"
                id="btn-salir-modo-viaje"
                onClick={() => setIsDriveMode(false)}
                className="h-10 px-3.5 sm:px-4 rounded-lg text-xs sm:text-sm font-bold text-[#92400E] bg-[#FFFBEB] hover:bg-[#FEF3C7] hover:text-[#78350F] border border-[#FDE68A] shadow-md flex items-center gap-2 cursor-pointer pointer-events-auto active:scale-95 transition-all"
                title="Volver a la vista regular"
              >
                <div className="w-5 h-5 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706] shrink-0">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </div>
                <span>Salir</span>
              </button>

              <div className="bg-[#0F172A]/90 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-lg border border-white/10 shadow-lg flex items-center gap-2 pointer-events-auto">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] font-bold text-[#E8A118] uppercase tracking-wider leading-none">Modo Conducción</p>
                  <p className="text-xs font-black text-white leading-none mt-1">GPS Satelital Activo</p>
                </div>
              </div>

              <button
                type="button"
                id="btn-centrar-furgon-viaje"
                onClick={() => {
                  setMapCenterPosition({ lat: currentBusLocation.lat, lng: currentBusLocation.lng, zoom: 16, time: Date.now() });
                  showToast('Cámara centrada en el furgón escolar.');
                }}
                className="h-10 px-3 sm:px-3.5 rounded-lg bg-gradient-to-r from-[#D97706] to-[#E8A118] hover:from-[#B45309] hover:to-[#D97706] text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer pointer-events-auto active:scale-95 transition-all"
                title="Centrar en el furgón"
              >
                <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm0-14a6 6 0 100 12 6 6 0 000-12z" />
                  </svg>
                </div>
                <span>Centrar</span>
              </button>
            </header>

            {/* Mapa en Pantalla Completa (100% alto) */}
            <div className="flex-1 w-full h-full relative">
              <RouteMap
                busPosition={currentBusLocation}
                showStops={true}
                centerPosition={mapCenterPosition}
                interactive={true}
                layerPosition="drive"
              />
            </div>

            {/* Panel Flotante Inferior (Estilo Uber/Waze Bottom Sheet) */}
            <div className="relative z-[1001] w-full bg-white/98 backdrop-blur-xl rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.25)] border-t border-[#CBD5E1] flex flex-col max-h-[48vh] overflow-hidden">
              {/* Barra indicadora superior */}
              <div className="w-12 h-1.5 bg-[#CBD5E1] rounded-full mx-auto my-2 shrink-0" />

              {/* Banner de Próxima Parada Destáacada */}
              <div className="px-4 sm:px-5 pb-3 border-b border-[#F1F5F9] shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded-md border border-[#FDE68A]">
                        PRÓXIMA PARADA
                      </span>
                      <span className="text-xs font-bold text-[#166534]">
                        {getDistanceKm(currentBusLocation.lat, currentBusLocation.lng, nextStop.lat, nextStop.lng)} km restáantes
                      </span>
                    </div>
                    <h3 className="var(--muted)ase sm:text-lg font-black text-[#0F172A] mt-1 truncate">
                      {nextStop.name}
                    </h3>
                    <p className="text-xs text-[#64748B] truncate">{nextStop.address}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCenterOnStop(nextStop)}
                      className="h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                      title="Centrar cámara en estáa parada"
                    >
                      <svg className="w-4 h-4 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span>Enfocar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkArrival(nextStop)}
                      className="h-10 px-3.5 sm:px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Llegada</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista Secuencial de la Ruta Completa (Parada 1, 2, 3... hasta Destáino) */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2 custom-scroll">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                  Secuencia completa de paradas ({optimalStops.length} puntos)
                </p>

                {optimalStops.map((stop, idx) => {
                  const isDone = completedStopIds.includes(stop.id);
                  const isCurrent = stop.id === nextStop.id && !isDone;
                  const dist = getDistanceKm(currentBusLocation.lat, currentBusLocation.lng, stop.lat, stop.lng);
                  const stopStudents = students.filter(s =>
                    s.stop?.toLowerCase().includes(stop.name.toLowerCase()) ||
                    stop.name.toLowerCase().includes(s.stop?.toLowerCase()) ||
                    s.stopId === stop.id
                  );

                  return (
                    <div
                      key={stop.id}
                      className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-[#FFFBEB] border-[#FDE68A] ring-2 ring-[#E8A118]/30 shadow-xs'
                          : isDone
                          ? 'bg-[#F0FDF4] border-[#BBF7D0] opacity-80'
                          : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                            isDone
                              ? 'bg-[#16A34A] text-white'
                              : isCurrent
                              ? 'bg-[#E8A118] text-white'
                              : 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]'
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs sm:text-sm font-bold text-[#0F172A] truncate">
                              {stop.name}
                            </p>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#E8A118] text-white shrink-0">
                                SIGUIENTE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] truncate">
                            {stop.type === 'school'
                              ? '🏫 Destáino final'
                              : stopStudents.length > 0
                              ? `${stopStudents.map(s => s.name.split(' ')[0]).join(', ')} (${stopStudents.length} alumnos)`
                              : stop.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-[#475569] bg-[#F1F5F9] px-2 py-1 rounded-lg border border-[#E2E8F0]">
                          {dist} km
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCenterOnStop(stop)}
                          className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] flex items-center justify-center text-[#D97706] shadow-2xs active:scale-95 cursor-pointer"
                          title="Enfocar en mapa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                        </button>
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() => handleMarkArrival(stop)}
                            className="h-8 px-2.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                          >
                            Llegada
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal: Finalizar recorrido con PIN de seguridad ─── */}
        {showCloseModal && (
          <div className="absolute inset-0 var(--amber)lack/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-lg overflow-hidden shadow-2xl animate-fade-in border border-[#E2E8F0]">
              <div className="px-6 pt-6 pb-4 border-b border-[#E2E8F0]">
                <h3 className="var(--muted)ase sm:text-lg font-bold text-[#0F172A]">Finalizar recorrido oficial</h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Al confirmar, se detendrá la transmisión GPS del furgón y se notificará a los apoderados del cierre de la ruta.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider">PIN de cierre</label>
                  <input
                    type="password"
                    id="input-codigo-cierre"
                    value={inputCloseCode}
                    onChange={(e) => { setInputCloseCode(e.target.value); setCloseError(''); }}
                    placeholder="••••"
                    maxLength={4}
                    className="w-full px-4 py-3.5 rounded-xl text-center font-mono font-bold var(--ink)xl tracking-widest text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#E8A118] focus:outline-none transition-all"
                  />
                  {closeError && <p className="text-xs font-semibold text-[#DC2626]">{closeError}</p>}
                  <p className="text-[11px] text-[#94A3B8] text-center font-medium">PIN de prueba: 1234</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowCloseModal(false); setInputCloseCode(''); setCloseError(''); }}
                    className="min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="btn-confirmar-cierre-recorrido"
                    onClick={handleConfirmFinish}
                    className="min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0F172A] hover:bg-[#1E293B] cursor-pointer transition-all shadow-xs"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
