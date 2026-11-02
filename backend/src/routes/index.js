
import { config } from '../config.js'
import { HttpError } from '../lib/http.js'
import { checkCredentials, signToken, requireAuth } from '../lib/auth.js'
import { rateLimit } from '../lib/rateLimit.js'
import { brand } from '../data/news.js'
import { listAllNews, getNews, createNews, removeNews } from '../services/newsService.js'
import { saveMessage, listMessages, removeMessage, countMessages } from '../services/contactService.js'
import { answerQuestion } from '../services/assistant.js'
import { generateText } from '../services/generator.js'

const ok = (data, status = 200) => ({ status, data })

export const routes = [
  ['GET', '/api/health', () => ok({ ok: true, servicio: 'jovenes-creativos-api', modo: 'servidor' })],

  ['POST', '/api/auth/login', ({ body, ip }) => {
    rateLimit(ip, 'login', 6, 60_000, 'Demasiados intentos de ingreso.')
    if (!checkCredentials(body.usuario, body.clave)) {
      throw new HttpError(401, 'Usuario o contraseña incorrectos.')
    }
    return ok({ token: signToken({ usuario: config.adminUser }), usuario: config.adminUser, expiraEnMin: config.tokenTtlMs / 60000 })
  }],
  ['GET', '/api/auth/me', ({ req }) => ok({ usuario: requireAuth(req).usuario })],

  ['GET', '/api/news', () => ok(listAllNews())],
  ['GET', '/api/news/:id', ({ params }) => ok(getNews(params.id))],
  ['POST', '/api/news', ({ req, body }) => { requireAuth(req); return ok(createNews(body), 201) }],
  ['DELETE', '/api/news/:id', ({ req, params }) => { requireAuth(req); removeNews(params.id); return ok({ ok: true }) }],

  ['POST', '/api/contact', ({ body, ip }) => {
    rateLimit(ip, 'contacto', 5, 10 * 60_000, 'Enviaste varios mensajes seguidos.')
    const record = saveMessage(body)
    return ok({ ok: true, id: record.id, mensaje: `¡Gracias, ${String(body.nombre || '').trim()}! Recibimos tu mensaje y te vamos a responder a ${String(body.email || '').trim()} a la brevedad.` }, 201)
  }],
  ['GET', '/api/contact', ({ req }) => { requireAuth(req); return ok(listMessages()) }],
  ['DELETE', '/api/contact/:id', ({ req, params }) => { requireAuth(req); removeMessage(params.id); return ok({ ok: true }) }],

  ['POST', '/api/chat', ({ body, ip }) => {
    rateLimit(ip, 'chat', 40, 60_000, 'Estás preguntando muy rápido.')
    const question = typeof body.pregunta === 'string' ? body.pregunta.trim() : ''
    if (!question) throw new HttpError(400, 'Escribí una pregunta para que pueda ayudarte.')
    if (question.length > 300) throw new HttpError(400, 'La pregunta es muy larga: probá con menos de 300 caracteres.')
    return ok(answerQuestion(question))
  }],
  ['POST', '/api/generate', ({ body, ip }) => {
    rateLimit(ip, 'generate', 30, 60_000, 'Estás generando textos muy rápido.')
    return ok(generateText(String(body.noticiaId || ''), String(body.formato || '')))
  }],

  ['GET', '/api/stats', ({ req }) => {
    requireAuth(req)
    const all = listAllNews()
    return ok({
      noticias: all.length,
      tecnologia: all.filter((n) => n.cat === 'Tecnología').length,
      cultura: all.filter((n) => n.cat === 'Cultura').length,
      mensajes: countMessages(),
      categorias: brand.categories
    })
  }]
]
