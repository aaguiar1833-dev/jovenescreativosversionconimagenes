/**
 * auth.js
 * Login del administrador con contraseña hasheada (scrypt) y sesiones por token firmado (HMAC-SHA256).
 * No hay librerías externas: solo el módulo crypto de Node.
 */
import crypto from 'node:crypto'
import { config } from '../config.js'
import { HttpError } from './http.js'

const salt = crypto.randomBytes(16)
const adminHash = crypto.scryptSync(config.adminPassword, salt, 64)

/** Compara dos textos en tiempo constante (hasheándolos antes para igualar el largo). */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

export function checkCredentials(user, password) {
  const candidate = crypto.scryptSync(String(password), salt, 64)
  const passwordOk = crypto.timingSafeEqual(candidate, adminHash)
  const userOk = safeEqual(user, config.adminUser)
  return passwordOk && userOk
}

const b64 = (value) => Buffer.from(value).toString('base64url')

export function signToken(payload) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + config.tokenTtlMs }))
  const signature = crypto.createHmac('sha256', config.tokenSecret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [body, signature] = token.split('.')
  const expected = crypto.createHmac('sha256', config.tokenSecret).update(body).digest('base64url')
  if (!safeEqual(signature, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
}

/** Exige un token válido en el encabezado Authorization: Bearer <token>. */
export function requireAuth(req) {
  const header = String(req.headers.authorization || '')
  const payload = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : '')
  if (!payload) throw new HttpError(401, 'Tu sesión expiró o no tenés permiso. Iniciá sesión de nuevo.')
  return payload
}
