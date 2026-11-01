/**
 * rateLimit.js
 * Limitador de intentos en memoria (por IP y por "clave" lógica, p. ej. "login" o "contacto").
 */
import { HttpError } from './http.js'

const buckets = new Map()

export function rateLimit(ip, key, max, windowMs, message) {
  const now = Date.now()
  const id = `${key}:${ip}`
  const bucket = buckets.get(id)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs })
  } else if (++bucket.count > max) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000)
    throw new HttpError(429, `${message} Probá de nuevo en ${seconds} s.`)
  }

  // Limpieza ocasional para que el mapa no crezca sin límite.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
  }
}

/** Solo para los tests. */
export function resetRateLimits() {
  buckets.clear()
}
