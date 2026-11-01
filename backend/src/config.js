/**
 * config.js
 * Lee la configuración desde variables de entorno (y desde backend/.env si existe).
 * Todo el resto del backend importa los valores desde acá, así hay un único lugar donde mirar.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const BACKEND_DIR = path.resolve(here, '..')

/** Carga un archivo .env sencillo (CLAVE=valor). No pisa variables que ya existan. */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i)
    if (!match || line.trim().startsWith('#')) continue
    const [, key, raw] = match
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^["']|["']$/g, '')
  }
}

loadEnvFile(path.join(BACKEND_DIR, '.env'))

const DEFAULT_PASSWORD = 'JovenesCreativos2026'

export const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  trustProxy: process.env.TRUST_PROXY === 'true',

  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD,
  usingDefaultPassword: !process.env.ADMIN_PASSWORD,

  // Si no hay secreto configurado se genera uno aleatorio: las sesiones valen hasta el próximo reinicio.
  tokenSecret: process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex'),
  tokenTtlMs: 2 * 60 * 60 * 1000, // 2 horas

  dataDir: process.env.DATA_DIR || path.join(BACKEND_DIR, 'data'),
  frontendDir: path.resolve(BACKEND_DIR, '..', 'frontend'),
  serveFrontend: process.env.SERVE_FRONTEND !== 'false'
}
