
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'jc-test-'))
process.env.ADMIN_USER = 'admin'
process.env.ADMIN_PASSWORD = 'clave-de-prueba'
process.env.TOKEN_SECRET = 'secreto-de-prueba'

const { createApp } = await import('../src/app.js')
const { resetRateLimits } = await import('../src/lib/rateLimit.js')

let server, base, token

const api = (route, { method = 'GET', body, auth } = {}) =>
  fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })

before(async () => {
  server = createApp()
  await new Promise((resolve) => server.listen(0, resolve))
  base = `http://localhost:${server.address().port}`
})
after(() => server.close())

test('health responde ok', async () => {
  const res = await api('/api/health')
  assert.equal(res.status, 200)
  assert.equal((await res.json()).ok, true)
})

test('login: rechaza credenciales incorrectas y acepta las correctas', async () => {
  resetRateLimits()
  const bad = await api('/api/auth/login', { method: 'POST', body: { usuario: 'admin', clave: 'mala' } })
  assert.equal(bad.status, 401)
  const good = await api('/api/auth/login', { method: 'POST', body: { usuario: 'admin', clave: 'clave-de-prueba' } })
  assert.equal(good.status, 200)
  token = (await good.json()).token
  assert.ok(token)
})

test('login: limita los intentos repetidos', async () => {
  resetRateLimits()
  let last
  for (let i = 0; i < 8; i++) last = await api('/api/auth/login', { method: 'POST', body: { usuario: 'x', clave: 'y' } })
  assert.equal(last.status, 429)
  resetRateLimits()
})

test('rutas privadas exigen sesión', async () => {
  assert.equal((await api('/api/stats')).status, 401)
  assert.equal((await api('/api/contact')).status, 401)
  assert.equal((await api('/api/news', { method: 'POST', body: {} })).status, 401)
  assert.equal((await api('/api/stats', { auth: 'token.falso' })).status, 401)
})

test('noticias: lista las 10 base y permite crear y borrar con sesión', async () => {
  const list = await (await api('/api/news')).json()
  assert.equal(list.length, 10)

  const invalid = await api('/api/news', { method: 'POST', auth: token, body: { cat: 'Cultura', titulo: 'x' } })
  assert.equal(invalid.status, 400)

  const created = await api('/api/news', {
    method: 'POST', auth: token,
    body: { cat: 'Tecnología', titulo: 'Energía solar flotante', resumen: 'Paneles sobre embalses que ahorran agua.', cuerpo: 'Primer párrafo de la nota.\nSegundo párrafo de la nota.', etiquetas: 'solar, energía' }
  })
  assert.equal(created.status, 201)
  const nota = await created.json()
  assert.ok(nota.claves.includes('solar'))

  assert.equal((await (await api('/api/news')).json()).length, 11)
  assert.equal((await api(`/api/news/${nota.id}`)).status, 200)
  assert.equal((await api(`/api/news/${nota.id}`, { method: 'DELETE', auth: token })).status, 200)
  assert.equal((await api('/api/news/n1', { method: 'DELETE', auth: token })).status, 403)
})

test('contacto: valida, guarda y el admin lo puede leer', async () => {
  resetRateLimits()
  const sinAceptar = await api('/api/contact', { method: 'POST', body: { nombre: 'Ana', email: 'ana@correo.com', mensaje: 'Hola equipo' } })
  assert.equal(sinAceptar.status, 400)

  const mailMalo = await api('/api/contact', { method: 'POST', body: { nombre: 'Ana', email: 'no-es-mail', mensaje: 'Hola equipo', acepto: true } })
  assert.equal(mailMalo.status, 400)

  const ok = await api('/api/contact', { method: 'POST', body: { nombre: 'Ana', email: 'ana@correo.com', asunto: 'Consulta general', mensaje: 'Hola equipo, los felicito', acepto: true } })
  assert.equal(ok.status, 201)

  const mensajes = await (await api('/api/contact', { auth: token })).json()
  assert.equal(mensajes.length, 1)
  assert.equal(mensajes[0].email, 'ana@correo.com')

  const stats = await (await api('/api/stats', { auth: token })).json()
  assert.equal(stats.mensajes, 1)
  assert.equal((await api(`/api/contact/${mensajes[0].id}`, { method: 'DELETE', auth: token })).status, 200)
})

test('contacto: el campo trampa descarta a los bots sin guardar', async () => {
  resetRateLimits()
  const res = await api('/api/contact', { method: 'POST', body: { nombre: 'Bot', email: 'b@b.com', mensaje: 'spam spam', acepto: true, web: 'http://spam' } })
  assert.equal(res.status, 201)
  assert.equal((await (await api('/api/contact', { auth: token })).json()).length, 0)
})

test('asistente: busca, recomienda, da contacto y maneja entradas vacías', async () => {
  const ask = async (pregunta) => (await api('/api/chat', { method: 'POST', body: { pregunta } })).json()

  const sodio = await ask('baterías de sodio')
  assert.equal(sodio.results[0].id, 'n2')

  const rada = await ask('¿hay algo sobre Rada?')
  assert.equal(rada.results[0].id, 'n10')

  const ia = await ask('IA')
  assert.equal(ia.results[0].id, 'n4')

  assert.equal((await ask('Toda cultura')).results.every((r) => r.cat === 'Cultura'), true)
  assert.match((await ask('¿Cuál es el teléfono?')).reply, /24860226/)
  assert.ok((await ask('Recomendame algo')).results.length >= 1)
  assert.equal((await ask('hola')).intent, 'saludo')
  assert.equal((await ask('zzzxqw')).results.length, 0)

  assert.equal((await api('/api/chat', { method: 'POST', body: { pregunta: '   ' } })).status, 400)
})

test('generador: crea textos en los tres formatos y rechaza datos inválidos', async () => {
  for (const formato of ['redes', 'titulares', 'newsletter']) {
    const res = await api('/api/generate', { method: 'POST', body: { noticiaId: 'n10', formato } })
    assert.equal(res.status, 200)
    assert.ok((await res.json()).texto.includes('Rada'))
  }
  assert.equal((await api('/api/generate', { method: 'POST', body: { noticiaId: 'n10', formato: 'otro' } })).status, 400)
  assert.equal((await api('/api/generate', { method: 'POST', body: { noticiaId: 'nope', formato: 'redes' } })).status, 404)
})

test('errores: JSON roto, ruta inexistente, método incorrecto y rutas fuera de frontend/', async () => {
  const roto = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{no es json' })
  assert.equal(roto.status, 400)
  assert.equal((await api('/api/nada')).status, 404)
  assert.equal((await api('/api/health', { method: 'DELETE' })).status, 405)
  const traversal = await fetch(base + '/..%2f..%2fbackend%2fpackage.json')
  assert.ok([403, 404].includes(traversal.status))
})

test('el sitio se sirve desde el mismo servidor', async () => {
  const res = await fetch(base + '/')
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/html/)
})
