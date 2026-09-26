import { useState, useEffect, useCallback } from 'react';
import {
  getInitialState,
  TransportActions
} from './transportState';

export function useTransportState() {
  const [state, setState] = useState(getInitialState);

  useEffect(() => {
    function handleLocalChange(e) {
      if (e.detail) {
        setState(e.detail);
      } else {
        setState(getInitialState());
      }
    }

    function handleStorageChange(e) {
      if (e.key === 'rutasegura_transport_state_v4') {
        setState(getInitialState());
      }
    }

    window.addEventListener('rutasegura_state_change', handleLocalChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('rutasegura_state_change', handleLocalChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const startRoute = useCallback(() => {
    const updated = TransportActions.startRoute();
    setState(updated);
  }, []);

  const finishRoute = useCallback((code) => {
    const result = TransportActions.finishRoute(code);
    if (result.success) {
      setState(result.state);
    }
    return result;
  }, []);

  const toggleAttendance = useCallback((studentId, isAttending) => {
    const updated = TransportActions.toggleAttendance(studentId, isAttending);
    setState(updated);
  }, []);

  const recordBoarding = useCallback((studentId) => {
    const updated = TransportActions.recordBoarding(studentId);
    setState(updated);
  }, []);

  const recordDropoff = useCallback((studentId) => {
    const updated = TransportActions.recordDropoff(studentId);
    setState(updated);
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
