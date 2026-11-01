/**
 * asistente-local.js
 * Copia en el navegador de la lógica del asistente del backend (backend/src/services/assistant.js
 * y generator.js). Se usa en MODO DEMOSTRACIÓN (por ejemplo en GitHub Pages, donde no hay servidor)
 * y como respaldo si el backend no responde. Mantené ambos archivos sincronizados.
 */
(function () {
  'use strict';

  var CONTACTO = {
    email: 'aaguiar1833@gmail.com', telefono: '24860226', whatsapp: '091514474',
    direccion: 'Neyra 3649, Montevideo, Uruguay (CP 11600)', horario: 'lunes a viernes, de 9:00 a 18:00'
  };
  var CATEGORIAS = ['Tecnología', 'Cultura'];
  var STOP = ['que','cual','cuales','como','donde','cuando','por','para','con','los','las','del','una','uno','unos','unas','sobre','hay','noticias','noticia','notas','nota','dice','dime','busca','buscar','muestra','mostrar','quiero','saber','es','son','el','la','en','de','y','o','a','un','me','toda','todo','todas','todos','algo','tema','temas','tenes','tienen','podes','puedes'];
  var SUGERENCIAS = ['Recomendame algo', 'Toda tecnología', 'Toda cultura', 'Contacto'];

  function normalizar(t) {
    return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }

  function terminos(pregunta) {
    return normalizar(pregunta).replace(/[¿?¡!.,;:()"'«»]/g, ' ').split(' ')
      .filter(function (t) { return t.length >= 2 && STOP.indexOf(t) === -1; });
  }

  function resumen(n) { return { id: n.id, titulo: n.titulo, cat: n.cat, corto: n.corto }; }

  function puntaje(n, consulta, terms) {
    var titulo = normalizar(n.titulo), claves = normalizar(n.claves.join(' ')),
        res = normalizar(n.resumen), corto = normalizar(n.corto);
    var todo = titulo + ' ' + corto + ' ' + res + ' ' + claves + ' ' + normalizar(n.cat);
    function tiene(pajar, t) { return t.length <= 2 ? new RegExp('\\b' + t + '\\b').test(pajar) : pajar.indexOf(t) !== -1; }
    var p = 0;
    if (consulta.length >= 3 && todo.indexOf(consulta) !== -1) p += 8;
    terms.forEach(function (t) {
      if (tiene(titulo, t)) p += 5;
      if (tiene(claves, t)) p += 3;
      if (tiene(res, t)) p += 2;
      if (tiene(corto, t)) p += 2;
    });
    if (terms.indexOf('tecnologia') !== -1 && n.cat === 'Tecnología') p += 4;
    if (terms.indexOf('cultura') !== -1 && n.cat === 'Cultura') p += 4;
    return p;
  }

  function buscar(pregunta, noticias, limite) {
    var terms = terminos(pregunta), consulta = normalizar(pregunta);
    if (!terms.length) return [];
    return noticias
      .map(function (n) { return { n: n, p: puntaje(n, consulta, terms) }; })
      .filter(function (x) { return x.p > 0; })
      .sort(function (a, b) { return b.p - a.p; })
      .slice(0, limite || 6)
      .map(function (x) { return x.n; });
  }

  var INTENCIONES = [
    ['gracias', /\b(gracias|muchas gracias|genial|perfecto|buenisimo|excelente)\b/],
    ['chau', /\b(chau|adios|hasta luego|nos vemos|hasta pronto)\b/],
    ['ayuda', /\b(ayuda|ayudame|que podes hacer|que sabes|como funcionas|para que servis|que haces)\b/],
    ['portal', /(quienes son|quienes somos|que es (este|el) portal|que es jovenes creativos|sobre el portal|de que trata)/],
    ['contacto', /\b(contacto|contactar|contactarlos|telefono|llamar|correo|mail|email|direccion|ubicacion|whatsapp|horario|redaccion|donde estan)\b/],
    ['recomendar', /(recomend|suger|que leo|que me aconsejas|por donde empiezo|algo para leer|algo interesante)/],
    ['listar', /(todas las noticias|que noticias hay|ultimas noticias|catalogo|que hay para leer|que puedo leer|que publicaron)/]
  ];

  function intencion(pregunta) {
    var n = normalizar(pregunta);
    if (/^(hola|holis|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hey|que tal)\b/.test(n) && terminos(pregunta).length <= 1) return 'saludo';
    for (var i = 0; i < INTENCIONES.length; i++) if (INTENCIONES[i][1].test(n)) return INTENCIONES[i][0];
    return 'buscar';
  }

  function recomendar(pregunta, noticias) {
    var t = terminos(pregunta), tec = t.indexOf('tecnologia') !== -1, cul = t.indexOf('cultura') !== -1;
    var cats = tec && !cul ? ['Tecnología'] : cul && !tec ? ['Cultura'] : CATEGORIAS;
    return cats.map(function (c) {
      var pool = noticias.filter(function (n) { return n.cat === c; });
      return pool[Math.floor(Math.random() * pool.length)];
    }).filter(Boolean);
  }

  function responder(pregunta, noticias) {
    var tipo = intencion(pregunta), c = CONTACTO;
    switch (tipo) {
      case 'saludo': return { intent: tipo, reply: '¡Hola! 👋 Soy el asistente de Jóvenes Creativos. Conozco todas las notas del portal: preguntame por un tema, pedime una recomendación o consultame cómo contactarnos.', results: [], suggestions: SUGERENCIAS };
      case 'gracias': return { intent: tipo, reply: '¡De nada! Me encanta que andes curioseando. Si querés, te recomiendo otra nota. 😉', results: [], suggestions: SUGERENCIAS };
      case 'chau': return { intent: tipo, reply: '¡Hasta la próxima! Gracias por pasar por Jóvenes Creativos. Acá vamos a estar con más tecnología y cultura. ✨', results: [], suggestions: [] };
      case 'ayuda': return { intent: tipo, reply: 'Puedo hacer tres cosas: buscar notas por tema («baterías», «Rada», «patrimonio»), recomendarte qué leer y darte los datos de contacto de la redacción. Probá con alguna de estas ideas:', results: [], suggestions: SUGERENCIAS };
      case 'portal': return { intent: tipo, reply: 'Jóvenes Creativos es un portal digital que conecta tecnología, ciencia, innovación y cultura, con una mirada cercana, dinámica y accesible. Contamos tendencias y acontecimientos relevantes sin tecnicismos, desde Montevideo.', results: [], suggestions: ['Recomendame algo', 'Toda tecnología', 'Toda cultura'] };
      case 'contacto': return { intent: tipo, reply: 'Podés escribirnos a ' + c.email + ', llamar al ' + c.telefono + ' (' + c.horario + ') o mandar WhatsApp al ' + c.whatsapp + '. La redacción está en ' + c.direccion + '. También tenés el formulario en la sección Contacto. 📬', results: [], suggestions: ['Recomendame algo', 'Toda cultura'] };
      case 'listar': return { intent: tipo, reply: 'Ahora mismo tenemos ' + noticias.length + ' notas publicadas entre ' + CATEGORIAS.join(' y ') + '. Estas son las más recientes del catálogo:', results: noticias.slice(-6).reverse().map(resumen), suggestions: ['Toda tecnología', 'Toda cultura'] };
      case 'recomendar': {
        var picks = recomendar(pregunta, noticias);
        return { intent: tipo, reply: picks.length > 1 ? 'Te dejo una selección para hoy, una de cada mundo. ¡Elegí la que más te llame! 🎯' : '¡Esta me parece una buena! 🎯', results: picks.map(resumen), suggestions: ['Recomendame otra', 'Toda tecnología', 'Toda cultura'] };
      }
      default: {
        var found = buscar(pregunta, noticias);
        if (!found.length) return { intent: 'sin-resultados', reply: 'Mmm, no encontré notas sobre eso todavía. 🤔 Probá con otra palabra clave («baterías», «IA», «patrimonio», «Rada») o con una categoría completa.', results: [], suggestions: SUGERENCIAS };
        var top = found[0];
        var reply = found.length === 1
          ? '¡Mirá lo que encontré! Una nota que te puede interesar: «' + top.titulo + '». ' + top.corto
          : 'Encontré ' + found.length + ' notas relacionadas. La que mejor encaja es «' + top.titulo + '»: ' + top.corto + ' Tocá la que quieras leer. 👇';
        return { intent: 'busqueda', reply: reply, results: found.map(resumen), suggestions: ['Recomendame algo', 'Contacto'] };
      }
    }
  }

  function hashtag(tag) {
    var palabras = String(tag).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    return palabras.length ? '#' + palabras.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join('') : '';
  }

  function hashtags(n) {
    var lista = ['#JovenesCreativos', '#' + (n.cat === 'Cultura' ? 'Cultura' : 'Tecnologia')]
      .concat(n.claves.filter(function (t) { return t.length <= 22; }).slice(0, 3).map(hashtag))
      .filter(Boolean)
      .filter(function (t, i, l) { return l.indexOf(t) === i; });
    return lista.slice(0, 5).join(' ');
  }

  function generar(n, formato) {
    var cultura = n.cat === 'Cultura', texto;
    if (formato === 'redes') {
      var gancho = cultura ? 'La cultura de nuestro entorno, contada de cerca.' : 'El futuro ya está pasando, y te lo contamos sin tecnicismos.';
      texto = '✨ ' + n.titulo + '\n\n' + n.corto + '\n\n' + gancho + '\n👉 Leé la nota completa en Jóvenes Creativos.\n\n' + hashtags(n);
    } else if (formato === 'titulares') {
      var opciones = cultura
        ? [n.titulo + ': una mirada cercana', n.titulo + ': qué pasó y por qué importa', 'Todo sobre «' + n.titulo + '» en Jóvenes Creativos']
        : [n.titulo + ': lo esencial, sin tecnicismos', '¿Qué cambia con «' + n.titulo + '»? Te lo contamos', n.titulo + ': la tendencia que se viene'];
      texto = opciones.map(function (o, i) { return (i + 1) + '. ' + o; }).join('\n');
    } else {
      texto = 'Asunto: ' + n.titulo + '\n\nHola 👋\n\nEsta semana en Jóvenes Creativos te traemos «' + n.titulo + '». ' + n.resumen + '\n\nPodés leer la nota completa en nuestro portal.\n\n¡Gracias por acompañarnos!\nEl equipo de Jóvenes Creativos';
    }
    return { formato: formato, noticia: { id: n.id, titulo: n.titulo }, texto: texto };
  }

  window.JC_ASISTENTE = { responder: responder, generar: generar, normalizar: normalizar };
})();
