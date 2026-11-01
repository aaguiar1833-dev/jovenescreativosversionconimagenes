/**
 * http.js
 * Utilidades mínimas para trabajar con el módulo http de Node sin frameworks.
 */

/** Error con código HTTP: los handlers lo lanzan y el servidor lo convierte en respuesta JSON. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers
  })
  res.end(body)
}

/** Lee el cuerpo de la petición como JSON, con un tope de tamaño para evitar abusos. */
export function readJson(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limitBytes) {
        reject(new HttpError(413, 'El mensaje es demasiado grande.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        resolve(parsed && typeof parsed === 'object' ? parsed : {})
      } catch {
        reject(new HttpError(400, 'El cuerpo de la petición no es un JSON válido.'))
      }
    })
    req.on('error', reject)
  })
}

/** IP del cliente (solo confía en X-Forwarded-For si TRUST_PROXY=true). */
export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    if (forwarded) return forwarded
  }
  return req.socket.remoteAddress || 'desconocida'
}
