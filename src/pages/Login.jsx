import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validateEmail, buildSafePayload } from '../utils/validation';
import { useTransportState } from '../data/useTransportState';

export default function Login() {
  const navigate = useNavigate();
  const { recordLoginAttempt, unlockAccount, resetState } = useTransportState();

  const [role, setRole] = useState('apoderado');
  const [form, setForm] = useState({
    email: 'sofia.reyes@email.cl',
    password: 'password123',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isLocked && lockSecondsRemaining > 0) {
      interval = setInterval(() => {
        setLockSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedCount(0);
            unlockAccount();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockSecondsRemaining, unlockAccount]);

  function handleRoleSwitch(newRole) {
    setRole(newRole);
    if (newRole === 'apoderado') {
      setForm({ email: 'sofia.reyes@email.cl', password: 'password123' });
    } else {
      setForm({ email: 'carlos.conductor@rutasegura.cl', password: 'password123' });
    }
    setErrors({});
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const next = {};
    const emailResult = validateEmail(form.email);
    if (!emailResult.valid) next.email = emailResult.message;
    if (!form.password) next.password = 'La contraseña es obligatoria.';
    return next;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isLocked) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const isSuccess = form.password === 'password123';
      if (isSuccess) {
        recordLoginAttempt(true);
        setLoading(false);
        const payload = buildSafePayload({ email: form.email, role });
        console.log('Login exitoso:', payload);
        if (role === 'apoderado') navigate('/apoderado');
        else navigate('/conductor');
      } else {
        setLoading(false);
        const nextFailed = failedCount + 1;
        setFailedCount(nextFailed);
        recordLoginAttempt(false);
        if (nextFailed >= 3) {
          setIsLocked(true);
          setLockSecondsRemaining(60);
          setErrors({ general: 'Cuenta bloqueada tras 3 intentos fallidos consecutivos.' });
        } else {
          setErrors({ password: `Contraseña incorrecta. Intento ${nextFailed} de 3. (Usa: password123)` });
        }
      }
    }, 700);
  }

  function handleQuickUnlock() {
    setIsLocked(false);
    setFailedCount(0);
    setLockSecondsRemaining(0);
    unlockAccount();
    setForm((p) => ({ ...p, password: 'password123' }));
    setErrors({});
  }

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-[#F1F5F9] px-4 py-8">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">

        {/* Cabecera de marca */}
        <div className="px-8 pt-10 pb-8 border-b border-[#E2E8F0]">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
            style={{ background: '#E8A118' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 7h8M6 11h12M5 15h14M4 19h16M12 3L4 7v12h16V7l-8-4z" />
            </svg>
          </div>
          <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">
            RutaSegura
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Transporte escolar · Inicia sesión
          </p>
        </div>

        <div className="px-8 py-8 space-y-6">

          {/* Bloqueo de cuenta */}
          {isLocked && (
            <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
              <p className="text-sm font-semibold text-[#991B1B]">Cuenta bloqueada por seguridad</p>
              <p className="text-xs text-[#B91C1C] mt-1">
                Se detectaron 3 intentos fallidos. Espera {lockSecondsRemaining}s para continuar.
              </p>
              <button
                type="button"
                onClick={handleQuickUnlock}
                className="mt-3 px-3 py-1.5 rounded-lg bg-white border border-[#FECACA] text-xs font-bold text-[#991B1B] hover:bg-red-50 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <span>🔓 Desbloquear cuenta ahora</span>
              </button>
            </div>
          )}

          {errors.general && !isLocked && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
              <p className="text-xs text-[#B91C1C]">{errors.general}</p>
            </div>
          )}

          {/* Selector de rol */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider">
              Acceder como
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="role-apoderado-tab"
                onClick={() => handleRoleSwitch('apoderado')}
                className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  role === 'apoderado'
                    ? 'bg-[#FFFBEB] border-[#E8A118] text-[#92400E]'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                Apoderado
              </button>
              <button
                type="button"
                id="role-conductor-tab"
                onClick={() => handleRoleSwitch('conductor')}
                className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  role === 'conductor'
                    ? 'bg-[#FFFBEB] border-[#E8A118] text-[#92400E]'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                Conductor
              </button>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#334155]">
                Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                id="login-email"
                disabled={isLocked}
                value={form.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.cl"
                className="w-full px-4 py-3 rounded-xl text-sm text-[#0F172A] bg-white border-2 border-[#E2E8F0] focus:border-[#E8A118] focus:outline-none transition-all disabled:opacity-40 placeholder:text-[#CBD5E1]"
              />
              {errors.email && (
                <p className="text-xs text-[#DC2626] mt-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#334155]">Contraseña</label>
                <span className="text-xs text-[#94A3B8]">Demo: password123</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="login-password"
                  disabled={isLocked}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 rounded-xl text-sm text-[#0F172A] bg-white border-2 border-[#E2E8F0] focus:border-[#E8A118] focus:outline-none transition-all disabled:opacity-40 placeholder:text-[#CBD5E1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] p-1 cursor-pointer transition-colors"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-[#DC2626] mt-1">{errors.password}</p>
              )}
            </div>

            {failedCount > 0 && !isLocked && (
              <p className="text-xs text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2 rounded-lg">
                Intentos fallidos: {failedCount}/3. Al tercer intento se bloqueará la cuenta.
              </p>
            )}

            <button
              type="submit"
              id="btn-login-submit"
              disabled={loading || isLocked}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: loading || isLocked ? '#94A3B8' : '#E8A118' }}
            >
              {loading ? 'Verificando...' : `Ingresar como ${role === 'apoderado' ? 'Apoderado' : 'Conductor'}`}
            </button>
          </form>

          {/* Accesos directos demo */}
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/apoderado')}
                className="flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-all cursor-pointer shadow-2xs truncate"
              >
                Demo Apoderado
              </button>
              <button
                type="button"
                onClick={() => navigate('/conductor')}
                className="flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-all cursor-pointer shadow-2xs truncate"
              >
                Demo Conductor
              </button>
            </div>

            {/* Botón para reiniciar prueba demo */}
            <div className="pt-1 text-center">
              <button
                type="button"
                id="btn-reset-demo"
                onClick={() => {
                  resetState();
                  setResetNotice(true);
                  setTimeout(() => setResetNotice(false), 3500);
                }}
                className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-all cursor-pointer inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-[#F1F5F9]"
              >
                <svg className="w-3.5 h-3.5 text-[#E8A118]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Restablecer datos de prueba</span>
              </button>
              {resetNotice && (
                <p className="text-xs text-[#16A34A] font-semibold mt-1">
                  ✓ Datos de prueba restablecidos al estado inicial matutino.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="px-8 py-5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <p className="text-xs text-center text-[#94A3B8]">
            ¿Sin cuenta?{' '}
            <Link to="/registro" className="font-semibold text-[#E8A118] hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
