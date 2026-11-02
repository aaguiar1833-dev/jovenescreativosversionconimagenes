
import crypto from 'node:crypto'
import { baseNews, brand } from '../data/news.js'
import { readCollection, writeCollection } from '../lib/store.js'
import { HttpError } from '../lib/http.js'
import { text } from '../lib/validate.js'

const COLLECTION = 'news'

export const listAdminNews = () => readCollection(COLLECTION)
export const listAllNews = () => [...baseNews, ...listAdminNews()]

export function getNews(id) {
  const item = listAllNews().find((entry) => entry.id === id)
  if (!item) throw new HttpError(404, 'No encontramos esa noticia.')
  return item
}

export function createNews(input) {
  const cat = brand.categories.includes(input.cat) ? input.cat : null
  if (!cat) throw new HttpError(400, `La categoría debe ser: ${brand.categories.join(' o ')}.`)

  const titulo = text(input.titulo, 'Título', { min: 3, max: 120 })
  const resumen = text(input.resumen, 'Resumen', { min: 10, max: 400 })
  const cuerpo = text(input.cuerpo, 'Cuerpo de la noticia', { min: 20, max: 8000 })
  const imagen = text(input.imagen, 'Imagen', { max: 200, required: false })

  const etiquetas = (Array.isArray(input.claves) ? input.claves : String(input.etiquetas || '').split(','))
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 20)

  const record = {
    id: `admin-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    cat,
    titulo,
    corto: resumen,
    resumen,
    cuerpo,
    imagen,
    claves: [...etiquetas, titulo.toLowerCase(), cat.toLowerCase()],
    creada: new Date().toISOString()
  }

  writeCollection(COLLECTION, [...listAdminNews(), record])
  return record
}

export function removeNews(id) {
  if (baseNews.some((item) => item.id === id)) {
    throw new HttpError(403, 'Las noticias originales del portal no se pueden borrar.')
  }
  const current = listAdminNews()
  if (!current.some((item) => item.id === id)) throw new HttpError(404, 'No encontramos esa noticia.')
  writeCollection(COLLECTION, current.filter((item) => item.id !== id))
}
