/**
 * RutaSegura — Utilidades de validación y sanitización de inputs.
 *
 * Actúa como primera barrera de defensa en el frontend:
 * - Regex estárictas para correos electrónicos.
 * - Sanitización de textos para bloquear caracteres anómalos
 *   (comillas simples, punto y coma, etc.) que podrían usarse
 *   en ataques de SQL Injection o HTML Injection.
 *
 * NOTA: La protección definitiva contra SQLi se implementa en el backend
 * mediante consultas parametrizadas. Estas funciones son una capa adicional.
 */

// ─── Regex ──────────────────────────────────────────────────────────

/** RFC-5322 simplified — acepta la gran mayoría de correos reales */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Caracteres peligrosos que nunca deberían aparecer en un input de texto */
const DANGEROUS_CHARS = /[';\\<>{}|`]/g;

// ─── Validadores ────────────────────────────────────────────────────

/**
 * Valida un correo electrónico con regex estáricta.
 * @param {string} email
 * @returns {{ valid: boolean, message: string }}
 */
export function validateEmail(email) {
  const trimmed = (email ?? '').trim();
  if (!trimmed) return { valid: false, message: 'El correo es obligatorio.' };
  if (!EMAIL_REGEX.test(trimmed))
    return { valid: false, message: 'Formato de correo inválido.' };
  return { valid: true, message: '' };
}

/**
 * Valida la fortaleza mínima de una contraseña.
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
  if (!password) return { valid: false, message: 'La contraseña es obligatoria.' };
  if (password.length < 8)
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
  if (!/[A-Z]/.test(password))
    return { valid: false, message: 'Debe incluir al menos una letra mayúscula.' };
  if (!/[0-9]/.test(password))
    return { valid: false, message: 'Debe incluir al menos un número.' };
  return { valid: true, message: '' };
}

// ─── Sanitizadores ─────────────────────────────────────────────────

/**
 * Elimina caracteres potencialmente peligrosos de un string de texto.
 * Previene inyecciones SQL a nivel de UI y bloquea meta-caracteres HTML.
 * @param {string} input
 * @returns {string}
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input.replace(DANGEROUS_CHARS, '').trim();
}

/**
 * Construye un objeto JSON seguro a partir de pares clave-valor,
 * sanitizando cada valor de tipo string automáticamente.
 * @param {Record<string, any>} rawData
 * @returns {Record<string, any>}
 */
export function buildSafePayload(rawData) {
  const safe = {};
  for (const [key, value] of Object.entries(rawData)) {
    safe[key] = typeof value === 'string' ? sanitizeText(value) : value;
  }
  return safe;
}
