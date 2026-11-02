
import { brand } from '../data/news.js'
import { listAllNews } from './newsService.js'

const STOPWORDS = new Set([
  'que', 'cual', 'cuales', 'como', 'donde', 'cuando', 'por', 'para', 'con', 'los', 'las', 'del', 'una', 'uno',
  'unos', 'unas', 'sobre', 'hay', 'noticias', 'noticia', 'notas', 'nota', 'dice', 'dime', 'busca', 'buscar',
  'muestra', 'mostrar', 'quiero', 'saber', 'es', 'son', 'el', 'la', 'en', 'de', 'y', 'o', 'a', 'un', 'me',
  'toda', 'todo', 'todas', 'todos', 'algo', 'tema', 'temas', 'tenes', 'tienen', 'podes', 'puedes'
])

export const normalize = (value) =>
  String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

export function extractTerms(question) {
  return normalize(question)
    .replace(/[¿?¡!.,;:()"'«»]/g, ' ')
    .split(' ')
    .filter((term) => term.length >= 2 && !STOPWORDS.has(term))
}

const brief = (item) => ({ id: item.id, titulo: item.titulo, cat: item.cat, corto: item.corto })

function scoreNews(item, query, terms) {
  const title = normalize(item.titulo)
  const keys = normalize(item.claves.join(' '))
  const summary = normalize(item.resumen)
  const short = normalize(item.corto)
  const all = `${title} ${short} ${summary} ${keys} ${normalize(item.cat)}`
  const has = (haystack, term) =>
    term.length <= 2 ? new RegExp(`\\b${term}\\b`).test(haystack) : haystack.includes(term)

  let score = 0
  if (query.length >= 3 && all.includes(query)) score += 8

  for (const term of terms) {
    if (has(title, term)) score += 5
    if (has(keys, term)) score += 3
    if (has(summary, term)) score += 2
    if (has(short, term)) score += 2
  }

  if (terms.includes('tecnologia') && item.cat === 'Tecnología') score += 4
  if (terms.includes('cultura') && item.cat === 'Cultura') score += 4
  return score
}

export function searchNews(question, limit = 6) {
  const terms = extractTerms(question)
  const query = normalize(question)
  if (!terms.length) return []
  return listAllNews()
    .map((item) => ({ item, score: scoreNews(item, query, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item)
}

const DEFAULT_SUGGESTIONS = ['Recomendame algo', 'Toda tecnología', 'Toda cultura', 'Contacto']

const INTENTS = [
  ['gracias', /\b(gracias|muchas gracias|genial|perfecto|buenisimo|excelente)\b/],
  ['chau', /\b(chau|adios|hasta luego|nos vemos|hasta pronto)\b/],
  ['ayuda', /\b(ayuda|ayudame|que podes hacer|que sabes|como funcionas|para que servis|que haces)\b/],
  ['portal', /(quienes son|quienes somos|que es (este|el) portal|que es jovenes creativos|sobre el portal|de que trata)/],
  ['contacto', /\b(contacto|contactar|contactarlos|telefono|llamar|correo|mail|email|direccion|ubicacion|whatsapp|horario|redaccion|donde estan)\b/],
  ['recomendar', /(recomend|suger|que leo|que me aconsejas|por donde empiezo|algo para leer|algo interesante)/],
  ['listar', /(todas las noticias|que noticias hay|ultimas noticias|catalogo|que hay para leer|que puedo leer|que publicaron)/]
]

function detectIntent(question) {
  const normalized = normalize(question)
  const terms = extractTerms(question)
  if (/^(hola|holis|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hey|que tal)\b/.test(normalized) && terms.length <= 1) {
    return 'saludo'
  }
  const found = INTENTS.find(([, pattern]) => pattern.test(normalized))
  return found ? found[0] : 'buscar'
}

function recommend(question) {
  const terms = extractTerms(question)
  const wantsTech = terms.includes('tecnologia')
  const wantsCulture = terms.includes('cultura')
  const all = listAllNews()
  const pick = (cat) => {
    const pool = all.filter((item) => item.cat === cat)
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const cats = wantsTech && !wantsCulture ? ['Tecnología'] : wantsCulture && !wantsTech ? ['Cultura'] : brand.categories
  return cats.map(pick).filter(Boolean)
}

export function answerQuestion(question) {
  const intent = detectIntent(question)
  const c = brand.contact

  switch (intent) {
    case 'saludo':
      return { intent, reply: '¡Hola! 👋 Soy el asistente de Jóvenes Creativos. Conozco todas las notas del portal: preguntame por un tema, pedime una recomendación o consultame cómo contactarnos.', results: [], suggestions: DEFAULT_SUGGESTIONS }
    case 'gracias':
      return { intent, reply: '¡De nada! Me encanta que andes curioseando. Si querés, te recomiendo otra nota. 😉', results: [], suggestions: DEFAULT_SUGGESTIONS }
    case 'chau':
      return { intent, reply: '¡Hasta la próxima! Gracias por pasar por Jóvenes Creativos. Acá vamos a estar con más tecnología y cultura. ✨', results: [], suggestions: [] }
    case 'ayuda':
      return { intent, reply: 'Puedo hacer tres cosas: buscar notas por tema («baterías», «Rada», «patrimonio»), recomendarte qué leer y darte los datos de contacto de la redacción. Probá con alguna de estas ideas:', results: [], suggestions: DEFAULT_SUGGESTIONS }
    case 'portal':
      return { intent, reply: 'Jóvenes Creativos es un portal digital que conecta tecnología, ciencia, innovación y cultura, con una mirada cercana, dinámica y accesible. Contamos tendencias y acontecimientos relevantes sin tecnicismos, desde Montevideo.', results: [], suggestions: ['Recomendame algo', 'Toda tecnología', 'Toda cultura'] }
    case 'contacto':
      return { intent, reply: `Podés escribirnos a ${c.email}, llamar al ${c.phone} (${c.hours}) o mandar WhatsApp al ${c.whatsapp}. La redacción está en ${c.address}. También tenés el formulario en la sección Contacto. 📬`, results: [], suggestions: ['Recomendame algo', 'Toda cultura'] }
    case 'listar': {
      const all = listAllNews()
      return { intent, reply: `Ahora mismo tenemos ${all.length} notas publicadas entre ${brand.categories.join(' y ')}. Estas son las más recientes del catálogo:`, results: all.slice(-6).reverse().map(brief), suggestions: ['Toda tecnología', 'Toda cultura'] }
    }
    case 'recomendar': {
      const picks = recommend(question)
      return { intent, reply: picks.length > 1 ? 'Te dejo una selección para hoy, una de cada mundo. ¡Elegí la que más te llame! 🎯' : '¡Esta me parece una buena! 🎯', results: picks.map(brief), suggestions: ['Recomendame otra', 'Toda tecnología', 'Toda cultura'] }
    }
    default: {
      const found = searchNews(question)
      if (!found.length) {
        return { intent: 'sin-resultados', reply: 'Mmm, no encontré notas sobre eso todavía. 🤔 Probá con otra palabra clave («baterías», «IA», «patrimonio», «Rada») o con una categoría completa.', results: [], suggestions: DEFAULT_SUGGESTIONS }
      }
      const [top] = found
      const reply = found.length === 1
        ? `¡Mirá lo que encontré! Una nota que te puede interesar: «${top.titulo}». ${top.corto}`
        : `Encontré ${found.length} notas relacionadas. La que mejor encaja es «${top.titulo}»: ${top.corto} Tocá la que quieras leer. 👇`
      return { intent: 'busqueda', reply, results: found.map(brief), suggestions: ['Recomendame algo', 'Contacto'] }
    }
  }
}
