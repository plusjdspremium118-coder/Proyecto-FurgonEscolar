import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validateEmail, validatePassword, buildSafePayload } from '../utils/validation';
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
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
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

  function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (form.role === 'apoderado') {
      registerApoderadoWithStudent({
        parentName: form.nombre,
        parentEmail: form.email,
        studentName: form.studentName,
        studentGrade: form.studentGrade,
        studentStop: form.studentStop,
      });
    }

    const payload = buildSafePayload(form);
    console.log('Registro exitoso:', payload);
    setSubmitted(true);
    setTimeout(() => {
      if (form.role === 'apoderado') navigate('/apoderado');
      else navigate('/conductor');
    }, 1200);
  }

  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center px-4 py-8 sm:py-12 overflow-x-hidden">
      {/* Imagen de fondo temática de transporte escolar */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat fixed transform scale-105"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* Capa de superposición con gradiente suave para garantizar perfecta legibilidad y contraste */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/70 via-[#0F172A]/50 to-[#0F172A]/75 backdrop-blur-[2px]" />

      {/* Tarjeta principal de registro con efecto glassmorphism */}
      <div className="relative z-10 w-full max-w-[460px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/60 overflow-hidden my-auto">

        {/* Cabecera */}
        <div className="px-6 sm:px-8 pt-8 sm:pt-9 pb-6 border-b border-[#E2E8F0]/80">
          <div className="flex items-center gap-3.5">
            <img
              src="/app-icon.png"
              alt="RutaSegura"
              className="w-13 h-13 rounded-2xl shadow-md border border-[#FDE68A] shrink-0 object-cover"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                Crear cuenta
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-[#64748B]">
                RutaSegura · Registro de nuevo usuario
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 sm:py-7">
          {submitted ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#0F172A]">Cuenta creada correctamente</p>
              <p className="text-xs text-[#64748B]">
                {form.role === 'apoderado'
                  ? `Estudiante ${form.studentName || 'registrado'} vinculado exitosamente. Redirigiendo...`
                  : 'Redirigiendo a tu panel...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Selector de tipo de cuenta */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  Tipo de cuenta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, role: 'apoderado' }))}
                    className={`min-h-[64px] py-2.5 px-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-center ${
                      form.role === 'apoderado'
                        ? 'bg-[#FFFBEB] border-2 border-[#D97706] text-[#92400E] shadow-xs'
                        : 'bg-white/80 border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="block text-sm font-bold truncate">Apoderado</span>
                    <span className="block text-xs text-[#94A3B8] font-semibold truncate mt-0.5">Monitorear a mi hijo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, role: 'conductor' }))}
                    className={`min-h-[64px] py-2.5 px-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-center ${
                      form.role === 'conductor'
                        ? 'bg-[#FFFBEB] border-2 border-[#D97706] text-[#92400E] shadow-xs'
                        : 'bg-white/80 border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="block text-sm font-bold truncate">Conductor</span>
                    <span className="block text-xs text-[#94A3B8] font-semibold truncate mt-0.5">Gestionar mi ruta</span>
                  </button>
                </div>
              </div>

              {/* Nombre del apoderado/conductor */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#334155]">
                  {form.role === 'apoderado' ? 'Nombre completo del apoderado' : 'Nombre completo'}
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder={form.role === 'apoderado' ? 'Ej. Sofía Reyes' : 'Ej. Carlos Pérez'}
                  className="w-full px-4 py-3 rounded-xl text-sm text-[#0F172A] bg-white border-2 border-[#E2E8F0] focus:border-[#E8A118] focus:outline-none transition-all placeholder:text-[#CBD5E1]"
                />
                {errors.nombre && (
                  <p className="text-xs text-[#DC2626]">{errors.nombre}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#334155]">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.cl"
                  className="w-full px-4 py-3 rounded-xl text-sm text-[#0F172A] bg-white border-2 border-[#E2E8F0] focus:border-[#E8A118] focus:outline-none transition-all placeholder:text-[#CBD5E1]"
                />
                {errors.email && (
                  <p className="text-xs text-[#DC2626]">{errors.email}</p>
                )}
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#334155]">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full pl-4 pr-11 py-3 rounded-xl text-sm text-[#0F172A] bg-white border-2 border-[#E2E8F0] focus:border-[#E8A118] focus:outline-none transition-all placeholder:text-[#CBD5E1]"
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
                  <p className="text-xs text-[#DC2626]">{errors.password}</p>
                )}
              </div>

              {/* ─── Sección Alumno (Exclusiva para apoderados: Opción 1) ─── */}
              {form.role === 'apoderado' && (
                <div className="pt-3 border-t border-[#F1F5F9] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#E8A118]" />
                      <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                        Datos del Escolar / Pupilo
                      </label>
                    </div>
                    <span className="text-[10px] font-bold text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-md">
                      Furgón Los Robles
                    </span>
                  </div>

                  {/* Nombre del alumno */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#334155]">
                      Nombre completo del estudiante
                    </label>
                    <input
                      type="text"
                      name="studentName"
                      id="input-student-name"
                      value={form.studentName}
                      onChange={handleChange}
                      placeholder="Ej. Martín Reyes"
                      className="w-full px-4 py-3 rounded-xl text-sm text-[#0F172A] bg-white border-2 border-[#E2E8F0] focus:border-[#E8A118] focus:outline-none transition-all placeholder:text-[#CBD5E1]"
                    />
                    {errors.studentName && (
                      <p className="text-xs text-[#DC2626]">{errors.studentName}</p>
                    )}
                  </div>

                  {/* Curso o Grado */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#334155]">
                      Curso o Grado
                    </label>
                    <div className="relative">
                      <select
                        name="studentGrade"
                        id="select-student-grade"
                        value={form.studentGrade}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium text-[#0F172A] bg-white border-2 border-[#E2E8F0] focus:border-[#E8A118] focus:outline-none transition-all appearance-none cursor-pointer"
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
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#64748B]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Dirección de recogida / Domicilio manual */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#334155]">
                      Dirección de recogida / Domicilio
                    </label>
                    <input
                      type="text"
                      name="studentStop"
                      id="input-student-stop"
                      value={form.studentStop}
                      onChange={handleChange}
                      placeholder="Ej. Av. Providencia 1345, Dpto 402"
                      className="w-full px-4 py-3 rounded-xl text-sm text-[#0F172A] bg-white border-2 border-[#E2E8F0] focus:border-[#E8A118] focus:outline-none transition-all placeholder:text-[#CBD5E1]"
                    />
                    {errors.studentStop && (
                      <p className="text-xs text-[#DC2626]">{errors.studentStop}</p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                id="btn-register-submit"
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer mt-2 bg-gradient-to-r from-[#D97706] to-[#E8A118] hover:from-[#B45309] hover:to-[#D97706] shadow-md active:scale-95"
              >
                Crear cuenta
              </button>
            </form>
          )}
        </div>

        {/* Pie */}
        <div className="px-8 py-5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <p className="text-xs text-center text-[#94A3B8]">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-[#E8A118] hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
