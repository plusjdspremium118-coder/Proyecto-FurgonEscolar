import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validateEmail } from '../utils/validation';
import { useTransportState } from '../data/useTransportState';

export default function Login() {
  const navigate = useNavigate();
  const { recordLoginAttempt, unlockAccount } = useTransportState();

  const [role, setRole] = useState('apoderado');
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (isLocked) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: form.email, contrasena: form.password, rol: role })
      });

      const data = await response.json();

      if (response.ok && data.status === 'ok') {
        recordLoginAttempt(true);
        setLoading(false);
        if (data.usuario?.csrf_token) {
          sessionStorage.setItem('rutasegura_csrf_token', data.usuario.csrf_token);
          sessionStorage.setItem('rutasegura_user', JSON.stringify(data.usuario));
        }
        if (role === 'apoderado') navigate('/apoderado');
        else navigate('/conductor');
        return;
      } else {
        throw new Error(data.detail || 'Credenciales incorrectas.');
      }
    } catch (err) {
      setLoading(false);
      const nextFailed = failedCount + 1;
      setFailedCount(nextFailed);
      recordLoginAttempt(false);
      if (nextFailed >= 3) {
        setIsLocked(true);
        setLockSecondsRemaining(60);
        setErrors({ general: 'Cuenta bloqueada tras 3 intentos fallidos consecutivos.' });
      } else {
        setErrors({ password: `${err.message} Intento ${nextFailed} de 3.` });
      }
    }
  }

  function handleQuickUnlock() {
    setIsLocked(false);
    setFailedCount(0);
    setLockSecondsRemaining(0);
    unlockAccount();
    setErrors({});
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-badge-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 19h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
              <circle cx="9" cy="19" r="1.5" fill="currentColor" />
              <circle cx="15" cy="19" r="1.5" fill="currentColor" />
              <path d="M9 5v4M15 5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="login-brand-title">RutaSegura</h1>
          <span className="login-badge-subtitle">Transporte escolar</span>
          <h2 className="login-welcome-title">Bienvenido de nuevo</h2>
          <p className="login-desc">Inicia sesión para continuar</p>
        </div>

        <div className="login-form">
          {isLocked && (
            <div className="login-error-box" style={{ background: '#fdf0ee', border: '1px solid #f8cbc6', color: '#b73227' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Cuenta bloqueada por seguridad. Espera {lockSecondsRemaining}s para continuar.</span>
              <button
                type="button"
                onClick={handleQuickUnlock}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b73227', fontWeight: 700, fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Desbloquear ahora
              </button>
            </div>
          )}

          {errors.general && !isLocked && (
            <div className="login-error-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errors.general}</span>
            </div>
          )}

          <div className="login-role-selector" role="radiogroup" aria-label="Seleccionar rol">
            <button
              type="button"
              role="radio"
              aria-checked={role === 'apoderado'}
              id="role-apoderado-tab"
              onClick={() => handleRoleSwitch('apoderado')}
              className={`role-tab-btn ${role === 'apoderado' ? 'active' : ''}`}
            >
              <span className="role-icon">👨‍👩‍👧</span>
              <span className="role-btn-text">
                <strong>Apoderado</strong>
                <small>Padre / Madre / Tutor</small>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === 'conductor'}
              id="role-conductor-tab"
              onClick={() => handleRoleSwitch('conductor')}
              className={`role-tab-btn ${role === 'conductor' ? 'active' : ''}`}
            >
              <span className="role-icon">🚌</span>
              <span className="role-btn-text">
                <strong>Conductor</strong>
                <small>Chofer del furgón</small>
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label htmlFor="login-email">Correo electrónico</label>
              <input
                type="email"
                name="email"
                id="login-email"
                disabled={isLocked}
                value={form.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.cl"
                className={errors.email ? 'input-error' : ''}
                autoComplete="email"
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="login-password"
                  disabled={isLocked}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={errors.password ? 'input-error' : ''}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-4.47 0-8.26-2.94-9.54-7a9.97 9.97 0 0 1 1.56-3.03m5.86.91a3 3 0 1 1 4.24 4.24M9.88 9.88l4.24 4.24M9.88 9.88l-3.29-3.29m7.53 7.53l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password}</p>}
            </div>

            {failedCount > 0 && !isLocked && (
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#946900', background: '#fff7d6', border: '1px solid #f6df8d', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                Intentos fallidos: {failedCount}/3. Al tercer intento se bloqueará la cuenta.
              </p>
            )}

            <button
              type="submit"
              id="btn-login-submit"
              disabled={loading || isLocked}
              className="login-submit-btn"
            >
              {loading ? 'Verificando en Supabase...' : `Ingresar como ${role === 'apoderado' ? 'Apoderado' : 'Conductor'}`}
            </button>
          </form>

          <div className="login-footer-links">
            <p className="no-account-text">¿Sin cuenta?</p>
            <Link to="/registro" className="register-link-btn">Regístrate aquí</Link>
          </div>

          <div className="login-security-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Tu información está protegida con encriptación de extremo a extremo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
