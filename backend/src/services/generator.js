
import { brand } from '../data/news.js'
import { getNews } from './newsService.js'
import { HttpError } from '../lib/http.js'

export const FORMATS = ['redes', 'titulares', 'newsletter']


function hashtag(tag) {
  const clean = String(tag).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, ' ')
  const words = clean.split(/\s+/).filter(Boolean)
  return words.length ? `#${words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('')}` : ''
}

function hashtags(item) {
  const fromTags = item.claves.filter((tag) => tag.length <= 22).slice(0, 3).map(hashtag)
  return ['#JovenesCreativos', `#${item.cat === 'Cultura' ? 'Cultura' : 'Tecnologia'}`, ...fromTags]
    .filter(Boolean)
    .filter((tag, i, list) => list.indexOf(tag) === i)
    .slice(0, 5)
    .join(' ')
}

export function generateText(id, format) {
  if (!FORMATS.includes(format)) throw new HttpError(400, `El formato debe ser: ${FORMATS.join(', ')}.`)
  const item = getNews(id)
  const isCulture = item.cat === 'Cultura'

  if (format === 'redes') {
    const hook = isCulture ? 'La cultura de nuestro entorno, contada de cerca.' : 'El futuro ya está pasando, y te lo contamos sin tecnicismos.'
    return {
      formato: format,
      noticia: { id: item.id, titulo: item.titulo },
      texto: `✨ ${item.titulo}\n\n${item.corto}\n\n${hook}\n👉 Leé la nota completa en ${brand.name}.\n\n${hashtags(item)}`
    }
  }

  if (format === 'titulares') {
    const options = isCulture
      ? [`${item.titulo}: una mirada cercana`, `${item.titulo}: qué pasó y por qué importa`, `Todo sobre «${item.titulo}» en ${brand.name}`]
      : [`${item.titulo}: lo esencial, sin tecnicismos`, `¿Qué cambia con «${item.titulo}»? Te lo contamos`, `${item.titulo}: la tendencia que se viene`]
    return { formato: format, noticia: { id: item.id, titulo: item.titulo }, texto: options.map((o, i) => `${i + 1}. ${o}`).join('\n') }
  }

  return {
    formato: format,
    noticia: { id: item.id, titulo: item.titulo },
    texto: `Asunto: ${item.titulo}\n\nHola 👋\n\nEsta semana en ${brand.name} te traemos «${item.titulo}». ${item.resumen}\n\nPodés leer la nota completa en nuestro portal.\n\n¡Gracias por acompañarnos!\nEl equipo de ${brand.name}`
  }
}
