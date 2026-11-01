/**
 * app.js
 * Lógica de la interfaz: navegación entre páginas, catálogo, asistente, generador de textos,
 * contacto y panel de administración. Los datos pasan siempre por window.JC_API (ver api.js).
 */
(function () {
  'use strict';

  var API = window.JC_API;
  var BASE = window.JC_NOTICIAS || [];

  /* ====================================================================
     Utilidades
     ==================================================================== */
  function $(id) { return document.getElementById(id); }

  function normalizar(texto) {
    return String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }

  function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function fechaCorta(iso) {
    try { return new Date(iso).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; }
  }

  /** Muestra un mensaje (ok / error / info) dentro de un contenedor con aria-live. */
  function aviso(contenedor, tipo, html) {
    if (!contenedor) return;
    var clase = tipo === 'ok' ? 'mensaje-ok' : tipo === 'info' ? 'mensaje-info' : 'mensaje-error';
    contenedor.innerHTML = '<div class="' + clase + '">' + html + '</div>';
  }

  /** Pone un botón en estado "cargando" (deshabilitado + rueda) y devuelve la función para restaurarlo. */
  function cargando(boton, texto) {
    var original = boton.innerHTML;
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    boton.innerHTML = '<span class="rueda" aria-hidden="true"></span>' + escapar(texto);
    return function () {
      boton.disabled = false;
      boton.removeAttribute('aria-busy');
      boton.innerHTML = original;
    };
  }

  /* ====================================================================
     Estado: noticias (originales + creadas desde el panel)
     ==================================================================== */
  var notasAdmin = [];

  function todas() { return BASE.concat(notasAdmin); }
  function buscarNota(id) { return todas().filter(function (n) { return n.id === id; })[0]; }

  /* ====================================================================
     Navegación entre páginas
     ==================================================================== */
  var PAGINAS_VALIDAS = ['inicio', 'noticias', 'asistente', 'contacto', 'admin', 'apendice'];

  function mostrarPagina(id, hacerScroll) {
    if (PAGINAS_VALIDAS.indexOf(id) === -1) id = 'inicio';

    document.querySelectorAll('.pagina').forEach(function (p) {
      p.classList.toggle('activa', p.id === 'pagina-' + id);
    });

    document.querySelectorAll('.menu-principal a[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (hacerScroll !== false) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);

    if (id === 'admin') refrescarAdmin();
    activarAnimaciones();
  }

  document.addEventListener('click', function (e) {
    var objetivo = e.target.closest('[data-pagina]');
    if (!objetivo) return;
    e.preventDefault();
    mostrarPagina(objetivo.getAttribute('data-pagina'), true);
  });

  window.addEventListener('hashchange', function () {
    var id = location.hash.replace('#', '') || 'inicio';
    if (PAGINAS_VALIDAS.indexOf(id) !== -1) mostrarPagina(id, false);
  });

  /* Accesibilidad con teclado en los enlaces que no tienen href */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target;
    if (el.tagName === 'A' && !el.getAttribute('href') && (el.hasAttribute('data-pagina') || el.hasAttribute('data-id') || el.hasAttribute('data-abrir'))) {
      e.preventDefault();
      el.click();
    }
  });

  /* ====================================================================
     Animaciones de entrada (sutiles; se desactivan con prefers-reduced-motion)
     ==================================================================== */
  var observador = null;
  var SELECTOR_REVELAR = '.tema, .pilares li, .bloque-apendice, .tarjeta-form, .datos-contacto li, .estadistica, .gen-form, .respuesta-gen';

  function activarAnimaciones() {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!observador) {
      observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('visible'); observador.unobserve(en.target); }
        });
      }, { threshold: 0.08 });
    }
    document.querySelectorAll(SELECTOR_REVELAR).forEach(function (el) {
      if (el.classList.contains('revelar')) return;
      el.classList.add('revelar');
      observador.observe(el);
    });
  }

  /* ====================================================================
     Inicio y catálogo
     ==================================================================== */
  function pintarListasInicio() {
    document.querySelectorAll('.lista-notas').forEach(function (ul) {
      var cat = ul.getAttribute('data-lista');
      ul.innerHTML = todas().filter(function (n) { return n.cat === cat; }).map(function (n) {
        return '<li><a data-pagina="noticias" data-abrir="' + escapar(n.id) + '" tabindex="0">' +
          '<strong>' + escapar(n.titulo) + '</strong><span>' + escapar(n.corto) + '</span></a></li>';
      }).join('');
    });
  }

  var visorBienvenida = $('bienvenida-visor');

  function abrirNota(id) {
    var nota = $(id);
    if (!nota) return false;

    document.querySelectorAll('.nota').forEach(function (n) { n.classList.remove('activa'); });
    nota.classList.add('activa');
    if (visorBienvenida) visorBienvenida.classList.add('oculta');

    document.querySelectorAll('#lista-noticias a').forEach(function (a) {
      a.classList.toggle('activo', a.getAttribute('data-id') === id);
    });

    var pag = $('pagina-noticias');
    if (pag && !pag.classList.contains('activa')) mostrarPagina('noticias', false);

    setTimeout(function () {
      nota.focus({ preventScroll: true });
      var visor = $('contenido-noticia');
      if (visor) window.scrollTo({ top: visor.getBoundingClientRect().top + window.pageYOffset - 110, behavior: 'smooth' });
    }, 60);
    return true;
  }

  document.addEventListener('click', function (e) {
    var linkNota = e.target.closest('[data-id]');
    if (linkNota) {
      var id = linkNota.getAttribute('data-id');
      if (id && $(id)) { e.preventDefault(); abrirNota(id); }
      return;
    }
    var el = e.target.closest('[data-abrir]');
    if (el) { e.preventDefault(); abrirNota(el.getAttribute('data-abrir')); }
  });

  /* Filtros y buscador del catálogo */
  var inputBuscador = $('buscador');
  var botonesFiltro = document.querySelectorAll('.filtro');
  var sinResultados = $('sin-resultados');
  var filtroActual = 'todas';

  function aplicarFiltros() {
    var q = inputBuscador ? normalizar(inputBuscador.value) : '';
    var visibles = 0;
    document.querySelectorAll('#lista-noticias > li').forEach(function (li) {
      var cat = li.getAttribute('data-cat');
      var tags = normalizar(li.getAttribute('data-tags') || '');
      var nombre = normalizar(li.querySelector('.nombre').textContent);
      var ok = (filtroActual === 'todas' || cat === filtroActual) && (!q || tags.indexOf(q) !== -1 || nombre.indexOf(q) !== -1);
      li.style.display = ok ? '' : 'none';
      if (ok) visibles++;
    });
    if (sinResultados) sinResultados.hidden = visibles !== 0;
  }

  if (inputBuscador) inputBuscador.addEventListener('input', aplicarFiltros);

  botonesFiltro.forEach(function (btn) {
    btn.addEventListener('click', function () {
      botonesFiltro.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      filtroActual = btn.getAttribute('data-filtro');
      aplicarFiltros();
    });
  });

  var limpiar = $('limpiar-filtros');
  if (limpiar) {
    limpiar.addEventListener('click', function () {
      if (inputBuscador) inputBuscador.value = '';
      filtroActual = 'todas';
      botonesFiltro.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filtro') === 'todas' ? 'true' : 'false'); });
      aplicarFiltros();
    });
  }

  /** Agrega una noticia creada desde el panel al menú lateral y al visor. */
  function agregarAlCatalogo(n) {
    if ($(n.id)) return; // ya está

    var lista = $('lista-noticias');
    if (lista) {
      var li = document.createElement('li');
      li.setAttribute('data-cat', n.cat);
      li.setAttribute('data-tags', (n.claves || []).join(' '));
      li.innerHTML = '<a data-id="' + escapar(n.id) + '" tabindex="0">' +
        '<span class="punto' + (n.cat === 'Cultura' ? ' cul' : '') + '" aria-hidden="true"></span>' +
        '<span class="nombre">' + escapar(n.titulo) + '</span><span class="meta">' + escapar(n.cat) + '</span></a>';
      lista.appendChild(li);
    }

    var visor = $('contenido-noticia');
    if (visor) {
      var art = document.createElement('article');
      art.className = 'nota' + (n.cat === 'Cultura' ? ' chip-cul' : '');
      art.id = n.id;
      art.setAttribute('tabindex', '-1');

      var img = '';
      if (n.imagen) {
        img = '<figure class="foto"><img src="' + escapar(n.imagen) + '" alt="Imagen de la noticia: ' + escapar(n.titulo) + '" loading="lazy">' +
          '<figcaption class="foto-placeholder"><span class="ph-icono">🖼</span><strong>Espacio reservado para la imagen</strong><span>' + escapar(n.imagen) + '</span></figcaption></figure>';
      }
      var parrafos = (n.cuerpo || '').split(/\n+/).filter(function (p) { return p.trim(); });

      art.innerHTML =
        '<span class="chip' + (n.cat === 'Cultura' ? ' chip-cul' : '') + '">' + escapar(n.cat) + '</span>' +
        '<h1>' + escapar(n.titulo) + '</h1>' +
        '<p class="meta-nota">Publicado desde el panel de administración</p>' +
        '<p class="lead">' + escapar(n.corto) + '</p>' + img +
        '<div class="cuerpo">' + parrafos.map(function (p) { return '<p>' + escapar(p) + '</p>'; }).join('') + '</div>';
      visor.appendChild(art);

      // Si la imagen no existe, se muestra el espacio reservado (sin usar atributos onerror en línea).
      var imagen = art.querySelector('img');
      if (imagen) imagen.addEventListener('error', function () {
        imagen.style.display = 'none';
        imagen.parentElement.classList.add('sin-imagen');
      });
    }
  }

  function quitarDelCatalogo(id) {
    var a = document.querySelector('#lista-noticias li a[data-id="' + id + '"]');
    if (a) a.closest('li').remove();
    var art = $(id);
    if (art) {
      var estabaActiva = art.classList.contains('activa');
      art.remove();
      if (estabaActiva && visorBienvenida) visorBienvenida.classList.remove('oculta');
    }
  }

  function sincronizarCatalogo(nuevas) {
    notasAdmin.forEach(function (n) { if (!nuevas.some(function (m) { return m.id === n.id; })) quitarDelCatalogo(n.id); });
    notasAdmin = nuevas;
    notasAdmin.forEach(agregarAlCatalogo);
    pintarListasInicio();
    poblarGenerador();
    aplicarFiltros();
  }

  /* ====================================================================
     Asistente de IA (chat)
     ==================================================================== */
  var chatLog = $('chat-log');
  var chatForm = $('chat-form');
  var inputIA = $('pregunta-ia');
  var btnIA = $('btn-consultar');
  var ocupado = false;

  function burbuja(tipo, html, extraClase) {
    var div = document.createElement('div');
    div.className = 'burbuja burbuja-' + tipo + (extraClase ? ' ' + extraClase : '');
    div.innerHTML = html;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
  }

  function htmlRespuesta(r) {
    var html = '<p>' + escapar(r.reply) + '</p>';
    if (r.results && r.results.length) {
      html += '<ul class="lista-resultados">' + r.results.map(function (n) {
        return '<li><a data-abrir="' + escapar(n.id) + '" tabindex="0"><span class="cat-tag">' + escapar(n.cat) + '</span>' +
          '<strong>' + escapar(n.titulo) + '</strong><span>' + escapar(n.corto) + '</span></a></li>';
      }).join('') + '</ul>';
    }
    if (r.suggestions && r.suggestions.length) {
      html += '<div class="sugerencias sugerencias-chat">' + r.suggestions.map(function (s) {
        return '<button type="button" class="chip-sugerida" data-pregunta="' + escapar(s) + '">' + escapar(s) + '</button>';
      }).join('') + '</div>';
    }
    return html;
  }

  function preguntar(texto) {
    texto = String(texto || '').trim();
    if (ocupado) return;
    if (!texto) {
      burbuja('asistente', '<p>Escribí una palabra o una pregunta para que pueda ayudarte. 🙂</p>');
      return;
    }

    ocupado = true;
    burbuja('usuario', '<p>' + escapar(texto) + '</p>');
    inputIA.value = '';
    inputIA.disabled = true;
    var restaurar = cargando(btnIA, 'Pensando');
    var escribiendo = burbuja('asistente', '<span class="puntos" aria-label="El asistente está escribiendo"><i></i><i></i><i></i></span>', 'escribiendo');

    var espera = new Promise(function (ok) { setTimeout(ok, 450); }); // pausa breve para que se note que "piensa"
    Promise.all([API.chat(texto, todas()), espera]).then(function (res) {
      escribiendo.remove();
      burbuja('asistente', htmlRespuesta(res[0]));
    }).catch(function (e) {
      escribiendo.remove();
      var b = burbuja('asistente', '<p>' + escapar(e.message || 'No pude responder en este momento.') + '</p>' +
        '<button type="button" class="chip-sugerida" data-pregunta="' + escapar(texto) + '">Reintentar</button>', 'burbuja-error');
      b.setAttribute('role', 'alert');
    }).then(function () {
      ocupado = false;
      inputIA.disabled = false;
      restaurar();
      inputIA.focus({ preventScroll: true });
    });
  }

  if (chatForm) chatForm.addEventListener('submit', function (e) { e.preventDefault(); preguntar(inputIA.value); });

  // Chips de sugerencia (los fijos de la columna izquierda y los que aparecen dentro del chat)
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-pregunta]');
    if (!chip) return;
    if (inputIA && !ocupado) {
      var pag = $('pagina-asistente');
      if (pag && !pag.classList.contains('activa')) mostrarPagina('asistente', false);
      preguntar(chip.getAttribute('data-pregunta'));
    }
  });

  function saludoInicial() {
    if (!chatLog || chatLog.children.length) return;
    burbuja('asistente', htmlRespuesta({
      reply: '¡Hola! 👋 Soy el asistente de Jóvenes Creativos. Conozco todas las notas del portal: preguntame por un tema, pedime una recomendación o consultame cómo contactarnos.',
      results: [], suggestions: ['Recomendame algo', 'Baterías de sodio', 'Contacto']
    }));
  }

  /* ====================================================================
     Generador de textos
     ==================================================================== */
  var genForm = $('gen-form');
  var genSelect = $('gen-noticia');
  var genSalida = $('gen-salida');

  function poblarGenerador() {
    if (!genSelect) return;
    var actual = genSelect.value;
    genSelect.innerHTML = todas().map(function (n) {
      return '<option value="' + escapar(n.id) + '">' + escapar(n.titulo) + ' (' + escapar(n.cat) + ')</option>';
    }).join('');
    if (actual && buscarNota(actual)) genSelect.value = actual;
  }

  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    return new Promise(function (ok, fallo) {
      var t = document.createElement('textarea');
      t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy') ? ok() : fallo(); } catch (e) { fallo(e); }
      document.body.removeChild(t);
    });
  }

  if (genForm) {
    genForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nota = buscarNota(genSelect.value);
      if (!nota) { aviso(genSalida, 'error', 'Elegí una noticia para generar el texto.'); return; }

      var restaurar = cargando($('gen-btn'), 'Generando');
      genSalida.innerHTML = '';
      Promise.all([API.generar(nota, $('gen-formato').value, todas()), new Promise(function (ok) { setTimeout(ok, 450); })])
        .then(function (res) {
          genSalida.innerHTML = '<div class="respuesta-gen"><pre class="gen-texto" id="gen-texto"></pre>' +
            '<button type="button" class="boton boton-secundario" id="gen-copiar">Copiar texto</button>' +
            '<span class="gen-copiado" id="gen-copiado" role="status"></span></div>';
          $('gen-texto').textContent = res[0].texto;
          $('gen-copiar').addEventListener('click', function () {
            copiar(res[0].texto).then(
              function () { $('gen-copiado').textContent = '¡Copiado!'; },
              function () { $('gen-copiado').textContent = 'No se pudo copiar: seleccioná el texto a mano.'; }
            );
          });
          activarAnimaciones();
        })
        .catch(function (err) { aviso(genSalida, 'error', escapar(err.message || 'No se pudo generar el texto.')); })
        .then(restaurar);
    });
  }

  /* ====================================================================
     Contacto
     ==================================================================== */
  var formContacto = $('form-contacto');
  var respuestaContacto = $('respuesta-contacto');

  if (formContacto) {
    formContacto.addEventListener('submit', function (e) {
      e.preventDefault();
      var datos = {
        nombre: $('c-nombre').value.trim(),
        email: $('c-email').value.trim(),
        asunto: $('c-asunto').value,
        mensaje: $('c-mensaje').value.trim(),
        acepto: $('c-acepto').checked,
        web: $('c-web').value
      };

      if (!datos.nombre || !datos.email || !datos.mensaje || !datos.acepto) {
        aviso(respuestaContacto, 'error', 'Completá todos los campos y aceptá el uso de datos para enviar la consulta.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
        aviso(respuestaContacto, 'error', 'El correo electrónico no parece válido.');
        return;
      }

      var restaurar = cargando($('c-enviar'), 'Enviando');
      respuestaContacto.innerHTML = '';
      API.enviarContacto(datos).then(function (r) {
        aviso(respuestaContacto, 'ok', escapar(r.mensaje || '¡Gracias! Recibimos tu mensaje.'));
        formContacto.reset();
      }).catch(function (err) {
        aviso(respuestaContacto, 'error', escapar(err.message || 'No pudimos enviar el mensaje.'));
      }).then(restaurar);
    });
  }

  /* ====================================================================
     Panel de administración (con login)
     ==================================================================== */
  var adminLogin = $('admin-login');
  var adminPanel = $('admin-panel');
  var formLogin = $('form-login');
  var formAdmin = $('form-admin');
  var respuestaAdmin = $('respuesta-admin');
  var tbodyNotas = $('cuerpo-tabla-admin');
  var tbodyMensajes = $('cuerpo-tabla-mensajes');

  function textoModo() {
    return API.modo() === 'servidor' ? '● Conectado al servidor' : '● Modo demostración (sin servidor)';
  }

  function actualizarEstadisticas(totalMensajes) {
    var lista = todas();
    $('stat-total').textContent = lista.length;
    $('stat-tec').textContent = lista.filter(function (n) { return n.cat === 'Tecnología'; }).length;
    $('stat-cul').textContent = lista.filter(function (n) { return n.cat === 'Cultura'; }).length;
    if (typeof totalMensajes === 'number') $('stat-msg').textContent = totalMensajes;
  }

  function pintarTablaNotas() {
    if (!notasAdmin.length) {
      tbodyNotas.innerHTML = '<tr><td class="vacio" colspan="3">Todavía no publicaste noticias desde este panel.</td></tr>';
      return;
    }
    tbodyNotas.innerHTML = notasAdmin.map(function (n) {
      return '<tr><td>' + escapar(n.titulo) + '</td><td>' + escapar(n.cat) + '</td>' +
        '<td><button type="button" class="borrar" data-borrar="' + escapar(n.id) + '">Borrar</button></td></tr>';
    }).join('');
  }

  function pintarTablaMensajes(lista) {
    if (!lista.length) {
      tbodyMensajes.innerHTML = '<tr><td class="vacio" colspan="3">Todavía no llegaron mensajes.</td></tr>';
      return;
    }
    tbodyMensajes.innerHTML = lista.map(function (m) {
      return '<tr><td><strong>' + escapar(m.nombre) + '</strong><br><a class="enlace-claro" href="mailto:' + escapar(m.email) + '">' + escapar(m.email) + '</a>' +
        '<br><small>' + escapar(fechaCorta(m.recibido)) + '</small></td>' +
        '<td><em>' + escapar(m.asunto || '') + '</em><br>' + escapar(m.mensaje) + '</td>' +
        '<td><button type="button" class="borrar" data-borrar-msg="' + escapar(m.id) + '">Borrar</button></td></tr>';
    }).join('');
  }

  function mostrarVistaAdmin() {
    var logueado = API.haySesion();
    adminLogin.hidden = logueado;
    adminPanel.hidden = !logueado;
    $('admin-modo').textContent = textoModo();
    $('admin-usuario').textContent = logueado ? 'Sesión: ' + API.usuario() : '';
    $('nota-admin').textContent = API.modo() === 'servidor'
      ? 'Las publicaciones y los mensajes se guardan en el servidor. Las diez noticias originales del portal no pueden borrarse.'
      : 'Modo demostración: las publicaciones y los mensajes se guardan en el almacenamiento local de este navegador. Si borrás los datos del sitio, se eliminarán. Las diez noticias originales no pueden borrarse.';
  }

  /** Cierra la sesión (por voluntad propia o porque el servidor dijo 401). */
  function cerrarSesion(mensaje) {
    API.logout();
    mostrarVistaAdmin();
    respuestaAdmin.innerHTML = '';
    if (mensaje) aviso($('respuesta-login'), 'info', escapar(mensaje));
  }

  function manejarErrorAdmin(err, contenedor) {
    if (err && err.status === 401) { cerrarSesion('Tu sesión expiró. Ingresá de nuevo.'); return; }
    aviso(contenedor, 'error', escapar((err && err.message) || 'Ocurrió un error.'));
  }

  /** Carga noticias y mensajes del panel; muestra "Cargando…" mientras espera. */
  function refrescarAdmin() {
    mostrarVistaAdmin();
    if (!API.haySesion()) return Promise.resolve();

    tbodyMensajes.innerHTML = '<tr><td class="vacio" colspan="3"><span class="rueda rueda-oscura" aria-hidden="true"></span>Cargando mensajes…</td></tr>';
    return Promise.all([API.listarNoticiasAdmin(), API.listarMensajes()]).then(function (res) {
      sincronizarCatalogo(res[0]);
      pintarTablaNotas();
      pintarTablaMensajes(res[1]);
      actualizarEstadisticas(res[1].length);
    }).catch(function (err) {
      tbodyMensajes.innerHTML = '<tr><td class="vacio" colspan="3">No se pudieron cargar los datos.</td></tr>';
      manejarErrorAdmin(err, respuestaAdmin);
    });
  }

  if (formLogin) {
    formLogin.addEventListener('submit', function (e) {
      e.preventDefault();
      var usuario = $('l-usuario').value.trim();
      var clave = $('l-clave').value;
      var salida = $('respuesta-login');
      if (!usuario || !clave) { aviso(salida, 'error', 'Ingresá tu usuario y tu contraseña.'); return; }

      var restaurar = cargando($('l-enviar'), 'Ingresando');
      salida.innerHTML = '';
      API.login(usuario, clave).then(function () {
        formLogin.reset();
        return refrescarAdmin();
      }).catch(function (err) {
        aviso(salida, 'error', escapar(err.message || 'No se pudo iniciar sesión.'));
      }).then(restaurar);
    });
  }

  $('btn-salir').addEventListener('click', function () { cerrarSesion('Cerraste la sesión. ¡Hasta pronto!'); });

  if (formAdmin) {
    formAdmin.addEventListener('submit', function (e) {
      e.preventDefault();
      var datos = {
        titulo: $('a-titulo').value.trim(),
        cat: $('a-categoria').value,
        imagen: $('a-imagen').value.trim(),
        etiquetas: $('a-etiquetas').value.trim(),
        resumen: $('a-resumen').value.trim(),
        cuerpo: $('a-cuerpo').value.trim()
      };
      if (!datos.titulo || !datos.resumen || !datos.cuerpo) {
        aviso(respuestaAdmin, 'error', 'Completá al menos el título, el resumen y el cuerpo de la noticia.');
        return;
      }

      var restaurar = cargando(formAdmin.querySelector('[type=submit]'), 'Publicando');
      API.crearNoticia(datos).then(function (nueva) {
        notasAdmin.push(nueva);
        agregarAlCatalogo(nueva);
        pintarListasInicio();
        poblarGenerador();
        pintarTablaNotas();
        actualizarEstadisticas();
        aviso(respuestaAdmin, 'ok', 'Noticia publicada correctamente. Ya aparece en el catálogo.');
        formAdmin.reset();
      }).catch(function (err) { manejarErrorAdmin(err, respuestaAdmin); }).then(restaurar);
    });
  }

  document.addEventListener('click', function (e) {
    var btnNota = e.target.closest('[data-borrar]');
    var btnMsg = e.target.closest('[data-borrar-msg]');
    if (!btnNota && !btnMsg) return;

    if (!window.confirm(btnNota ? '¿Borrar esta noticia?' : '¿Borrar este mensaje?')) return;
    btnNota ? borrarNota(btnNota.getAttribute('data-borrar'), btnNota) : borrarMensaje(btnMsg.getAttribute('data-borrar-msg'), btnMsg);
  });

  function borrarNota(id, boton) {
    boton.disabled = true;
    API.borrarNoticia(id).then(function () {
      notasAdmin = notasAdmin.filter(function (n) { return n.id !== id; });
      quitarDelCatalogo(id);
      pintarListasInicio();
      poblarGenerador();
      pintarTablaNotas();
      actualizarEstadisticas();
    }).catch(function (err) { boton.disabled = false; manejarErrorAdmin(err, respuestaAdmin); });
  }

  function borrarMensaje(id, boton) {
    boton.disabled = true;
    API.borrarMensaje(id).then(refrescarAdmin)
      .catch(function (err) { boton.disabled = false; manejarErrorAdmin(err, respuestaAdmin); });
  }

  /* ====================================================================
     Arranque
     ==================================================================== */
  function pintarModo() {
    var servidor = API.modo() === 'servidor';
    $('chat-estado').textContent = servidor ? 'En línea · conectado al servidor' : 'En línea · modo demostración';
    $('modo-pie').textContent = servidor ? '· Conectado al servidor' : '· Versión de demostración';
    $('admin-modo').textContent = textoModo();
  }

  function init() {
    // 1) La página se muestra enseguida, sin esperar al servidor.
    var hash = location.hash.replace('#', '');
    mostrarPagina(PAGINAS_VALIDAS.indexOf(hash) !== -1 ? hash : 'inicio', false);
    pintarListasInicio();
    poblarGenerador();
    saludoInicial();
    mostrarVistaAdmin();
    actualizarEstadisticas(0);
    activarAnimaciones();

    // 2) En segundo plano se detecta si hay servidor y se cargan las notas creadas desde el panel.
    API.iniciar().then(function () {
      pintarModo();
      return API.listarNoticiasAdmin().then(sincronizarCatalogo).catch(function () { /* se queda con las 10 originales */ });
    }).then(function () {
      if (location.hash === '#admin') return refrescarAdmin();
    }).then(function () { mostrarVistaAdmin(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
