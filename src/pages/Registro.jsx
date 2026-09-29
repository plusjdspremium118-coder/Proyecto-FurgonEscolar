import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validateEmail, validatePassword } from '../utils/validation';
import { useTransportState } from '../data/useTransportState';

export default function Registro() {
  const navigate = useNavigate();
  const { registerApoderadoWithStudent } = useTransportState();

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    role: 'apoderado',
    studentName: '',
    studentGrade: '4° Básico',
    studentStop: '',
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  }

  function validate() {
    const next = {};
    if (!form.nombre.trim()) next.nombre = 'El nombre del usuario es obligatorio.';
    const emailResult = validateEmail(form.email);
    if (!emailResult.valid) next.email = emailResult.message;
    const passResult = validatePassword(form.password);
    if (!passResult.valid) next.password = passResult.message;

    if (form.role === 'apoderado') {
      if (!form.studentName.trim()) {
        next.studentName = 'El nombre del estudiante es obligatorio.';
      }
      if (!form.studentStop.trim()) {
        next.studentStop = 'La dirección del domicilio o punto de recogida es obligatoria.';
      }
    }

    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerError('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: form.email,
          contrasena: form.password,
          nombre: form.nombre,
          rol: form.role,
          telefono_emergencia: '+56 9 8765 4321',
          studentName: form.studentName || null,
          studentGrade: form.studentGrade || null,
          studentStop: form.studentStop || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Error del servidor (ej: correo ya registrado)
        setServerError(data.detail || 'Error al crear la cuenta. Intenta de nuevo.');
        setLoading(false);
        return;
      }

      // Guardar sesión
      if (data.usuario?.csrf_token) {
        sessionStorage.setItem('rutasegura_csrf_token', data.usuario.csrf_token);
        sessionStorage.setItem('rutasegura_user', JSON.stringify(data.usuario));
      }

    } catch (err) {
      // Backend offline
      setServerError('No se pudo conectar al servidor. Asegúrate de que el backend esté corriendo en http://localhost:8000');
      setLoading(false);
      return;
    }

    // Registro local para estado de UI
    if (form.role === 'apoderado') {
      registerApoderadoWithStudent({
        parentName: form.nombre,
        parentEmail: form.email,
        studentName: form.studentName,
        studentGrade: form.studentGrade,
        studentStop: form.studentStop,
      });
    }

    setLoading(false);
    setSubmitted(true);
    setTimeout(() => {
      if (form.role === 'apoderado') navigate('/apoderado');
      else navigate('/conductor');
    }, 1500);
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
          <h2 className="login-welcome-title">Crear cuenta</h2>
          <p className="login-desc">Regístrate para acceder al servicio</p>
        </div>

        <div className="register-form" style={{ paddingTop: '0' }}>
          {submitted ? (
            <div className="register-success-view">
              <div className="success-badge-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2>¡Cuenta creada!</h2>
              <p className="success-message">
                {form.role === 'apoderado'
                  ? `Estudiante ${form.studentName || 'registrado'} vinculado exitosamente en Supabase. Redirigiendo...`
                  : 'Cuenta registrada en Supabase. Redirigiendo a tu panel...'}
              </p>
              <div className="success-details-card">
                <span><strong>Nombre:</strong> {form.nombre}</span>
                <span><strong>Email:</strong> {form.email}</span>
                <span><strong>Rol:</strong> {form.role === 'apoderado' ? 'Apoderado' : 'Conductor'}</span>
                {form.role === 'apoderado' && (
                  <>
                    <span><strong>Estudiante:</strong> {form.studentName}</span>
                    <span><strong>Curso:</strong> {form.studentGrade}</span>
                    <span><strong>Parada:</strong> {form.studentStop}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>

              {serverError && (
                <div className="login-error-box" style={{ marginBottom: '12px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{serverError}</span>
                </div>
              )}

              <div className="register-role-options" role="radiogroup" aria-label="Seleccionar tipo de cuenta">
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.role === 'apoderado'}
                  onClick={() => setForm((p) => ({ ...p, role: 'apoderado' }))}
                  className={`register-role-option ${form.role === 'apoderado' ? 'active' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>
                    <strong>Apoderado</strong>
                    <small>Monitorear a mi hijo</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.role === 'conductor'}
                  onClick={() => setForm((p) => ({ ...p, role: 'conductor' }))}
                  className={`register-role-option ${form.role === 'conductor' ? 'active' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 19h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
                    <circle cx="10" cy="19" r="1.5" fill="currentColor" />
                    <circle cx="14" cy="19" r="1.5" fill="currentColor" />
                    <path d="M10 5v4M14 5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>
                    <strong>Conductor</strong>
                    <small>Gestionar mi ruta</small>
                  </span>
                </button>
              </div>

              <div className="input-group">
                <label htmlFor="reg-nombre">{form.role === 'apoderado' ? 'Nombre completo del apoderado' : 'Nombre completo'}</label>
                <input
                  type="text"
                  name="nombre"
                  id="reg-nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder={form.role === 'apoderado' ? 'Ej. Sofía Reyes' : 'Ej. Carlos Pérez'}
                  className={errors.nombre ? 'input-error' : ''}
                  autoComplete="name"
                />
                {errors.nombre && <p className="error-text">{errors.nombre}</p>}
              </div>

              <div className="input-group">
                <label htmlFor="reg-email">Correo electrónico</label>
                <input
                  type="email"
                  name="email"
                  id="reg-email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.cl"
                  className={errors.email ? 'input-error' : ''}
                  autoComplete="email"
                />
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>

              <div className="input-group">
                <label htmlFor="reg-password">Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="reg-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mínimo 8 caracteres"
                    className={errors.password ? 'input-error' : ''}
                    autoComplete="new-password"
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

              {form.role === 'apoderado' && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #edf1e6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'spaceBetween', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }} />
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Datos del Escolar / Pupilo
                      </label>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--green-deep)', background: 'var(--green-soft)', border: '1px solid #c2e2a8', padding: '2px 8px', borderRadius: '999px' }}>
                      Furgón Los Robles
                    </span>
                  </div>

                  <div className="input-group">
                    <label htmlFor="reg-student-name">Nombre completo del estudiante</label>
                    <input
                      type="text"
                      name="studentName"
                      id="reg-student-name"
                      value={form.studentName}
                      onChange={handleChange}
                      placeholder="Ej. Martín Reyes"
                      className={errors.studentName ? 'input-error' : ''}
                    />
                    {errors.studentName && <p className="error-text">{errors.studentName}</p>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="reg-student-grade">Curso o Grado</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        name="studentGrade"
                        id="reg-student-grade"
                        value={form.studentGrade}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '12px 40px 12px 14px', border: '1.5px solid #d4dccb', borderRadius: 'var(--radius-sm)', fontSize: '14px', fontFamily: 'inherit', background: '#fafbf8', color: 'var(--ink)', appearance: 'none', cursor: 'pointer' }}
                      >
                        <option value="1° Básico">1° Básico</option>
                        <option value="2° Básico">2° Básico</option>
                        <option value="3° Básico">3° Básico</option>
                        <option value="4° Básico">4° Básico</option>
                        <option value="5° Básico">5° Básico</option>
                        <option value="6° Básico">6° Básico</option>
                        <option value="7° Básico">7° Básico</option>
                        <option value="8° Básico">8° Básico</option>
                        <option value="1° Medio">1° Medio</option>
                        <option value="2° Medio">2° Medio</option>
                      </select>
                      <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="reg-student-stop">Dirección de recogida / Domicilio</label>
                    <input
                      type="text"
                      name="studentStop"
                      id="reg-student-stop"
                      value={form.studentStop}
                      onChange={handleChange}
                      placeholder="Ej. Av. Providencia 1345, Dpto 402"
                      className={errors.studentStop ? 'input-error' : ''}
                    />
                    {errors.studentStop && <p className="error-text">{errors.studentStop}</p>}
                  </div>
                </div>
              )}

              <button
                type="submit"
                id="btn-register-submit"
                className="register-submit-btn"
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Registrando en Supabase...' : 'Crear cuenta'}
              </button>
            </form>
          )}

          <div className="login-footer-links">
            <p className="no-account-text">¿Ya tienes cuenta?</p>
            <Link to="/login" className="register-link-btn">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
