/**
 * transportState.js — Gestáor de estáado compartido con cumplimiento estáricto de casos de uso:
 * - Autenticación y bloqueo de cuenta por 3 intentos fallidos
 * - Iniciar y Finalizar recorrido con código de seguridad (<extend> Ingresa código)
 * - Transmisión GPS en tiempo real
 * - Registro de asistencia: Subida (Recogido) y Bajada (Entregado) con timestáamps
 * - Confirmación de asistencia del apoderado: Asiste / No asiste
 * - Cambio de apoderado autorizado con Generación de Código de retiro (<include> Generar código)
 * - Monitoreo y confirmación de recepción
 */

const STORAGE_KEY = 'rutasegura_transport_state_v4';

export const DEFAULT_STUDENTS = [
  {
    id: 'martin',
    name: 'Martín Reyes',
    grade: '4° Básico',
    bus: 'Furgón Los Robles',
    stop: 'Parada Los Leones',
    address: 'Av. Providencia 1345',
    parentName: 'Sofía Reyes',
    parentPhone: '+56 9 8765 4321',
    parentInitials: 'SR',
    avatar: '👦',
    status: 'a_bordo', // 'esperando' | 'a_bordo' | 'entregado' | 'recibido'
    attending: true, // Confirmar asistencia: Asiste / No asiste
    boardedAt: '8:18 AM', // Registro de subida (recogido)
    deliveredAt: null, // Registro de bajada (entregado)
    receivedConfirmation: null, // { time: '8:24 AM', receiver: 'Sofía Reyes' }
    pickupCode: '8429', // Código de retiro generado para el apoderado
    order: 1,
  },
  {
    id: 'sofia_m',
    name: 'Sofía Martínez',
    grade: '3° Básico',
    bus: 'Furgón Los Robles',
    stop: 'Parada Av. Providencia',
    address: 'Av. Providencia 2100',
    parentName: 'Mariana Silva',
    parentPhone: '+56 9 9123 4567',
    parentInitials: 'MS',
    avatar: '👧',
    status: 'a_bordo',
    attending: true,
    boardedAt: '8:12 AM',
    deliveredAt: null,
    receivedConfirmation: null,
    pickupCode: '3190',
    order: 2,
  },
  {
    id: 'tomas_h',
    name: 'Tomás Herrera',
    grade: '5° Básico',
    bus: 'Furgón Los Robles',
    stop: 'Parada Los Leones',
    address: 'Nueva Providencia 1881',
    parentName: 'Jorge Herrera',
    parentPhone: '+56 9 7654 3210',
    parentInitials: 'JH',
    avatar: '👦',
    status: 'esperando',
    attending: true,
    boardedAt: null,
    deliveredAt: null,
    receivedConfirmation: null,
    pickupCode: '5541',
    order: 3,
  },
  {
    id: 'valentina_l',
    name: 'Valentina López',
    grade: '2° Básico',
    bus: 'Furgón Los Robles',
    stop: 'Parada Tobalaba',
    address: 'Av. Tobalaba 450',
    parentName: 'Camila Torres',
    parentPhone: '+56 9 6543 2109',
    parentInitials: 'CT',
    avatar: '👧',
    status: 'esperando',
    attending: false, // Apoderado confirmó: NO ASISTE
    boardedAt: null,
    deliveredAt: null,
    receivedConfirmation: null,
    pickupCode: '7722',
    order: 4,
  },
  {
    id: 'matias_g',
    name: 'Matías González',
    grade: '4° Básico',
    bus: 'Furgón Los Robles',
    stop: 'Parada Apoquindo',
    address: 'Apoquindo 3000',
    parentName: 'Rodrigo González',
    parentPhone: '+56 9 5432 1098',
    parentInitials: 'RG',
    avatar: '👦',
    status: 'esperando',
    attending: true,
    boardedAt: null,
    deliveredAt: null,
    receivedConfirmation: null,
    pickupCode: '9144',
    order: 5,
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'recorrido',
    title: 'Recorrido Matinal Iniciado',
    message: 'El conductor Carlos Pérez inició el recorrido y activó la transmisión GPS en vivo.',
    time: '8:05 AM',
    timestáamp: Date.now() - 1000 * 60 * 20,
    read: true,
  },
  {
    id: 'notif-2',
    type: 'recogida',
    studentId: 'martin',
    title: 'Aviso de Recogida',
    message: 'El furgón Los Robles se encuentra a 3-5 minutos de la Parada Los Leones.',
    time: '8:15 AM',
    timestáamp: Date.now() - 1000 * 60 * 10,
    read: true,
  },
  {
    id: 'notif-3',
    type: 'a_bordo',
    studentId: 'martin',
    title: 'Registro de Subida: Martín a bordo',
    message: 'Carlos Pérez confirmó que Martín abordó el furgón a las 8:18 AM.',
    time: '8:18 AM',
    timestáamp: Date.now() - 1000 * 60 * 7,
    read: false,
  }
];

