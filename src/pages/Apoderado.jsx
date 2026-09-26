import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RouteMap from '../components/RouteMap';
import { useTransportState } from '../data/useTransportState';
import { ROUTE_STOPS } from '../data/routeData';
import { gpsService } from '../services/gpsWebSocketService';

// Genera iniciales a partir del nombre
function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// Colores deterministas por alumno (basados en el índice)
const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B'];

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

  const martin = students.find((s) => s.id === 'martin') || students[0];
  const isAttending = martin ? martin.attending : true;
  const childStatus = martin ? martin.status : 'a_bordo';
  const isReceived = childStatus === 'recibido';

  const currentParentName = currentUser?.nombre || activeReceiver || 'Sofía Reyes';
  const currentParentEmail = currentUser?.email || 'sofia.reyes@email.cl';
  const parentInitials = getInitials(currentParentName);
  const studentFirstName = martin?.name ? martin.name.split(' ')[0] : 'Martín';
  const studentInitials = martin?.name ? getInitials(martin.name) : 'MR';

  // Filtrado estricto: el apoderado solo ve avisos dirigidos a su hijo Martín o generales de la ruta
  const studentNotifications = notifications.filter(
    (n) => !n.studentId || n.studentId === martin.id
  );
  const unreadCount = studentNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    const unsubscribe = gpsService.subscribe((pos) => setCurrentGps(pos));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (lastAlert) {
      // Filtrar alertas toast: no mostrar popups dirigidos a otros alumnos
      if (lastAlert.studentId && lastAlert.studentId !== martin.id) {
        return;
      }
      setToastMessage(lastAlert);
      const timer = setTimeout(() => { setToastMessage(null); clearLastAlert(); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastAlert, clearLastAlert, martin?.id]);

  function handleAttendanceToggle(val) {
    toggleAttendance('martin', val);
    showToast(val ? 'Asistencia confirmada para hoy.' : 'Ausencia notificada al conductor.');
  }

  function handleConfirmReceived() {
    confirmChildReceived('martin', activeReceiver);
    showToast('Recepción de Martín confirmada. Conductor notificado.');
  }

  function handleUndoReceived() {
    undoChildReceived('martin');
    showToast('Recepción restablecida.');
  }

  function showToast(msg) {
    setToastMessage({ title: 'RutaSegura', message: msg });
    setTimeout(() => setToastMessage(null), 4000);
  }

  function getStatusInfo() {
    if (!isAttending) return {
      label: 'No asiste hoy',
      color: '#991B1B', bg: '#FEF2F2', border: '#FECACA',
      desc: 'Ausencia notificada. El conductor omitirá esta parada.',
    };
    switch (childStatus) {
      case 'a_bordo': case 'en_viaje': return {
        label: 'A bordo',
        color: '#92400E', bg: '#FFFBEB', border: '#FDE68A',
        desc: martin?.boardedAt ? `Subió al furgón a las ${martin.boardedAt}` : 'En trayecto hacia el colegio.',
      };
      case 'esperando': return {
        label: 'Esperando',
        color: '#B45309', bg: '#FEF3C7', border: '#FDE68A',
        desc: 'El furgón está en camino a la parada.',
      };
      case 'entregado': return {
        label: 'Entregado',
        color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE',
        desc: martin?.deliveredAt ? `Descendió a las ${martin.deliveredAt}` : 'Descendió del furgón.',
      };
      case 'recibido': return {
        label: 'Recibido',
        color: '#14532D', bg: '#F0FDF4', border: '#BBF7D0',
        desc: `Entregado a ${martin?.receivedConfirmation?.receiver || activeReceiver}.`,
      };
      default: return { label: 'En ruta', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', desc: 'En viaje escolar.' };
    }
  }

  const statusInfo = getStatusInfo();

  const busLocation = currentGps || ROUTE_STOPS[1];

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { id: 'mapa', label: 'Mapa', icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { id: 'notificaciones', label: 'Avisos', icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )},
    { id: 'perfil', label: 'Perfil', icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
  ];

  return (
    <div className="min-h-screen w-full flex justify-center bg-[#F1F5F9]">
      <div className="w-full max-w-[480px] h-[100dvh] sm:h-[840px] sm:max-h-[calc(100dvh-2rem)] sm:my-4 flex flex-col bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-[#E2E8F0] overflow-hidden relative">

        {/* ─── Toast ─── */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50">
            <div className="bg-[#0F172A] text-white px-5 py-4 rounded-xl shadow-xl flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#E8A118]">{toastMessage.title}</p>
                <p className="text-xs text-[#CBD5E1] mt-0.5 leading-relaxed">{toastMessage.message}</p>
              </div>
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
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white select-none shrink-0 shadow-xs bg-gradient-to-tr from-[#D97706] to-[#F59E0B]">
              {parentInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-[#64748B] leading-none truncate">Panel Apoderado</p>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span>En ruta</span>
                </span>
              </div>
              <p className="text-sm font-bold text-[#0F172A] mt-0.5 truncate">{currentParentName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="btn-notifications-apoderado"
              onClick={() => setActiveTab('notificaciones')}
              className="relative h-8.5 w-8.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center cursor-pointer hover:bg-[#F1F5F9] transition-colors shadow-2xs"
            >
              <svg className="w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DC2626]" />}
            </button>
            <button
              type="button"
              id="btn-header-logout-apoderado"
              onClick={() => navigate('/login')}
              className="h-8.5 px-2.5 rounded-xl text-xs font-semibold text-[#475569] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* ─── Main content ─── */}
        <main className="flex-1 overflow-y-auto custom-scroll">

          {/* ══ INICIO ══ */}
          {activeTab === 'inicio' && (
            <div className="px-5 py-5 space-y-4">

              {/* Tarjeta hero: estado del recorrido */}
              <div className="rounded-3xl overflow-hidden shadow-lg shadow-amber-500/15 bg-gradient-to-br from-[#E8A118] via-[#DF9510] to-[#C97A00] text-white">
                <div className="p-4.5 pb-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest truncate">
                      Recorrido escolar
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-white border border-white/20 shrink-0">
                      {isRouteActive ? 'En progreso' : 'Finalizado'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">En camino a tu parada</h2>
                  <p className="text-xs text-white/85 font-medium mt-0.5 truncate">
                    Conductor: Carlos Pérez · Furgón Los Robles
                  </p>
                </div>

                {/* Bloque estilizado de tiempo estimado y progreso */}
                <div className="mx-3.5 mb-3.5 bg-black/10 backdrop-blur-xs border border-white/20 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white/75 uppercase tracking-wider truncate">Llegada estimada</p>
                      <p className="text-xs font-semibold text-white/90 mt-0.5 truncate">~6 minutos restantes</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-white tracking-tight leading-none">8:24 AM</p>
                      <p className="text-[10px] font-semibold text-white/75 mt-0.5 truncate max-w-[150px]">{martin?.stop || martin?.address || 'Tu parada'}</p>
                    </div>
                  </div>

                  {/* Barra de progreso interactiva con furgón */}
                  <div className="mt-3.5">
                    <div className="relative flex items-center">
                      <div className="w-full h-2 bg-white/25 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-700 shadow-sm" style={{ width: '65%' }} />
                      </div>
                      <div className="absolute left-[63%] -top-2.5 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[#D97706] text-xs font-bold ring-2 ring-white/50">
                        <svg className="w-4 h-4 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-9 5h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v9a2 2 0 002 2zm1 0v2m8-2v2" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-white/80 mt-2">
                      <span>Colegio</span>
                      <span className="text-white font-bold">Tu parada</span>
                      <span>Casa</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acceso rápido a ubicación GPS */}
              <div
                onClick={() => setActiveTab('mapa')}
                className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-[#94A3B8] hover:shadow-xs transition-all shadow-2xs group gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <svg className="w-5 h-5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#0F172A] truncate">Ubicación del Furgón</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-1.5 py-0.2 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                        GPS
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5 truncate">Seguimiento en vivo y paradas en tiempo real</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#D97706] group-hover:translate-x-1 transition-transform shrink-0">
                  <span className="hidden sm:inline">Ver mapa</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Asistencia */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-5 pt-4.5 pb-3.5 border-b border-[#F1F5F9]">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Control de asistencia</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-1">¿{studentFirstName} asistirá hoy al colegio?</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      id="btn-asiste-si"
                      onClick={() => handleAttendanceToggle(true)}
                      className={`min-h-[50px] rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isAttending
                          ? 'bg-[#FFFBEB] border-2 border-[#D97706] text-[#92400E] shadow-2xs'
                          : 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                      }`}
                    >
                      <svg className={`w-4 h-4 ${isAttending ? 'text-[#D97706]' : 'text-[#94A3B8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Sí, asiste</span>
                    </button>
                    <button
                      type="button"
                      id="btn-asiste-no"
                      onClick={() => handleAttendanceToggle(false)}
                      className={`min-h-[50px] rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        !isAttending
                          ? 'bg-[#FEF2F2] border-2 border-[#EF4444] text-[#991B1B] shadow-2xs'
                          : 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                      }`}
                    >
                      <svg className={`w-4 h-4 ${!isAttending ? 'text-[#EF4444]' : 'text-[#94A3B8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>No asistirá</span>
                    </button>
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2 text-xs text-[#64748B]">
                    <svg className="w-4 h-4 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {isAttending
                        ? `El furgón pasará a recoger a ${studentFirstName} a las 7:45 AM en tu parada habitual.`
                        : 'Ausencia notificada al conductor. Omitirá tu parada el día de hoy.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Estado del escolar */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-5 pt-4.5 pb-3.5 border-b border-[#F1F5F9] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] flex items-center justify-center text-white font-bold text-sm select-none shrink-0 shadow-2xs">
                      {studentInitials}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Estado del escolar</p>
                      <p className="text-sm font-bold text-[#0F172A] mt-0.5">{martin?.name || 'Martín Reyes'}</p>
                      <p className="text-xs text-[#64748B]">{martin?.grade || '4° Básico'} · Furgón Los Robles</p>
                    </div>
                  </div>
                  <span
                    className="px-3 py-1.5 rounded-full text-xs font-bold border shrink-0 ml-2"
                    style={{ background: statusInfo.bg, color: statusInfo.color, borderColor: statusInfo.border }}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5">
                    <span className="text-[#475569] font-medium">{statusInfo.desc}</span>
                    {martin?.boardedAt && (
                      <span className="font-bold text-[#0F172A] ml-2 shrink-0">{martin.boardedAt}</span>
                    )}
                  </div>

                  {/* Estado de recepción intuitivo */}
                  {childStatus === 'esperando' && (
                    <div className="px-4 py-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-2.5 text-xs text-[#92400E]">
                      <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" />
                      <span>Esperando recogida · Recibirás una notificación cuando el furgón esté cerca.</span>
                    </div>
                  )}

                  {(childStatus === 'a_bordo' || childStatus === 'en_viaje') && (
                    <div className="px-4 py-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-pulse shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#1E40AF]">{studentFirstName} está a bordo del furgón</p>
                        <p className="text-[11px] text-[#3B82F6] mt-0.5">Podrás confirmar la recepción apenas el furgón llegue a destino.</p>
                      </div>
                    </div>
                  )}

                  {childStatus === 'entregado' && (
                    <div className="space-y-2.5">
                      <div className="px-4 py-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping shrink-0" />
                        <p className="text-xs font-bold text-[#14532D]">
                          ¡El furgón llegó! {studentFirstName} descendió a las {martin?.deliveredAt || 'recientemente'}.
                        </p>
                      </div>
                      <button
                        type="button"
                        id="btn-confirmar-recibido"
                        onClick={handleConfirmReceived}
                        className="w-full min-h-[50px] rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.99]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Confirmar que recibí a {studentFirstName}</span>
                      </button>
                    </div>
                  )}

                  {isReceived && (
                    <div className="px-4 py-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center text-white shrink-0 shadow-2xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#14532D]">
                            Recepción confirmada por {martin?.receivedConfirmation?.receiver || activeReceiver}
                          </p>
                          <p className="text-[11px] text-[#16A34A]">
                            Hora: {martin?.receivedConfirmation?.time || martin?.deliveredAt || '—'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleUndoReceived}
                        className="text-xs font-bold text-[#16A34A] underline underline-offset-2 cursor-pointer hover:text-[#15803D]"
                      >
                        Deshacer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Retiro seguro */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-5 pt-4 pb-3 border-b border-[#F1F5F9] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider truncate">Retiro seguro</p>
                    <p className="text-sm font-bold text-[#0F172A] mt-0.5 truncate">Apoderado autorizado</p>
                  </div>
                  <button
                    type="button"
                    id="btn-cambiar-apoderado"
                    onClick={() => setShowReceiverModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Cambiar</span>
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 gap-2">
                    <span className="text-[#64748B] truncate">Receptor autorizado hoy:</span>
                    <span className="font-bold text-[#0F172A] shrink-0">{activeReceiver}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] shadow-2xs">
                    <div className="flex items-center justify-between mb-2.5 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <svg className="w-4 h-4 text-[#D97706] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <p className="text-[11px] font-bold text-[#92400E] uppercase tracking-wider truncate">Código único de entrega</p>
                      </div>
                      <button
                        type="button"
                        id="btn-renovar-codigo"
                        onClick={() => { generateNewPickupCode(); showToast('Nuevo código de retiro generado.'); }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#92400E] bg-white border border-[#FDE68A] hover:bg-[#FEF3C7] shadow-2xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <svg className="w-3 h-3 text-[#A16207]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Renovar PIN</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[#92400E] font-medium truncate">Muestra este código al conductor:</p>
                      <span className="font-mono font-black text-2xl tracking-[0.2em] text-[#92400E] bg-white px-3.5 py-1.5 rounded-xl border border-[#FDE68A] shadow-xs shrink-0">
                        {activePickupCode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ MAPA ══ */}
          {activeTab === 'mapa' && (
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Seguimiento GPS</p>
                  <h2 className="text-base font-bold text-[#0F172A] mt-0.5">Ubicación en tiempo real</h2>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155]">
                  Llegada: ~6 min
                </span>
              </div>

              <div className="w-full h-[380px] rounded-2xl overflow-hidden border border-[#CBD5E1] shadow-2xs">
                <RouteMap
                  busPosition={busLocation}
                  showStops={true}
                  highlightStopName={martin?.stop || 'Parada Los Leones'}
                  interactive={true}
                />
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-2xl divide-y divide-[#F1F5F9]">
                {[
                  { label: 'Próxima parada', value: 'Parada Los Leones' },
                  { label: 'Llegada estimada', value: '8:24 AM (~6 min)' },
                  { label: 'Conductor', value: 'Carlos Pérez' },
                  { label: 'Furgón', value: 'Los Robles · ABCD-12' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-[#64748B]">{row.label}</span>
                    <span className="text-sm font-semibold text-[#0F172A]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ NOTIFICACIONES ══ */}
          {activeTab === 'notificaciones' && (
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Centro de avisos</p>
                  <h2 className="text-base font-bold text-[#0F172A] mt-0.5">Avisos de Martín ({studentNotifications.length})</h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      id="btn-mark-all-read"
                      onClick={() => markAllNotificationsRead()}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Marcar todas como leídas"
                    >
                      <svg className="w-3.5 h-3.5 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        clearAllNotifications(martin.id);
                        showToast('Notificaciones de Martín eliminadas.');
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Borrar todas las notificaciones"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Borrar todas</span>
                    </button>
                  )}
                </div>
              </div>

              {studentNotifications.length === 0 ? (
                <div className="py-12 bg-white border border-[#E2E8F0] rounded-2xl text-center px-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center mx-auto text-[#16A34A]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Todo al día</h3>
                  <p className="text-xs text-[#64748B] max-w-xs mx-auto">
                    No tienes notificaciones pendientes para Martín. Aquí verás los avisos de llegada, subida y entrega en tiempo real.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-xl border transition-all relative ${
                        notif.read ? 'bg-white border-[#E2E8F0]' : 'bg-[#FFFBEB] border-[#FDE68A] shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {!notif.read && <span className="w-2 h-2 rounded-full bg-[#E8A118] shrink-0" />}
                          <p className="text-sm font-semibold text-[#0F172A] leading-tight truncate">
                            {notif.title?.replace(/^[\u{1F000}-\u{1FFFF}]|^[^\w\s]/u, '').trim()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-[#94A3B8] font-medium">{notif.time}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                            title="Eliminar esta notificación"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">{notif.message}</p>
                      {!notif.read && (
                        <span className="inline-block mt-2 text-[10px] font-bold text-[#92400E] bg-[#FDE68A]/60 px-2 py-0.5 rounded-md">
                          Nuevo aviso
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ PERFIL ══ */}
          {activeTab === 'perfil' && (
            <div className="px-5 py-5 space-y-4">
              {/* Tarjeta de Usuario */}
              <div className="bg-white border border-[#CBD5E1] rounded-3xl p-5 shadow-2xs text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7] to-[#FFFBEB] border-b border-[#FDE68A]/60" />
                <div className="relative pt-3 flex flex-col items-center">
                  <div className="w-18 h-18 rounded-3xl flex items-center justify-center font-black text-2xl text-white select-none shadow-md shadow-amber-500/20 bg-gradient-to-tr from-[#D97706] to-[#F59E0B] ring-4 ring-white">
                    {parentInitials}
                  </div>
                  <h2 className="text-lg font-black text-[#0F172A] mt-3">{currentParentName}</h2>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] mt-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-[#E8A118]" />
                    <span>Apoderada Titular</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-y-1 gap-x-3 text-xs text-[#64748B] mt-3">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{currentParentEmail}</span>
                    </span>
                    <span className="hidden sm:inline text-[#CBD5E1]">·</span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>+56 9 8765 4321</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Información del Servicio Escolar */}
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-5 pt-4 pb-3 border-b border-[#F1F5F9]">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    Detalles del servicio asignado
                  </p>
                </div>
                <div className="divide-y divide-[#F1F5F9]">
                  {/* Estudiante */}
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC]/60 transition-colors gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#64748B] truncate">Estudiante</p>
                        <p className="text-sm font-bold text-[#0F172A] truncate">{martin?.name || 'Martín Reyes'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded-lg shrink-0">
                      {martin?.grade || '4° Básico'}
                    </span>
                  </div>

                  {/* Furgón */}
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC]/60 transition-colors gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-9 5h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v9a2 2 0 002 2zm1 0v2m8-2v2" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#64748B] truncate">Furgón escolar</p>
                        <p className="text-sm font-bold text-[#0F172A] truncate">Los Robles</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#0F172A] bg-[#F1F5F9] border border-[#CBD5E1] px-2.5 py-0.5 rounded-lg shrink-0">
                      ABCD-12
                    </span>
                  </div>

                  {/* Conductor */}
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC]/60 transition-colors gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#16A34A] shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#64748B] truncate">Conductor asignado</p>
                        <p className="text-sm font-bold text-[#0F172A] truncate">Carlos Pérez</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                      Activo
                    </span>
                  </div>

                  {/* Parada */}
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC]/60 transition-colors gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] border border-[#E9D5FF] flex items-center justify-center text-[#9333EA] shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#64748B] truncate">Parada asignada</p>
                        <p className="text-sm font-bold text-[#0F172A] truncate">{martin?.stop || 'Parada Los Leones'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#64748B] shrink-0">
                      7:45 AM
                    </span>
                  </div>

                  {/* Código de retiro */}
                  <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#FFFBEB]/40 to-transparent gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#92400E] truncate">Código único de entrega</p>
                        <p className="text-[11px] text-[#A16207] truncate">Entrega presencial del escolar</p>
                      </div>
                    </div>
                    <span className="font-mono font-black text-base tracking-[0.2em] text-[#92400E] bg-white px-3 py-1 rounded-xl border border-[#FDE68A] shadow-xs shrink-0">
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
                className="w-full h-12 rounded-xl text-sm font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] hover:border-[#FCA5A5] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99]"
              >
                <svg className="w-4 h-4 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </main>

        {/* ─── Bottom nav ─── */}
        <nav className="shrink-0 px-2 pt-2 pb-safe bg-white border-t border-[#E2E8F0] flex items-center" style={{ minHeight: '60px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                  isActive ? 'text-[#E8A118]' : 'text-[#94A3B8] hover:text-[#64748B]'
                }`}
              >
                <span className="relative">
                  {tab.icon(isActive)}
                  {tab.id === 'notificaciones' && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#DC2626]" />
                  )}
                </span>
                <span className={`text-xs font-semibold ${isActive ? 'text-[#E8A118]' : 'text-[#64748B]'}`}>
                  {tab.label}
                </span>
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#E8A118]" />}
              </button>
            );
          })}
        </nav>

        {/* ─── Modal: Cambiar apoderado ─── */}
        {showReceiverModal && (
          <div className="absolute inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
            <div className="w-full bg-white rounded-t-2xl sm:rounded-2xl sm:max-w-[440px] sm:m-4 overflow-hidden shadow-xl">
              <div className="px-6 pt-6 pb-5 border-b border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Cambiar apoderado autorizado</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Se generará un nuevo código de retiro automáticamente</p>
                </div>
                <button type="button" onClick={() => setShowReceiverModal(false)}
                  className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] cursor-pointer hover:bg-[#F1F5F9]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-2">
                {receivers.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      changeAuthorizedReceiver(rec.name);
                      setShowReceiverModal(false);
                      showToast(`Receptor cambiado a ${rec.name}. Nuevo código generado.`);
                    }}
                    className={`w-full px-4 py-4 rounded-xl flex items-center justify-between border transition-all cursor-pointer ${
                      activeReceiver === rec.name
                        ? 'bg-[#FFFBEB] border-[#E8A118]'
                        : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: activeReceiver === rec.name ? '#E8A118' : '#94A3B8' }}
                      >
                        {getInitials(rec.name)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#0F172A]">{rec.name}</p>
                        <p className="text-xs text-[#64748B]">{rec.relation} · {rec.phone}</p>
                      </div>
                    </div>
                    {activeReceiver === rec.name && (
                      <svg className="w-5 h-5 text-[#E8A118] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
