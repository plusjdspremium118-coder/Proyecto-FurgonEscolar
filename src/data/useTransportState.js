import { useState, useEffect, useCallback } from 'react';
import { getInitialState, TransportActions } from './transportState';

import { API_BASE_URL as API } from '../config';

function getUserSession() {
  try {
    const raw = sessionStorage.getItem('rutasegura_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useTransportState() {
  const [state, setState] = useState(getInitialState);

  useEffect(() => {
    function handleLocalChange(e) {
      if (e.detail) setState(e.detail);
      else setState(getInitialState());
    }
    function handleStorageChange(e) {
      if (e.key === 'rutasegura_transport_state_v4') setState(getInitialState());
    }

    window.addEventListener('rutasegura_state_change', handleLocalChange);
    window.addEventListener('storage', handleStorageChange);

    const user = getUserSession();
    const apiUrl = (user && user.rol === 'apoderado' && user.id)
      ? `${API}/api/estudiantes/apoderado/${user.id}`
      : `${API}/api/estudiantes`;

    fetch(apiUrl)
      .then((res) => res.json())
      .then((dbStudents) => {
        if (!Array.isArray(dbStudents) || dbStudents.length === 0) return;

        setState((prev) => {
          const mapped = dbStudents.map((st, index) => ({
            id: st.id,
            name: st.nombre_completo || 'Sin nombre',
            grade: st.grado || 'Basico',
            bus: 'Furgon Los Robles',
            stop: st.direccion_hogar || 'Sin direccion',
            address: st.direccion_hogar || 'Sin direccion',
            parentName: user ? user.nombre : 'Apoderado',
            parentPhone: '+56 9 8765 4321',
            parentInitials: st.nombre_completo
              ? st.nombre_completo.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
              : '??',
            avatar: index % 2 === 0 ? String.fromCodePoint(0x1F466) : String.fromCodePoint(0x1F467),
            status: st.estado_actual || 'esperando',
            attending: st.asiste_hoy !== false,
            boardedAt: st.hora_subida || null,
            deliveredAt: st.hora_bajada || null,
            receivedConfirmation: null,
            pickupCode: st.codigo_retiro || '8429',
            order: index + 1,
          }));
          return { ...prev, students: mapped };
        });
      })
      .catch((err) => console.warn('[Supabase] sync warning:', err));

    return () => {
      window.removeEventListener('rutasegura_state_change', handleLocalChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const startRoute = useCallback(() => {
    const updated = TransportActions.startRoute();
    setState(updated);
    fetch(`${API}/api/viaje/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patente: 'ABCD-12' }),
    }).catch((err) => console.warn('[Supabase] startRoute:', err));
  }, []);

  const finishRoute = useCallback((code) => {
    const result = TransportActions.finishRoute(code);
    if (result.success) {
      setState(result.state);
      fetch(`${API}/api/recorrido/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_seguridad: code }),
      }).catch((err) => console.warn('[Supabase] finishRoute:', err));
    }
    return result;
  }, []);

  const toggleAttendance = useCallback((studentId, isAttending) => {
    const updated = TransportActions.toggleAttendance(studentId, isAttending);
    setState(updated);
    if (!isAttending) {
      fetch(`${API}/api/asistencia/no-asiste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estudiante_id: studentId, hora: '' }),
      }).catch((err) => console.warn('[Supabase] toggleAttendance:', err));
    }
  }, []);

  const recordBoarding = useCallback((studentId) => {
    const updated = TransportActions.recordBoarding(studentId);
    setState(updated);
    const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    fetch(`${API}/api/asistencia/subida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estudiante_id: studentId, hora }),
    }).catch((err) => console.warn('[Supabase] recordBoarding:', err));
  }, []);

  const recordDropoff = useCallback((studentId) => {
    const updated = TransportActions.recordDropoff(studentId);
    setState(updated);
    const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    fetch(`${API}/api/asistencia/bajada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estudiante_id: studentId, hora }),
    }).catch((err) => console.warn('[Supabase] recordDropoff:', err));
  }, []);

  const sendDriverNotice = useCallback((studentId, noticeType) => {
    const updated = TransportActions.sendDriverNotice(studentId, noticeType);
    setState(updated);
  }, []);

  const changeAuthorizedReceiver = useCallback((receiverName) => {
    const updated = TransportActions.changeAuthorizedReceiver(receiverName);
    setState(updated);
  }, []);

  const generateNewPickupCode = useCallback(() => {
    const updated = TransportActions.generateNewPickupCode();
    setState(updated);
  }, []);

  const confirmChildReceived = useCallback((studentId, receiverName) => {
    const updated = TransportActions.confirmChildReceived(studentId, receiverName);
    setState(updated);
    fetch(`${API}/api/asistencia/confirmar-recepcion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estudiante_id: studentId, hora: '' }),
    }).catch((err) => console.warn('[Supabase] confirmChildReceived:', err));
  }, []);

  const undoChildReceived = useCallback((studentId) => {
    const updated = TransportActions.undoChildReceived(studentId);
    setState(updated);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const updated = TransportActions.markAllNotificationsRead();
    setState(updated);
  }, []);

  const deleteNotification = useCallback((notificationId) => {
    const updated = TransportActions.deleteNotification(notificationId);
    setState(updated);
  }, []);

  const clearAllNotifications = useCallback((studentId = null) => {
    const updated = TransportActions.clearAllNotifications(studentId);
    setState(updated);
  }, []);

  const clearLastAlert = useCallback(() => {
    const updated = TransportActions.clearLastAlert();
    setState(updated);
  }, []);

  const recordLoginAttempt = useCallback((isSuccess) => {
    return TransportActions.recordLoginAttempt(isSuccess);
  }, []);

  const unlockAccount = useCallback(() => {
    const updated = TransportActions.unlockAccount();
    setState(updated);
  }, []);

  const resetState = useCallback(() => {
    const updated = TransportActions.resetState();
    setState(updated);
  }, []);

  const registerApoderadoWithStudent = useCallback((data) => {
    const updated = TransportActions.registerApoderadoWithStudent(data);
    setState(updated);
    return updated;
  }, []);

  return {
    ...state,
    startRoute,
    finishRoute,
    toggleAttendance,
    recordBoarding,
    recordDropoff,
    sendDriverNotice,
    changeAuthorizedReceiver,
    generateNewPickupCode,
    confirmChildReceived,
    undoChildReceived,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    clearLastAlert,
    recordLoginAttempt,
    unlockAccount,
    resetState,
    registerApoderadoWithStudent,
  };
}