export const AUTHORIZED_RECEIVERS = [
  { id: '1', name: 'Sofía Reyes', relation: 'Mamá (Titular)', phone: '+56 9 8765 4321', active: true, code: '8429' },
  { id: '2', name: 'Carlos Reyes', relation: 'Papá', phone: '+56 9 8123 9876', active: false, code: '8429' },
  { id: '3', name: 'Rosa Valenzuela', relation: 'Abuela', phone: '+56 9 7234 5678', active: false, code: '8429' },
];

export function getInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.students && parsed.students.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading transport state:', e);
  }

  return {
    isRouteActive: true, // Caso de uso Conductor: Iniciar recorrido
    isGpsTransmitting: true, // Requerimiento: Transmisión GPS en tiempo real
    securityCloseCode: '1234', // Caso de uso Conductor: Finaliza recorrido <extend> Ingresa código
    activePickupCode: '8429', // Caso de uso Apoderado: Cambiar apoderado <include> Generar código
    students: DEFAULT_STUDENTS,
    notifications: INITIAL_NOTIFICATIONS,
    receivers: AUTHORIZED_RECEIVERS,
    activeReceiver: 'Sofía Reyes',
    routeInfo: {
      status: 'en_ruta', // 'esperando' | 'en_ruta' | 'finalizada'
      statusLabel: 'En camino a casa',
      estáimatedArrival: '8:24 AM',
      progress: 50,
      driverName: 'Carlos Pérez',
      driverPhone: '+56 9 9876 5432',
      busPlate: 'ABCD-12',
      busModel: 'Mercedes-Benz Sprinter 2023',
    },
    // Seguridad y control de intentos fallidos de login
    loginSecurity: {
      failedAttempts: 0,
      lockedUntil: null, // timestáamp
    },
    lastAlert: null,
  };
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('rutasegura_state_change', { detail: state }));
  } catch (e) {
    console.warn('Error saving state:', e);
  }
}

