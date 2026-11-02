
import crypto from 'node:crypto'
import { readCollection, writeCollection } from '../lib/store.js'
import { HttpError } from '../lib/http.js'
import { text, email } from '../lib/validate.js'

const COLLECTION = 'messages'

export const listMessages = () => readCollection(COLLECTION).sort((a, b) => b.recibido.localeCompare(a.recibido))
export const countMessages = () => readCollection(COLLECTION).length

export function saveMessage(input) {
  if (input.web) return { id: 'ignorado', ignorado: true }

  if (input.acepto !== true) {
    throw new HttpError(400, 'Tenés que aceptar el uso de tus datos para poder enviar la consulta.')
  }

  const record = {
    id: `msg-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    nombre: text(input.nombre, 'Nombre y apellido', { min: 2, max: 100 }),
    email: email(input.email),
    asunto: text(input.asunto, 'Asunto', { max: 120, required: false }) || 'Consulta general',
    mensaje: text(input.mensaje, 'Mensaje', { min: 5, max: 3000 }),
    recibido: new Date().toISOString()
  }

  writeCollection(COLLECTION, [...readCollection(COLLECTION), record])
  return record
}

export function removeMessage(id) {
  const current = readCollection(COLLECTION)
  if (!current.some((item) => item.id === id)) throw new HttpError(404, 'No encontramos ese mensaje.')
  writeCollection(COLLECTION, current.filter((item) => item.id !== id))
}
