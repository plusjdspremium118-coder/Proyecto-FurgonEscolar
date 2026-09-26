import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RouteMap from '../components/RouteMap';
import { useTransportState } from '../data/useTransportState';
import { ROUTE_STOPS } from '../data/routeData';
import { gpsService } from '../services/gpsWebSocketService';

// Genera iniciales a partir del nombre completo
function getInitials(name = '') {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function Apoderado() {
  const navigate = useNavigate();
  const {
    students,
    currentUser,
    notifications,
    receivers,
    activeReceiver,
    activePickupCode,
    isRouteActive,
    lastAlert,
    toggleAttendance,
    changeAuthorizedReceiver,
    generateNewPickupCode,
    confirmChildReceived,
    undoChildReceived,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    clearLastAlert,
  } = useTransportState();

  const [activeTab, setActiveTab] = useState('inicio');
  const [showReceiverModal, setShowReceiverModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [currentGps, setCurrentGps] = useState(null);

  // Escolar asignado a esta sesión de apoderado
  const martin = students.find((s) => s.id === 'martin') || students[0];
  const isAttending = martin ? martin.attending : true;
  const childStatus = martin ? martin.status : 'a_bordo';
  const isReceived = childStatus === 'recibido';

  // Datos dinámicos del apoderado y del alumno
  const currentParentName = currentUser?.nombre || activeReceiver || 'Sofía Reyes';
  const currentParentEmail = currentUser?.email || 'sofia.reyes@email.cl';
  const parentInitials = getInitials(currentParentName);

  const studentFullName = martin?.name || 'Martín Reyes';
  const studentFirstName = studentFullName.split(' ')[0] || 'Martín';
  const studentInitials = getInitials(studentFullName) || 'MR';
  const studentAssignedStop = martin?.stop || martin?.address || 'Av. Providencia 1345';
  const studentGrade = martin?.grade || '4° Básico';

  // Filtrado estricto: el apoderado solo ve avisos dirigidos a su pupilo o generales de la ruta
  const studentNotifications = notifications.filter(
    (n) => !n.studentId || n.studentId === martin?.id
  );
  const unreadCount = studentNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    const unsubscribe = gpsService.subscribe((pos) => setCurrentGps(pos));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (lastAlert) {
      if (lastAlert.studentId && lastAlert.studentId !== martin?.id) {
        return;
      }
      setToastMessage(lastAlert);
      const timer = setTimeout(() => {
        setToastMessage(null);
        clearLastAlert();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastAlert, clearLastAlert, martin?.id]);

  function handleAttendanceToggle(val) {
    toggleAttendance('martin', val);
    showToast(val ? 'Asistencia confirmada para hoy.' : 'Ausencia notificada al conductor.');
  }

  function handleConfirmReceived() {
    confirmChildReceived('martin', activeReceiver);
    showToast(`Recepción de ${studentFirstName} confirmada. Conductor notificado.`);
  }

  function handleUndoReceived() {
    undoChildReceived('martin');
    showToast('Recepción restablecida.');
  }

  function showToast(msg) {
    setToastMessage({ title: 'RutaSegura', message: msg });
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LÓGICA DINÁMICA DE LA TARJETA HERO (Elimina contradicciones de estado)
  // ══════════════════════════════════════════════════════════════════════════
  function getHeroData() {
    if (!isRouteActive) {
      return {
        title: 'Servicio en espera',
        subtitle: 'El conductor aún no inicia el recorrido escolar oficial de hoy.',
        badge: 'En espera',
        badgeClass: 'bg-white/20 text-white border-white/20',
        gradientClass: 'from-[#475569] via-[#334155] to-[#1E293B]',
        etaTitle: 'Horario programado',
        etaTime: '7:45 AM',
        etaLocation: studentAssignedStop,
        progressPct: 0,
        labelStart: 'Inicio',
        labelMid: 'En ruta',
        labelEnd: 'Tu parada',
        busPosition: '0%',
      };
    }

    if (!isAttending) {
      return {
        title: 'Ausencia notificada',
        subtitle: `${studentFirstName} tiene inasistencia confirmada hoy. El conductor omitirá tu parada.`,
        badge: 'No asiste hoy',
        badgeClass: 'bg-red-900/40 text-white border-red-300/30',
        gradientClass: 'from-[#DC2626] via-[#B91C1C] to-[#991B1B]',
        etaTitle: 'Estado de recogida',
        etaTime: 'Omitida',
        etaLocation: studentAssignedStop,
        progressPct: 0,
        labelStart: 'Colegio',
        labelMid: 'Parada omitida',
        labelEnd: 'Destino',
        busPosition: '0%',
      };
    }

    if (childStatus === 'recibido') {
      return {
        title: '¡Entrega confirmada!',
        subtitle: `Recepción completada por ${martin?.receivedConfirmation?.receiver || activeReceiver}.`,
        badge: 'Recibido',
        badgeClass: 'bg-emerald-900/40 text-white border-emerald-300/40',
        gradientClass: 'from-[#16A34A] via-[#15803D] to-[#14532D]',
        etaTitle: 'Hora de recepción',
        etaTime: martin?.receivedConfirmation?.time || martin?.deliveredAt || 'Completado',
        etaLocation: studentAssignedStop,
        progressPct: 100,
        labelStart: 'Colegio',
        labelMid: 'En camino',
        labelEnd: 'Entregado',
        busPosition: '95%',
      };
    }

    if (childStatus === 'entregado') {
      return {
        title: `¡${studentFirstName} llegó a destino!`,
        subtitle: `Descendió del transporte escolar. Por favor confirma la recepción abajo.`,
        badge: 'Descendió del furgón',
        badgeClass: 'bg-emerald-900/40 text-white border-emerald-300/40',
        gradientClass: 'from-[#16A34A] via-[#15803D] to-[#166534]',
        etaTitle: 'Hora de bajada',
        etaTime: martin?.deliveredAt || '8:24 AM',
        etaLocation: studentAssignedStop,
        progressPct: 100,
        labelStart: 'Colegio',
        labelMid: 'En camino',
        labelEnd: 'En tu parada',
        busPosition: '95%',
      };
    }

    if (childStatus === 'a_bordo' || childStatus === 'en_viaje') {
      return {
        title: `${studentFirstName} está a bordo del furgón`,
        subtitle: `En trayecto hacia el colegio · Conductor: Carlos Pérez (Furgón Los Robles)`,
        badge: 'A bordo · En viaje',
        badgeClass: 'bg-white/20 text-white border-white/25',
        gradientClass: 'from-[#2563EB] via-[#1D4ED8] to-[#1E40AF]',
        etaTitle: 'Llegada estimada a destino',
        etaTime: '8:24 AM (6 min)',
        etaLocation: 'Colegio Los Andes',
        progressPct: 68,
        labelStart: 'Tu parada',
        labelMid: 'En tránsito',
        labelEnd: 'Colegio',
        busPosition: '65%',
      };
    }

    // childStatus === 'esperando'
    return {
      title: 'En camino a tu parada',
      subtitle: `El furgón va en ruta a recoger a ${studentFirstName} · Conductor: Carlos Pérez`,
      badge: 'En camino a recoger',
      badgeClass: 'bg-white/20 text-white border-white/20',
      gradientClass: 'from-[#E8A118] via-[#DF9510] to-[#C97A00]',
      etaTitle: 'Llegada estimada a tu parada',
      etaTime: '7:45 AM (4 min)',
      etaLocation: studentAssignedStop,
      progressPct: 35,
      labelStart: 'Colegio',
      labelMid: 'Tu parada',
      labelEnd: 'Destino',
      busPosition: '32%',
    };
  }

  const hero = getHeroData();

  function getStatusInfo() {
    if (!isAttending) return {
      label: 'No asiste hoy',
      color: '#991B1B', bg: '#FEF2F2', border: '#FECACA',
      desc: 'Ausencia notificada. El conductor omitirá esta parada.',
    };
    switch (childStatus) {
      case 'a_bordo': case 'en_viaje': return {
        label: 'A bordo',
        color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
        desc: 'En viaje escolar hacia el colegio.',
      };
      case 'esperando': return {
        label: 'Esperando',
        color: '#92400E', bg: '#FFFBEB', border: '#FDE68A',
        desc: 'El furgón está en camino a la parada o domicilio.',
      };
      case 'entregado': return {
        label: 'Entregado en parada',
        color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0',
        desc: 'Descendió del transporte escolar.',
      };
      case 'recibido': return {
        label: 'Recepción confirmada',
        color: '#14532D', bg: '#F0FDF4', border: '#86EFAC',
        desc: `Entregado a ${martin?.receivedConfirmation?.receiver || activeReceiver}.`,
      };
      default: return { label: 'En ruta', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', desc: 'En viaje escolar.' };
    }
  }

  const statusInfo = getStatusInfo();
  const busLocation = currentGps || ROUTE_STOPS[1];

  const tabs = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: (active) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.3 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'mapa',
      label: 'Mapa',
      icon: (active) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.3 : 1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.3 : 1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'notificaciones',
      label: 'Avisos',
      icon: (active) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.3 : 1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: (active) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.3 : 1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F1F5F9] flex flex-col justify-center items-center py-0 sm:py-4 px-0 sm:px-4">
      {/* Contenedor central responsivo con respiro visual y sin colapsos */}
      <div className="w-full max-w-2xl bg-white sm:rounded-3xl sm:shadow-lg sm:border sm:border-[#CBD5E1] flex flex-col h-[100dvh] sm:h-[calc(100dvh-2rem)] overflow-hidden relative">

        {/* ─── Alertas Toast flotantes ─── */}
        {toastMessage && (
          <div className="fixed sm:absolute top-5 left-4 right-4 z-50 flex justify-center pointer-events-none">
            <div className="bg-[#0F172A] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3.5 max-w-md w-full border border-white/10 pointer-events-auto animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-[#E8A118] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#E8A118] uppercase tracking-wider">{toastMessage.title}</p>
                <p className="text-xs sm:text-sm text-[#F1F5F9] mt-0.5 leading-relaxed break-words">{toastMessage.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-[#94A3B8] hover:text-white p-1 rounded-lg shrink-0 cursor-pointer transition-colors"
                title="Cerrar aviso"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ─── Encabezado Principal ─── */}
        <header className="px-5 sm:px-6 py-4 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white select-none shrink-0 shadow-sm bg-gradient-to-tr from-[#D97706] to-[#F59E0B]">
              {parentInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[#64748B] leading-none">RutaSegura</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span>En servicio</span>
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold text-[#0F172A] mt-0.5 break-words line-clamp-1">
                {currentParentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Botón Centro de Avisos (Estilo coherente RutaSegura) */}
            <button
              type="button"
              id="btn-notifications-apoderado"
              onClick={() => setActiveTab('notificaciones')}
              className={`relative h-10 w-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
                activeTab === 'notificaciones'
                  ? 'bg-[#E8A118] text-white shadow-amber-500/25 ring-2 ring-[#E8A118]/30'
                  : 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] hover:bg-[#FEF3C7] hover:border-[#FCD34D]'
              }`}
              title="Ver notificaciones y avisos"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-black text-white ring-2 ring-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Botón Salir / Logout (Estilo coherente RutaSegura) */}
            <button
              type="button"
              id="btn-header-logout-apoderado"
              onClick={() => navigate('/login')}
              className="h-10 px-3.5 sm:px-4 rounded-2xl text-xs font-bold text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] hover:bg-[#FEF3C7] hover:text-[#78350F] hover:border-[#FCD34D] transition-all cursor-pointer flex items-center gap-2 shadow-xs shrink-0 whitespace-nowrap active:scale-95"
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

        {/* ─── Contenedor de Vistas (Con scroll natural y separación visual) ─── */}
        <main className="flex-1 px-4 sm:px-6 py-5 overflow-y-auto">

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: INICIO (Panel Principal del Apoderado)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'inicio' && (
            <div className="flex flex-col gap-5 sm:gap-6 pb-4 pt-1">

              {/* 1. TARJETA HERO DINÁMICA: Sincronizada 100% con el estado real */}
              <div className={`rounded-3xl shadow-md p-6 sm:p-7 text-white bg-gradient-to-br ${hero.gradientClass} transition-all`}>
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <span className="text-xs font-extrabold text-white/90 uppercase tracking-widest leading-normal">
                    Seguimiento en vivo
                  </span>
                  <span className={`px-3.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${hero.badgeClass} shrink-0 shadow-xs leading-normal`}>
                    {hero.badge}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight break-words leading-snug my-1.5">
                  {hero.title}
                </h2>
                <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed break-words mb-4">
                  {hero.subtitle}
                </p>

                {/* Sub-tarjeta de horario, parada y barra de progreso */}
                <div className="bg-black/20 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-end justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-white/80 uppercase tracking-wider leading-normal">{hero.etaTitle}</p>
                      <p className="text-sm sm:text-base font-bold text-white mt-0.5 break-words leading-snug">{hero.etaLocation}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-normal">{hero.etaTime}</p>
                    </div>
                  </div>

                  {/* Barra de progreso interactiva con furgón */}
                  <div className="pt-2 pb-1">
                    <div className="relative flex items-center mb-3.5">
                      <div className="w-full h-2.5 bg-white/25 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-700 shadow-sm"
                          style={{ width: `${hero.progressPct}%` }}
                        />
                      </div>
                      <div
                        className="absolute -top-2.5 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[#D97706] text-xs font-bold ring-2 ring-white/50 transition-all duration-700 z-10"
                        style={{ left: `calc(${hero.busPosition} - 14px)` }}
                      >
                        <svg className="w-4 h-4 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-9 5h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v9a2 2 0 002 2zm1 0v2m8-2v2" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-white/90 gap-2 pt-1 pb-1">
                      <span className="truncate">{hero.labelStart}</span>
                      <span className="font-bold text-white truncate text-center">{hero.labelMid}</span>
                      <span className="truncate text-right">{hero.labelEnd}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. ACCESO DIRECTO A MAPA GPS */}
              <div
                onClick={() => setActiveTab('mapa')}
                className="bg-white border border-[#CBD5E1] rounded-2xl p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:border-[#94A3B8] hover:shadow-xs transition-all shadow-2xs group gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <svg className="w-5 h-5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm sm:text-base font-bold text-[#0F172A]">Ubicación del Furgón</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                        GPS En Vivo
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5 break-words">Seguimiento en vivo y paradas en tiempo real</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#D97706] group-hover:translate-x-1 transition-transform shrink-0">
                  <span className="hidden sm:inline">Ver mapa</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* 3. SECCIÓN: CONTROL DE ASISTENCIA DIARIA */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#E8A118]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Control de asistencia diaria</p>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#0F172A] mt-1 break-words">
                    ¿{studentFirstName} asistirá hoy al colegio?
                  </h3>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      id="btn-asiste-si"
                      onClick={() => handleAttendanceToggle(true)}
                      className={`min-h-[52px] rounded-xl text-sm font-bold border-2 transition-all cursor-pointer flex items-center justify-center gap-2.5 px-4 py-3 ${
                        isAttending
                          ? 'bg-[#FFFBEB] border-[#D97706] text-[#92400E] shadow-2xs ring-2 ring-[#FDE68A]/50'
                          : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                      }`}
                    >
                      <svg className={`w-4 h-4 shrink-0 ${isAttending ? 'text-[#D97706]' : 'text-[#94A3B8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Sí, asistirá hoy</span>
                    </button>

                    <button
                      type="button"
                      id="btn-asiste-no"
                      onClick={() => handleAttendanceToggle(false)}
                      className={`min-h-[52px] rounded-xl text-sm font-bold border-2 transition-all cursor-pointer flex items-center justify-center gap-2.5 px-4 py-3 ${
                        !isAttending
                          ? 'bg-[#FEF2F2] border-[#EF4444] text-[#991B1B] shadow-2xs ring-2 ring-[#FECACA]/50'
                          : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                      }`}
                    >
                      <svg className={`w-4 h-4 shrink-0 ${!isAttending ? 'text-[#EF4444]' : 'text-[#94A3B8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>No asistirá hoy</span>
                    </button>
                  </div>

                  <div className="px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-2.5 text-xs text-[#475569] leading-relaxed">
                    <svg className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {isAttending
                        ? `El furgón pasará a recoger a ${studentFirstName} a las 7:45 AM en ${studentAssignedStop}.`
                        : 'Ausencia confirmada. El conductor omitirá tu parada en la ruta optimizada de hoy.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. SECCIÓN: ESTADO DEL ESCOLAR Y CONFIRMACIÓN DE ENTREGA */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[#F1F5F9] flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] flex items-center justify-center text-white font-bold text-sm select-none shrink-0 shadow-xs">
                      {studentInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Estado del escolar</p>
                      <h3 className="text-base sm:text-lg font-bold text-[#0F172A] mt-0.5 break-words">
                        {studentFullName}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">{studentGrade} · Furgón Los Robles</p>
                    </div>
                  </div>

                  <span
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold border shrink-0 whitespace-nowrap shadow-2xs"
                    style={{ background: statusInfo.bg, color: statusInfo.color, borderColor: statusInfo.border }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Resumen de actividad del viaje */}
                  <div className="flex items-center justify-between text-xs sm:text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 gap-3 flex-wrap">
                    <span className="text-[#475569] font-medium">{statusInfo.desc}</span>
                    {martin?.boardedAt && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-1 rounded-lg shrink-0">
                        <svg className="w-3.5 h-3.5 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Subida: {martin.boardedAt}</span>
                      </span>
                    )}
                  </div>

                  {/* Estado: Esperando recogida */}
                  {childStatus === 'esperando' && (
                    <div className="px-4 py-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-3 text-xs sm:text-sm text-[#92400E]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shrink-0 animate-pulse" />
                      <span>Esperando recogida · Recibirás un aviso en tu teléfono cuando el furgón esté a 500 metros.</span>
                    </div>
                  )}

                  {/* Estado: A bordo del furgón */}
                  {(childStatus === 'a_bordo' || childStatus === 'en_viaje') && (
                    <div className="px-4 py-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-[#1E40AF]">
                          {studentFirstName} está a bordo y seguro en el transporte
                        </p>
                        <p className="text-xs text-[#3B82F6] mt-0.5 leading-relaxed">
                          Podrás confirmar la recepción apenas el furgón llegue a tu parada o domicilio.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Estado: Entregado / Descendió -> Botón Prominente de Confirmación */}
                  {childStatus === 'entregado' && (
                    <div className="space-y-3 pt-1">
                      <div className="px-4 py-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping shrink-0" />
                        <p className="text-xs sm:text-sm font-bold text-[#14532D]">
                          ¡El transporte escolar llegó! {studentFirstName} descendió a las {martin?.deliveredAt || 'recientemente'}.
                        </p>
                      </div>
                      <button
                        type="button"
                        id="btn-confirmar-recibido"
                        onClick={handleConfirmReceived}
                        className="w-full min-h-[52px] rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] cursor-pointer transition-all shadow-md flex items-center justify-center gap-2.5 active:scale-[0.99]"
                      >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Confirmar que recibí a {studentFirstName}</span>
                      </button>
                    </div>
                  )}

                  {/* Estado: Recepción confirmada */}
                  {isReceived && (
                    <div className="px-4 py-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#22C55E] flex items-center justify-center text-white shrink-0 shadow-2xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#14532D] break-words">
                            Recepción confirmada por {martin?.receivedConfirmation?.receiver || activeReceiver}
                          </p>
                          <p className="text-xs text-[#16A34A] mt-0.5">
                            Hora registrada: {martin?.receivedConfirmation?.time || martin?.deliveredAt || '—'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleUndoReceived}
                        className="text-xs font-bold text-[#16A34A] hover:text-[#15803D] underline underline-offset-2 cursor-pointer shrink-0"
                      >
                        Deshacer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. SECCIÓN: RETIRO SEGURO Y CÓDIGO ÚNICO (PIN) */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[#F1F5F9] flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#D97706] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Seguridad y autorización</p>
                      <h3 className="text-base sm:text-lg font-bold text-[#0F172A] mt-0.5">Retiro presencial del escolar</h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-cambiar-apoderado"
                    onClick={() => setShowReceiverModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Cambiar receptor</span>
                  </button>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Receptor actual autorizado */}
                  <div className="flex items-center justify-between text-xs sm:text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 gap-2 flex-wrap">
                    <span className="text-[#64748B]">Receptor autorizado para hoy:</span>
                    <span className="font-bold text-[#0F172A] break-words">{activeReceiver}</span>
                  </div>

                  {/* Caja de Código PIN */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FFFBEB] border border-[#FDE68A] shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-[#D97706] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <p className="text-xs font-bold text-[#92400E] uppercase tracking-wider">Código de entrega al conductor</p>
                      </div>
                      <button
                        type="button"
                        id="btn-renovar-codigo"
                        onClick={() => {
                          generateNewPickupCode();
                          showToast('Nuevo código PIN generado con éxito.');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#92400E] bg-white border border-[#FDE68A] hover:bg-[#FEF3C7] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        title="Generar nuevo código aleatorio"
                      >
                        <svg className="w-3.5 h-3.5 text-[#A16207] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Renovar PIN</span>
                      </button>
                    </div>

                    <p className="text-xs text-[#92400E] leading-relaxed">
                      Muestra este código de 4 dígitos al conductor al momento de retirar al escolar en la parada o domicilio:
                    </p>

                    <div className="flex items-center justify-center pt-1">
                      <span className="font-mono font-black text-3xl sm:text-4xl tracking-[0.25em] text-[#92400E] bg-white px-6 py-2.5 rounded-2xl border-2 border-[#FDE68A] shadow-xs select-all text-center">
                        {activePickupCode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: MAPA (Seguimiento GPS en vivo)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'mapa' && (
            <div className="flex flex-col gap-5 sm:gap-6 pb-6">
              {/* Encabezado de la vista de mapa */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#D97706] uppercase tracking-wider">
                      Geolocalización en Vivo
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                      GPS Activo
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-[#1E293B] mt-0.5 tracking-tight">
                    Ubicación del furgón en tiempo real
                  </h2>
                </div>
                {/* Badge destacado tipo pill con estimación de llegada */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] shadow-2xs">
                  <svg className="w-4 h-4 text-[#D97706] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-black">{hero.etaTime}</span>
                </div>
              </div>

              {/* Contenedor moderno del mapa Leaflet con bordes suaves y sombra sutil */}
              <div className="relative w-full h-[360px] sm:h-[420px] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E2E8F0] shadow-[0_4px_20px_rgba(0,0,0,0.08)] bg-[#F8FAFC]">
                {/* Overlay flotante superior con estado del recorrido */}
                <div className="absolute top-3 left-3 right-3 z-400 flex items-center justify-between gap-2 pointer-events-none">
                  <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-[#E2E8F0] flex items-center gap-2.5 max-w-[85%] pointer-events-auto">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping shrink-0" />
                    <p className="text-xs font-bold text-[#1E293B] truncate">
                      {isRouteActive ? 'Furgón en trayecto hacia el colegio' : 'Servicio en espera de inicio'}
                    </p>
                  </div>
                  <div className="bg-white/95 backdrop-blur-md px-2.5 py-2 rounded-2xl shadow-md border border-[#E2E8F0] flex items-center gap-1.5 text-[11px] font-bold text-[#D97706] shrink-0 pointer-events-auto">
                    <span>★ Parada asignada</span>
                  </div>
                </div>

                <RouteMap
                  busPosition={busLocation}
                  showStops={true}
                  highlightStopName={studentAssignedStop}
                  interactive={true}
                />
              </div>

              {/* Tarjetas de Información del Servicio (Panel inferior estructurado) */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Información del Servicio
                  </h3>
                  <span className="text-xs text-[#94A3B8] font-medium">Actualizado en vivo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Card 1: Parada del estudiante */}
                  <div className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <svg className="w-5 h-5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#64748B]">Parada del estudiante</p>
                      <p className="text-sm font-bold text-[#1E293B] mt-0.5 break-words leading-snug">
                        {studentAssignedStop}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-full mt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                        Punto de recogida oficial
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Estimación de llegada (Destacada con badge tipo pill) */}
                  <div className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <svg className="w-5 h-5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#64748B]">Estimación de llegada</p>
                      <div className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-[#E8A118] animate-pulse shrink-0" />
                        <span className="text-xs sm:text-sm font-black tracking-tight">{hero.etaTime}</span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-2">
                        {isRouteActive ? 'Calculado según tránsito en vivo' : 'Horario programado del servicio'}
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Conductor asignado */}
                  <div className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <svg className="w-5 h-5 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#64748B]">Conductor asignado</p>
                      <p className="text-sm font-bold text-[#1E293B] mt-0.5 break-words">
                        Carlos Pérez
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-full mt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                        Licencia A1 · Conductor oficial
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Furgón escolar */}
                  <div className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <svg className="w-5 h-5 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-9 5h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v9a2 2 0 002 2zm1 0v2m8-2v2" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#64748B]">Furgón escolar</p>
                      <p className="text-sm font-bold text-[#1E293B] mt-0.5 break-words">
                        Furgón Los Robles
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-block text-[10px] font-mono font-black text-[#1E293B] bg-[#F1F5F9] border border-[#CBD5E1] px-2 py-0.5 rounded-md tracking-wider shadow-2xs">
                          ABCD-12
                        </span>
                        <span className="text-[10px] font-semibold text-[#166534] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#BBF7D0]">
                          18 Pasajeros
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner de seguridad y contacto rápido */}
                <div className="mt-1 bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0 shadow-xs">
                      <svg className="w-4 h-4 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#92400E]">Transporte escolar verificado</p>
                      <p className="text-[11px] text-[#B45309] truncate">Revisión técnica vigente · Monitoreo GPS en tiempo real</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('Canal prioritario con conductor Carlos Pérez activado')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#D97706] to-[#E8A118] hover:from-[#B45309] hover:to-[#D97706] transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
                  >
                    Aviso
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: AVISOS (Centro de Notificaciones)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'notificaciones' && (
            <div className="flex flex-col gap-5 sm:gap-6 pb-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Centro de notificaciones</p>
                  <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] mt-0.5">
                    Avisos de {studentFirstName} ({studentNotifications.length})
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      id="btn-mark-all-read"
                      onClick={() => markAllNotificationsRead()}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Marcar todas como leídas"
                    >
                      <svg className="w-3.5 h-3.5 text-[#22C55E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Leídas</span>
                    </button>
                  )}
                  {studentNotifications.length > 0 && (
                    <button
                      type="button"
                      id="btn-clear-all-notifs"
                      onClick={() => {
                        clearAllNotifications(martin?.id);
                        showToast(`Avisos de ${studentFirstName} eliminados.`);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Borrar todas las notificaciones"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Borrar</span>
                    </button>
                  )}
                </div>
              </div>

              {studentNotifications.length === 0 ? (
                <div className="py-12 bg-white border border-[#E2E8F0] rounded-2xl text-center px-6 space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center mx-auto text-[#16A34A]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">Bandeja al día</h3>
                  <p className="text-xs sm:text-sm text-[#64748B] max-w-sm mx-auto leading-relaxed">
                    No tienes alertas pendientes para {studentFirstName}. Aquí verás los avisos de llegada, confirmación de subida y código de retiro.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        notif.read ? 'bg-white border-[#E2E8F0]' : 'bg-[#FFFBEB] border-[#FDE68A] shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {!notif.read && <span className="w-2.5 h-2.5 rounded-full bg-[#E8A118] shrink-0" />}
                          <p className="text-sm sm:text-base font-bold text-[#0F172A] leading-snug break-words">
                            {notif.title?.replace(/^[\u{1F000}-\u{1FFFF}]|^[^\w\s]/u, '').trim()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold text-[#94A3B8]">{notif.time}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                            title="Eliminar este aviso"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-[#475569] leading-relaxed break-words">{notif.message}</p>
                      {!notif.read && (
                        <span className="inline-block mt-3 text-[10px] font-bold text-[#92400E] bg-[#FDE68A]/70 px-2.5 py-0.5 rounded-md">
                          Nuevo aviso
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: PERFIL (Detalles del Apoderado y Servicio Escolar)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'perfil' && (
            <div className="flex flex-col gap-5 sm:gap-6 pb-4">
              {/* Tarjeta de Usuario */}
              <div className="bg-white border border-[#CBD5E1] rounded-3xl p-6 shadow-2xs text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7] to-[#FFFBEB] border-b border-[#FDE68A]/60" />
                <div className="relative pt-4 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center font-black text-2xl text-white select-none shadow-md shadow-amber-500/20 bg-gradient-to-tr from-[#D97706] to-[#F59E0B] ring-4 ring-white">
                    {parentInitials}
                  </div>
                  <h2 className="text-xl font-black text-[#0F172A] mt-3 break-words">{currentParentName}</h2>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] mt-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-[#E8A118]" />
                    <span>Apoderado Titular</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-y-1.5 gap-x-4 text-xs sm:text-sm text-[#64748B] mt-4">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-[#94A3B8] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="break-all">{currentParentEmail}</span>
                    </span>
                    <span className="hidden sm:inline text-[#CBD5E1]">·</span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-[#94A3B8] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>+56 9 8765 4321</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Información del Servicio Escolar */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Detalles del servicio asignado
                  </p>
                </div>
                <div className="divide-y divide-[#F1F5F9]">
                  {/* Estudiante */}
                  <div className="flex items-center justify-between p-4 sm:p-5 hover:bg-[#F8FAFC]/60 transition-colors gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#64748B]">Estudiante</p>
                        <p className="text-sm sm:text-base font-bold text-[#0F172A] break-words">{studentFullName}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1 rounded-lg shrink-0">
                      {studentGrade}
                    </span>
                  </div>

                  {/* Furgón */}
                  <div className="flex items-center justify-between p-4 sm:p-5 hover:bg-[#F8FAFC]/60 transition-colors gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-9 5h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v9a2 2 0 002 2zm1 0v2m8-2v2" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#64748B]">Furgón escolar</p>
                        <p className="text-sm sm:text-base font-bold text-[#0F172A] break-words">Los Robles</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#0F172A] bg-[#F1F5F9] border border-[#CBD5E1] px-3 py-1 rounded-lg shrink-0">
                      ABCD-12
                    </span>
                  </div>

                  {/* Conductor */}
                  <div className="flex items-center justify-between p-4 sm:p-5 hover:bg-[#F8FAFC]/60 transition-colors gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#16A34A] shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#64748B]">Conductor asignado</p>
                        <p className="text-sm sm:text-base font-bold text-[#0F172A] break-words">Carlos Pérez</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1 rounded-lg flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                      Activo
                    </span>
                  </div>

                  {/* Parada y Dirección (100% visible, sin recortes) */}
                  <div className="flex items-start justify-between p-4 sm:p-5 hover:bg-[#F8FAFC]/60 transition-colors gap-4">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF5FF] border border-[#E9D5FF] flex items-center justify-center text-[#9333EA] shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[#64748B]">Dirección / Parada asignada</p>
                        <p className="text-sm sm:text-base font-bold text-[#0F172A] mt-0.5 break-words whitespace-normal leading-snug">
                          {studentAssignedStop}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#64748B] shrink-0 mt-1">
                      7:45 AM
                    </span>
                  </div>

                  {/* Código de retiro */}
                  <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-[#FFFBEB]/40 to-transparent gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#92400E]">Código único de entrega</p>
                        <p className="text-xs text-[#A16207]">Entrega presencial del escolar</p>
                      </div>
                    </div>
                    <span className="font-mono font-black text-lg tracking-[0.2em] text-[#92400E] bg-white px-4 py-1.5 rounded-xl border border-[#FDE68A] shadow-xs shrink-0">
                      {activePickupCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón de Cerrar Sesión */}
              <button
                type="button"
                id="btn-logout-apoderado"
                onClick={() => navigate('/login')}
                className="w-full h-12 rounded-xl text-sm font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] hover:border-[#FCA5A5] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] mt-1"
              >
                <svg className="w-4 h-4 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </main>

        {/* ─── Barra de Navegación Inferior (Tabs) ─── */}
        <nav
          className="shrink-0 px-3 py-2 bg-white border-t border-[#E2E8F0] flex items-center justify-around z-20"
          style={{ minHeight: '64px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all cursor-pointer ${
                  isActive ? 'text-[#E8A118]' : 'text-[#94A3B8] hover:text-[#64748B]'
                }`}
              >
                <span className="relative">
                  {tab.icon(isActive)}
                  {tab.id === 'notificaciones' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626] ring-2 ring-white" />
                  )}
                </span>
                <span className={`text-xs font-semibold ${isActive ? 'text-[#E8A118]' : 'text-[#64748B]'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full bg-[#E8A118]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* ─── Modal: Cambiar apoderado autorizado ─── */}
        {showReceiverModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full bg-white rounded-t-3xl sm:rounded-3xl sm:max-w-md overflow-hidden shadow-2xl animate-fade-in">
              <div className="px-6 pt-6 pb-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">Cambiar receptor autorizado</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Se renovará el código PIN de retiro automáticamente</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReceiverModal(false)}
                  className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] cursor-pointer hover:bg-[#F1F5F9]"
                  title="Cerrar modal"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
                {receivers.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      changeAuthorizedReceiver(rec.name);
                      setShowReceiverModal(false);
                      showToast(`Receptor cambiado a ${rec.name}. Nuevo código generado.`);
                    }}
                    className={`w-full px-4 py-3.5 rounded-2xl flex items-center justify-between border-2 transition-all cursor-pointer text-left ${
                      activeReceiver === rec.name
                        ? 'bg-[#FFFBEB] border-[#E8A118] ring-2 ring-[#FDE68A]/50'
                        : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-2xs"
                        style={{ background: activeReceiver === rec.name ? '#E8A118' : '#94A3B8' }}
                      >
                        {getInitials(rec.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0F172A] break-words">{rec.name}</p>
                        <p className="text-xs text-[#64748B]">{rec.relation} · {rec.phone}</p>
                      </div>
                    </div>
                    {activeReceiver === rec.name && (
                      <svg className="w-5 h-5 text-[#E8A118] shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