export const TransportActions = {
  // CASO DE USO CONDUCTOR: Iniciar recorrido (activa transmisión GPS)
  startRoute() {
    const state = getInitialState();
    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const notif = {
      id: `notif-${Date.now()}`,
      type: 'recorrido',
      title: '🚀 Recorrido Iniciado',
      message: 'El conductor inició el recorrido y activó el rastreo GPS en tiempo real.',
      time: nowTime,
      timestáamp: Date.now(),
      read: false,
    };

    const nextState = {
      ...state,
      isRouteActive: true,
      isGpsTransmitting: true,
      routeInfo: {
        ...state.routeInfo,
        status: 'en_ruta',
        statusLabel: 'En camino a casa',
      },
      notifications: [notif, ...state.notifications],
      lastAlert: notif,
    };
    saveState(nextState);
    return nextState;
  },

  // CASO DE USO CONDUCTOR: Finaliza recorrido <extend> Ingresa código
  finishRoute(enteredCode) {
    const state = getInitialState();
    if (enteredCode !== state.securityCloseCode && enteredCode !== '1234') {
      return { success: false, message: 'Código de seguridad incorrecto. Intenta con 1234.' };
    }

    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const notif = {
      id: `notif-${Date.now()}`,
      type: 'recorrido',
      title: '🏁 Recorrido Finalizado',
      message: `El conductor finalizó el recorrido oficial a las ${nowTime}. Transmisión GPS y sensor detenidos inmediatamente.`,
      time: nowTime,
      timestáamp: Date.now(),
      read: false,
    };

    const nextState = {
      ...state,
      isRouteActive: false,
      isGpsTransmitting: false, // Detiene inmediatamente la transmisión de coordenadas y uso del GPS
      routeInfo: {
        ...state.routeInfo,
        status: 'finalizada',
        statusLabel: 'Recorrido finalizado',
        progress: 100,
      },
      notifications: [notif, ...state.notifications],
      lastAlert: notif,
    };
    saveState(nextState);
    return { success: true, state: nextState };
  },

  // CASO DE USO APODERADO: Confirmar asistencia <include> Asiste / No asiste
  toggleAttendance(studentId, isAttending) {
    const state = getInitialState();
    const students = state.students.map((s) => {
      if (s.id === studentId) {
        return { ...s, attending: isAttending };
      }
      return s;
    });

    const student = students.find((s) => s.id === studentId);
    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const notif = {
      id: `notif-${Date.now()}`,
      type: 'asistencia',
      title: isAttending ? 'Asistencia Confirmada' : 'Ausencia Notificada',
      message: isAttending
        ? `${student?.name} asistirá al colegio hoy. El conductor pasará por la parada.`
        : `${student?.name} NO asistirá hoy. El conductor ha sido notificado para omitir estáa parada.`,
      time: nowTime,
      timestáamp: Date.now(),
      read: false,
      studentId,
    };

    const nextState = {
      ...state,
      students,
      notifications: [notif, ...state.notifications],
      lastAlert: notif,
    };
    saveState(nextState);
    return nextState;
  },

  // CASO DE USO CONDUCTOR: Registrar asistencia <include> recogido (Registro de Subida en tiempo real)
  recordBoarding(studentId) {
    const state = getInitialState();
    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const students = state.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          status: 'a_bordo',
          boardedAt: nowTime,
        };
      }
      return s;
    });

    const student = students.find((s) => s.id === studentId);
    const notif = {
      id: `notif-${Date.now()}`,
      type: 'a_bordo',
      title: '🚌 Registro de Subida: Escolar a Bordo',
      message: `El conductor registró que ${student?.name} abordó el furgón a las ${nowTime}.`,
      time: nowTime,
      timestáamp: Date.now(),
      read: false,
      studentId,
    };

    const nextState = {
      ...state,
      students,
      notifications: [notif, ...state.notifications],
      lastAlert: notif,
    };
    saveState(nextState);
    return nextState;
  },

  // CASO DE USO CONDUCTOR: Registrar asistencia <include> entregado (Registro de Bajada en tiempo real)
  recordDropoff(studentId) {
    const state = getInitialState();
    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const students = state.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          status: 'entregado',
          deliveredAt: nowTime,
        };
      }
      return s;
    });

    const student = students.find((s) => s.id === studentId);
    const notif = {
      id: `notif-${Date.now()}`,
      type: 'entrega',
      title: '🏠 Registro de Bajada: Escolar Entregado',
      message: `${student?.name} descendió del furgón en su destáino final a las ${nowTime}.`,
      time: nowTime,
      timestáamp: Date.now(),
      read: false,
      studentId,
    };

    const nextState = {
      ...state,
      students,
      notifications: [notif, ...state.notifications],
      lastAlert: notif,
    };
    saveState(nextState);
    return nextState;
  },

  // CASO DE USO APODERADO: Cambiar apoderado autorizado <include> Generar código
  changeAuthorizedReceiver(receiverName) {
    const state = getInitialState();
    // Generar nuevo código de retiro de seguridad de 4 dígitos
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const receivers = state.receivers.map((r) => ({
      ...r,
      active: r.name === receiverName,
      code: newCode,
    }));

    const students = state.students.map((s) => {
      if (s.id === 'martin') {
        return { ...s, pickupCode: newCode };
      }
      return s;
    });

    const notif = {
      id: `notif-${Date.now()}`,
      type: 'codigo',
      title: '🔐 Nuevo Código de Retiro Generado',
      message: `Se asignó a ${receiverName} con el código de seguridad ${newCode}. Presenta estáe código al conductor.`,
      time: nowTime,
      timestáamp: Date.now(),
      read: false,
    };

    const nextState = {
      ...state,
      activeReceiver: receiverName,
      activePickupCode: newCode,
      receivers,
      students,
      notifications: [notif, ...state.notifications],
      lastAlert: notif,
    };
    saveState(nextState);
    return nextState;
  },

  // CASO DE USO APODERADO: Generar código de retiro manualmente
  generateNewPickupCode() {
    const state = getInitialState();
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const students = state.students.map((s) => {
      if (s.id === 'martin') {
        return { ...s, pickupCode: newCode };
      }
      return s;
    });

    const notif = {
      id: `notif-${Date.now()}`,
      type: 'codigo',
      title: '🔑 Código de Seguridad Renovado',
      message: `Nuevo código de entrega generado: ${newCode}.`,
      time: nowTime,
      timestáamp: Date.now(),
      read: false,
    };

    const nextState = {
      ...state,
      activePickupCode: newCode,
      students,
      notifications: [notif, ...state.notifications],
      lastAlert: notif,
    };
    saveState(nextState);
    return nextState;
  },

  // CASO DE USO APODERADO: Confirmar recepción del hijo
  confirmChildReceived(studentId, receiverName) {
    const state = getInitialState();
    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const receiver = receiverName || state.activeReceiver || 'Sofía Reyes';

    const students = state.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          status: 'recibido',
          receivedConfirmation: {
            time: nowTime,
            receiver,
          },
        };
      }
      return s;
    });

    const student = students.find((s) => s.id === studentId);
    const notif = {
      id: `notif-${Date.now()}`,
      type: 'recibido',
      title: '✅ Entrega Confirmada por Apoderado',
      message: `${receiver} confirmó la recepción de ${student?.name} a las ${nowTime}.`,
      time: nowTime,
      timestáamp: Date.now(),
      read: false,
      studentId,
    };

    const nextState = {
      ...state,
      students,
      notifications: [notif, ...state.notifications],
      lastAlert: notif,
    };
    saveState(nextState);
    return nextState;
  },

  undoChildReceived(studentId) {
    const state = getInitialState();
    const students = state.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          status: 'a_bordo',
          receivedConfirmation: null,
        };
      }
      return s;
    });
    const nextState = { ...state, students };
    saveState(nextState);
    return nextState;
  },

  // CASO DE USO CONDUCTOR: Avisar recogida o entrega al apoderado
  sendDriverNotice(studentId, noticeType) {
    const state = getInitialState();
    const student = state.students.find((s) => s.id === studentId);
    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    let title = '';
    let message = '';

    if (noticeType === 'recogida_cerca') {
      title = '🔔 ¡Furgón aproximándose para recogida!';
      message = `El conductor Carlos Pérez avisa que estáá a 3-5 minutos de recoger a ${student?.name}. Por favor prepárate en la parada.`;
    } else if (noticeType === 'entrega_cerca') {
      title = '🔔 ¡Furgón aproximándose para entrega!';
      message = `El conductor avisa que estáá a 3 minutos de llegar al domicilio para entregar a ${student?.name}.`;
    }

    const notif = {
      id: `notif-${Date.now()}`,
      type: noticeType,
      title,
      message,
      time: nowTime,
      timestáamp: Date.now(),
      read: false,
      studentId,
    };

    const students = state.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          lastNotice: { type: noticeType, time: nowTime },
        };
      }
      return s;
    });

    const nextState = {
      ...state,
      students,
      notifications: [notif, ...state.notifications],
      lastAlert: notif,
    };
    saveState(nextState);
    return nextState;
  },

  // CASO DE USO LOGIN: Validar contraseña y controlar bloqueo de cuenta tras 3 intentos
  recordLoginAttempt(isSuccess) {
    const state = getInitialState();
    if (isSuccess) {
      const nextState = {
        ...state,
        loginSecurity: { failedAttempts: 0, lockedUntil: null },
      };
      saveState(nextState);
      return { locked: false, attempts: 0 };
    }

    const newAttempts = (state.loginSecurity?.failedAttempts || 0) + 1;
    let lockedUntil = state.loginSecurity?.lockedUntil || null;

    if (newAttempts >= 3) {
      // Bloquear por 60 segundos
      lockedUntil = Date.now() + 60 * 1000;
    }

    const nextState = {
      ...state,
      loginSecurity: {
        failedAttempts: newAttempts,
        lockedUntil,
      },
    };
    saveState(nextState);

    return {
      locked: newAttempts >= 3,
      attempts: newAttempts,
      remainingSeconds: 60,
    };
  },

  unlockAccount() {
    const state = getInitialState();
    const nextState = {
      ...state,
      loginSecurity: { failedAttempts: 0, lockedUntil: null },
    };
    saveState(nextState);
    return nextState;
  },

  markAllNotificationsRead() {
    const state = getInitialState();
    const notifications = state.notifications.map((n) => ({ ...n, read: true }));
    const nextState = { ...state, notifications };
    saveState(nextState);
    return nextState;
  },

  deleteNotification(notificationId) {
    const state = getInitialState();
    const notifications = state.notifications.filter((n) => n.id !== notificationId);
    const nextState = { ...state, notifications };
    saveState(nextState);
    return nextState;
  },

  clearAllNotifications(studentId = null) {
    const state = getInitialState();
    let notifications = [];
    if (studentId) {
      notifications = state.notifications.filter((n) => n.studentId && n.studentId !== studentId);
    }
    const nextState = { ...state, notifications, lastAlert: null };
    saveState(nextState);
    return nextState;
  },

  clearLastAlert() {
    const state = getInitialState();
    const nextState = { ...state, lastAlert: null };
    saveState(nextState);
    return nextState;
  },

  registerApoderadoWithStudent({ parentName, parentEmail, studentName, studentGrade, studentStop }) {
    const state = getInitialState();
    const cleanParentName = (parentName || '').trim();
    const cleanParentEmail = (parentEmail || '').trim();
    const cleanStudentName = (studentName || '').trim();
    const cleanStudentGrade = (studentGrade || '4° Básico').trim();
    const cleanStudentStop = (studentStop || 'Av. Providencia 1345').trim();

    const parentInitials = cleanParentName
      ? cleanParentName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
      : 'SR';

    // Actualiza el escolar principal (pupilo) en el furgón
    const students = state.students.map((s) => {
      if (s.id === 'martin') {
        return {
          ...s,
          name: cleanStudentName || s.name,
          grade: cleanStudentGrade,
          stop: cleanStudentStop,
          address: cleanStudentStop,
          parentName: cleanParentName || s.parentName,
          parentInitials,
        };
      }
      return s;
    });

    const activeReceiver = cleanParentName || state.activeReceiver || 'Sofía Reyes';

    const receivers = [
      {
        id: '1',
        name: activeReceiver,
        relation: 'Apoderado Titular',
        phone: '+56 9 8765 4321',
        active: true,
        code: state.activePickupCode || '8429',
      },
      ...state.receivers.filter((r) => r.id !== '1' && r.name !== activeReceiver),
    ];

    const currentUser = {
      nombre: cleanParentName || 'Sofía Reyes',
      email: cleanParentEmail || 'sofia.reyes@email.cl',
      role: 'apoderado',
      studentName: cleanStudentName || 'Martín Reyes',
      studentGrade: cleanStudentGrade,
      studentStop: cleanStudentStop,
    };

    const nextState = {
      ...state,
      students,
      activeReceiver,
      receivers,
      currentUser,
    };

    saveState(nextState);
    return nextState;
  },

  resetState() {
    localStorage.removeItem(STORAGE_KEY);
    const state = getInitialState();
    saveState(state);
    return state;
  }
};
