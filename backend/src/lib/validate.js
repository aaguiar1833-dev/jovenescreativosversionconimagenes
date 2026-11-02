
import { HttpError } from './http.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function text(value, label, { min = 1, max = 500, required = true } = {}) {
  const clean = typeof value === 'string' ? value.trim() : ''
  if (!clean && !required) return ''
  if (clean.length < min) {
    throw new HttpError(400, min <= 1 ? `Completá el campo «${label}».` : `«${label}» debe tener al menos ${min} caracteres.`)
  }
  if (clean.length > max) throw new HttpError(400, `«${label}» no puede superar los ${max} caracteres.`)
  return clean
}

export function email(value) {
  const clean = text(value, 'Correo electrónico', { max: 160 })
  if (!EMAIL.test(clean)) throw new HttpError(400, 'El correo electrónico no parece válido.')
  return clean
}
