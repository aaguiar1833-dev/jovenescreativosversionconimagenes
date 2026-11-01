/**
 * store.js
 * Persistencia simple en archivos JSON dentro de backend/data/.
 * Suficiente para un proyecto escolar; para producción real se reemplazaría por una base de datos
 * (la interfaz read/write es lo único que usan los servicios, así que el cambio sería local).
 */
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'

function filePath(name) {
  return path.join(config.dataDir, `${name}.json`)
}

export function readCollection(name) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(name), 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] // el archivo todavía no existe o está vacío
  }
}

/** Escribe en un archivo temporal y lo renombra: evita dejar el JSON a medias si algo falla. */
export function writeCollection(name, items) {
  fs.mkdirSync(config.dataDir, { recursive: true })
  const target = filePath(name)
  const temp = `${target}.tmp`
  fs.writeFileSync(temp, JSON.stringify(items, null, 2), 'utf8')
  fs.renameSync(temp, target)
}
