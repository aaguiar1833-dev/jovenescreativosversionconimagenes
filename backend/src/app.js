/**
 * app.js
 * Crea el servidor HTTP: CORS, enrutado de la API, archivos estáticos del frontend y manejo de errores.
 * Se separa de server.js para poder levantarlo en los tests con un puerto aleatorio.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config.js'
import { HttpError, sendJson, readJson, clientIp } from './lib/http.js'
import { routes } from './routes/index.js'

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
}

/** Convierte '/api/news/:id' en una expresión regular que captura los parámetros. */
const compiled = routes.map(([method, pattern, handler]) => {
  const names = []
  const source = pattern.replace(/:([a-zA-Z]+)/g, (_, name) => { names.push(name); return '([^/]+)' })
  return { method, regex: new RegExp(`^${source}$`), names, handler }
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': config.corsOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600'
  }
}

/** Sirve un archivo de frontend/. Protege contra rutas tipo ../../etc/passwd. */
function serveStatic(req, res, pathname) {
  const relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname)
  const target = path.normalize(path.join(config.frontendDir, relative))
  if (!target.startsWith(config.frontendDir + path.sep) && target !== config.frontendDir) {
    throw new HttpError(403, 'Acceso denegado.')
  }
  let file = target
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) throw new HttpError(404, 'Recurso no encontrado.')

  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff'
  })
  fs.createReadStream(file).pipe(res)
}

export function createApp() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const pathname = url.pathname

    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders())
        return res.end()
      }

      if (pathname.startsWith('/api/')) {
        Object.entries(corsHeaders()).forEach(([key, value]) => res.setHeader(key, value))

        const match = compiled.find((route) => route.method === req.method && route.regex.test(pathname))
        if (!match) {
          // Distingue "ruta inexistente" de "método no permitido".
          const knownPath = compiled.some((route) => route.regex.test(pathname))
          throw new HttpError(knownPath ? 405 : 404, knownPath ? 'Método no permitido.' : 'Recurso no encontrado.')
        }

        const values = match.regex.exec(pathname).slice(1).map(decodeURIComponent)
        const params = Object.fromEntries(match.names.map((name, i) => [name, values[i]]))
        const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readJson(req) : {}
        const { status, data } = match.handler({ req, params, body, ip: clientIp(req, config.trustProxy) })
        return sendJson(res, status, data)
      }

      if (config.serveFrontend && (req.method === 'GET' || req.method === 'HEAD')) {
        return serveStatic(req, res, pathname)
      }
      throw new HttpError(404, 'Recurso no encontrado.')
    } catch (error) {
      if (res.headersSent) return res.end()
      if (error instanceof HttpError) {
        return pathname.startsWith('/api/')
          ? sendJson(res, error.status, { message: error.message })
          : (res.writeHead(error.status, { 'Content-Type': 'text/plain; charset=utf-8' }), res.end(error.message))
      }
      console.error('[error]', error)
      return sendJson(res, 500, { message: 'Ocurrió un error interno. Intentá de nuevo en unos minutos.' })
    }
  })
}
