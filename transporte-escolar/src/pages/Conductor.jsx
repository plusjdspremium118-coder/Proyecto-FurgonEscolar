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

// Paleta de colores sobrios por índice (sin emojis)
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
  const [filterStop, setFilterStop] = useState('todas');
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
    showToast(`Aviso de recogida enviado al apoderado de ${student.name}.`);
  }

  function handleNoticeEntrega(student) {
    sendDriverNotice(student.id, 'entrega_cerca');
    showToast(`Aviso de entrega enviado al apoderado de ${student.name}.`);
  }

  function handleSimulateNetworkDrop() {
    gpsService.triggerSimulatedNetworkLoss();
    showToast('Simulando pérdida de señal. Reconectando automáticamente...');
  }

  const boardedCount = students.filter((s) => s.status === 'a_bordo' || s.status === 'en_viaje').length;
  const deliveredCount = students.filter((s) => s.status === 'entregado' || s.status === 'recibido').length;
  const absentCount = students.filter((s) => !s.attending).length;
  const waitingCount = students.filter((s) => s.status === 'esperando' && s.attending).length;

  const filteredStudents = students.filter(
    (s) => filterStop === 'todas' || s.stop === filterStop
  );

  const currentBusLocation = currentGps || ROUTE_STOPS[0];
  const optimalStops = optimizeRouteStops(currentBusLocation, ROUTE_STOPS);

  const uniqueStops = [...new Set(students.map((s) => s.stop))];

  return (
    <div className="min-h-screen w-full flex justify-center bg-[#F1F5F9]">
      <div className="w-full max-w-[480px] h-[100dvh] sm:h-[840px] sm:max-h-[calc(100dvh-2rem)] sm:my-4 flex flex-col bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-[#E2E8F0] overflow-hidden relative">

        {/* ─── Toast ─── */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50">
            <div className="bg-[#0F172A] text-white px-5 py-4 rounded-xl shadow-xl flex items-center justify-between gap-3">
              <p className="text-xs text-[#CBD5E1] leading-relaxed">{toastMessage}</p>
              <button onClick={() => setToastMessage(null)} className="text-[#64748B] hover:text-white shrink-0 cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ─── Header ─── */}
        <header className="px-5 pt-4 pb-3.5 bg-white border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white select-none shrink-0" style={{ background: '#E8A118' }}>
              CP
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#64748B] leading-none truncate">Panel Conductor</p>
              <p className="text-sm font-bold text-[#0F172A] mt-0.5 truncate">Carlos Pérez</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-logout-conductor"
            onClick={() => navigate('/login')}
            className="h-8.5 px-3 rounded-xl text-xs font-semibold text-[#475569] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Salir</span>
          </button>
        </header>

        {/* ─── Main content ─── */}
        <main className="flex-1 overflow-y-auto custom-scroll">
          <div className="px-5 py-5 space-y-4">

            {/* ── Consola Principal del Conductor y Furgón ── */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-2xs">
              {/* Encabezado del vehículo */}
              <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3.5">
                <div>
                  <p className="text-xs font-bold text-[#64748B] tracking-wider uppercase">Furgón Asignado</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-base font-bold text-[#0F172A]">Los Robles</h2>
                    <span className="text-xs font-mono font-bold text-[#475569] bg-[#F1F5F9] border border-[#CBD5E1] px-2 py-0.5 rounded-md">
                      ABCD-12
                    </span>
                  </div>
                </div>
                {isRouteActive && (
                  <div className="shrink-0 text-right">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      gpsStatus.isConnected
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                        : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        gpsStatus.isConnected ? 'bg-[#22C55E] animate-pulse' : 'bg-[#F59E0B] animate-ping'
                      }`} />
                      {gpsStatus.isConnected ? 'GPS en vivo' : 'Reconectando'}
                    </span>
                  </div>
                )}
              </div>

              {/* Métricas clave */}
              <div className="grid grid-cols-4 gap-2 pt-3 pb-3.5">
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-1.5 py-2.5 text-center min-w-0">
                  <p className="text-[11px] sm:text-xs text-[#64748B] font-semibold truncate">Total</p>
                  <p className="text-lg sm:text-xl font-bold text-[#0F172A] mt-0.5">{students.length}</p>
                </div>
                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-1.5 py-2.5 text-center min-w-0">
                  <p className="text-[11px] sm:text-xs text-[#92400E] font-semibold truncate">Por recoger</p>
                  <p className="text-lg sm:text-xl font-bold text-[#92400E] mt-0.5">{waitingCount}</p>
                </div>
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-1.5 py-2.5 text-center min-w-0">
                  <p className="text-[11px] sm:text-xs text-[#1E40AF] font-semibold truncate">A bordo</p>
                  <p className="text-lg sm:text-xl font-bold text-[#1E40AF] mt-0.5">{boardedCount}</p>
                </div>
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-1.5 py-2.5 text-center min-w-0">
                  <p className="text-[11px] sm:text-xs text-[#166534] font-semibold truncate">Entregados</p>
                  <p className="text-lg sm:text-xl font-bold text-[#166534] mt-0.5">{deliveredCount}</p>
                </div>
              </div>

              {/* Botón de control de recorrido */}
              {!isRouteActive ? (
                <button
                  type="button"
                  id="btn-iniciar-recorrido"
                  onClick={handleStartRoute}
                  className="w-full min-h-[48px] py-3 rounded-xl bg-[#E8A118] hover:bg-[#D97706] text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Iniciar recorrido oficial</span>
                </button>
              ) : (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3 flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
                  <p className="text-xs font-semibold text-[#14532D]">
                    Recorrido activo · Transmitiendo coordenadas a los apoderados
                  </p>
                </div>
              )}
            </div>

            {/* Pestañas Principales (Escolares / Mapa) */}
            <div className="flex bg-[#E2E8F0]/70 p-1 rounded-xl">
              <button
                type="button"
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

            {/* ══ TAB: ESCOLARES ══ */}
            {activeTab === 'escolares' && (
              <div className="space-y-3">
                {/* Filtrar por parada */}
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-xs sm:text-sm font-semibold text-[#475569]">
                    Filtrar por parada
                  </span>

                  <div className="relative min-w-[170px] max-w-[220px]">
                    <select
                      value={filterStop}
                      onChange={(e) => setFilterStop(e.target.value)}
                      className="w-full h-9 text-xs sm:text-sm font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl pl-3 pr-8 appearance-none cursor-pointer outline-none shadow-2xs transition-colors truncate"
                    >
                      <option value="todas">Todas ({students.length})</option>
                      {uniqueStops.map((stop) => {
                        const count = students.filter(s => s.stop === stop).length;
                        return (
                          <option key={stop} value={stop}>{stop} ({count})</option>
                        );
                      })}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[#64748B]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Tarjetas de Escolares - Optimizadas, limpias y profesionales */}
                <div className="space-y-3">
                  {filteredStudents.length === 0 ? (
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl py-10 px-4 text-center">
                      <p className="text-sm font-semibold text-[#64748B]">No hay alumnos en esta parada.</p>
                      <button
                        type="button"
                        onClick={() => setFilterStop('todas')}
                        className="mt-2 text-xs sm:text-sm font-bold text-[#E8A118] underline underline-offset-2 cursor-pointer"
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
                          className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs transition-all hover:border-[#94A3B8]"
                        >
                          {/* Cabecera Principal del Alumno */}
                          <div className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-2xs"
                                style={{ background: isAbsent ? '#94A3B8' : avatarColor }}
                              >
                                {getInitials(student.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="text-base font-bold text-[#0F172A] truncate">
                                    {student.name}
                                  </h3>
                                  {student.id === 'martin' && (
                                    <span className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-md">
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
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                              <span>{statusBadge.label}</span>
                            </span>
                          </div>

                          {/* Sección de Contexto de Viaje y Datos Relevantes */}
                          <div className="px-4 pb-4 pt-1 space-y-3">
                            {isAbsent ? (
                              <div className="px-3.5 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2.5">
                                <svg className="w-5 h-5 text-[#EF4444] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                  <p className="text-xs sm:text-sm font-bold text-[#991B1B]">Ausencia confirmada por apoderado</p>
                                  <p className="text-xs text-[#B91C1C] mt-0.5">Omitir parada en {student.stop}.</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Información resumida de horario / PIN */}
                                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 flex items-center justify-between gap-2 flex-wrap text-xs">
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
                                    <div className="inline-flex items-center gap-1.5 bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-lg shrink-0">
                                      <span className="text-xs font-semibold text-[#92400E]">PIN Retiro:</span>
                                      <span className="font-mono font-bold text-xs text-[#78350F]">{activePickupCode}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Botones de Acción para el Conductor (Espaciosos, accesibles, min 48px) */}
                                {(isWaiting || (!isBoarded && !isDropped && !isConfirmed)) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    <button
                                      type="button"
                                      id={`btn-avisar-recogida-${student.id}`}
                                      onClick={() => handleNoticeRecogida(student)}
                                      className={`min-h-[48px] rounded-xl text-xs sm:text-sm font-semibold px-4 py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                        student.lastNotice?.type === 'recogida_cerca'
                                          ? 'bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]'
                                          : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]'
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
                                    <button
                                      type="button"
                                      id={`btn-subir-${student.id}`}
                                      onClick={() => handleBoarding(student)}
                                      className="min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white px-4 py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#E8A118] hover:bg-[#D97706] shadow-2xs"
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
                                    <button
                                      type="button"
                                      id={`btn-avisar-entrega-${student.id}`}
                                      onClick={() => handleNoticeEntrega(student)}
                                      className={`min-h-[48px] rounded-xl text-xs sm:text-sm font-semibold px-4 py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                        student.lastNotice?.type === 'entrega_cerca'
                                          ? 'bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]'
                                          : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]'
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
                                          <svg className="w-4 h-4 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                          </svg>
                                          <span className="truncate">Avisar entrega</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      id={`btn-bajar-${student.id}`}
                                      onClick={() => handleDropoff(student)}
                                      className="min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                                    >
                                      <svg className="w-4 h-4 text-[#4ADE80] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* ══ TAB: MAPA ══ */}
            {activeTab === 'mapa' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Navegación GPS</p>
                    <h3 className="text-base font-bold text-[#0F172A] mt-0.5">Ruta optimizada</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
                    {ROUTE_STOPS.length} paradas
                  </span>
                </div>

                <div className="w-full h-[340px] rounded-2xl overflow-hidden border border-[#CBD5E1] shadow-2xs">
                  <RouteMap busPosition={currentBusLocation} showStops={true} interactive={true} />
                </div>

                <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                  <div className="px-5 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                    <p className="text-xs font-bold text-[#475569] uppercase tracking-wider">Orden sugerido de paradas</p>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {optimalStops.map((stop, idx) => (
                      <div key={stop.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors">
                        <span className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs" style={{ background: '#E8A118' }}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#0F172A] truncate">{stop.name}</p>
                          <p className="text-xs text-[#64748B] truncate mt-0.5">{stop.address}</p>
                        </div>
                        <span className="text-xs font-bold text-[#334155] bg-[#F1F5F9] px-2.5 py-1 rounded-lg shrink-0">
                          {getDistanceKm(currentBusLocation.lat, currentBusLocation.lng, stop.lat, stop.lng)} km
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ─── Footer: Finalizar recorrido ─── */}
        <footer className="shrink-0 px-5 py-4 bg-white border-t border-[#E2E8F0] flex items-center justify-between gap-3" style={{ minHeight: '72px' }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0F172A] truncate">Ruta escolar</p>
            <p className="text-xs text-[#64748B] truncate">{boardedCount} escolares actualmente en viaje</p>
          </div>
          <button
            type="button"
            id="btn-abrir-finalizar"
            onClick={() => setShowCloseModal(true)}
            className="min-h-[48px] px-5 rounded-xl text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] transition-all cursor-pointer shrink-0"
          >
            Finalizar recorrido
          </button>
        </footer>

        {/* ─── Modal: Finalizar recorrido ─── */}
        {showCloseModal && (
          <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 pt-6 pb-5 border-b border-[#E2E8F0]">
                <h3 className="text-base font-bold text-[#0F172A]">Finalizar recorrido</h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Al confirmar, se detendrá la transmisión GPS y el sensor quedará inactivo hasta el próximo recorrido.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#334155]">PIN de cierre</label>
                  <input
                    type="password"
                    id="input-codigo-cierre"
                    value={inputCloseCode}
                    onChange={(e) => { setInputCloseCode(e.target.value); setCloseError(''); }}
                    placeholder="••••"
                    className="w-full px-4 py-3.5 rounded-xl text-center font-mono font-bold text-2xl tracking-widest text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#E8A118] focus:outline-none transition-all"
                  />
                  {closeError && <p className="text-xs text-[#DC2626]">{closeError}</p>}
                  <p className="text-[11px] text-[#94A3B8] text-center">PIN de prueba: 1234</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowCloseModal(false); setInputCloseCode(''); setCloseError(''); }}
                    className="min-h-[48px] rounded-xl text-sm font-semibold text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="btn-confirmar-cierre-recorrido"
                    onClick={handleConfirmFinish}
                    className="min-h-[48px] rounded-xl text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] cursor-pointer transition-all"
                  >
                    Confirmar y cerrar
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
