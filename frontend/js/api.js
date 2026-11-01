/**
 * api.js
 * Capa de datos del frontend. La interfaz (app.js) solo habla con window.JC_API y no sabe
 * si los datos vienen del servidor o del navegador:
 *
 *   - Modo "servidor": usa el backend (noticias, contacto, login con sesión firmada, asistente).
 *   - Modo "demo":     sin backend (p. ej. GitHub Pages). Guarda en localStorage y usa el asistente local.
 *
 * Todos los métodos devuelven Promesas. Los errores llevan un mensaje listo para mostrar a la persona.
 */
(function () {
  'use strict';

  var CFG = window.JC_CONFIG || {};
  var CLAVES = { noticias: 'jc_noticias_admin', mensajes: 'jc_mensajes_lista', token: 'jc_token', sesionDemo: 'jc_sesion_demo' };

  var base = null;     // URL de la API cuando hay servidor
  var modo = 'demo';   // 'servidor' | 'demo'

  /* ---------- almacenamiento seguro (puede estar bloqueado por el navegador) ---------- */
  var memoria = {};
  function leer(storage, clave) {
    try { return storage.getItem(clave); } catch (e) { return memoria[clave] || null; }
  }
  function escribir(storage, clave, valor) {
    try { storage.setItem(clave, valor); } catch (e) { memoria[clave] = valor; }
  }
  function borrar(storage, clave) {
    try { storage.removeItem(clave); } catch (e) { delete memoria[clave]; }
  }
  function leerLista(clave) {
    try {
      var datos = JSON.parse(leer(localStorage, clave) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch (e) { return []; }
  }
  function guardarLista(clave, lista) { escribir(localStorage, clave, JSON.stringify(lista)); }

  function error(mensaje, estado) {
    var e = new Error(mensaje);
    e.status = estado;
    return e;
  }

  /* ---------- peticiones al servidor ---------- */
  function pedir(ruta, opciones) {
    opciones = opciones || {};
    var controlador = new AbortController();
    var corte = setTimeout(function () { controlador.abort(); }, opciones.timeout || 8000);
    var cabeceras = { 'Content-Type': 'application/json' };
    var token = leer(sessionStorage, CLAVES.token);
    if (opciones.auth && token) cabeceras.Authorization = 'Bearer ' + token;

    return fetch(base + ruta, {
      method: opciones.method || 'GET',
      headers: cabeceras,
      body: opciones.body ? JSON.stringify(opciones.body) : undefined,
      signal: controlador.signal
    }).then(function (res) {
      clearTimeout(corte);
      return res.json().catch(function () { return {}; }).then(function (datos) {
        if (!res.ok) throw error(datos.message || 'Algo salió mal. Probá de nuevo.', res.status);
        return datos;
      });
    }).catch(function (e) {
      clearTimeout(corte);
      if (e.status) throw e;
      throw error('No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.', 0);
    });
  }

  /** Prueba si una dirección es realmente nuestra API (responde JSON con ok:true). */
  function probar(url) {
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, 2500);
    return fetch(url + '/health', { signal: c.signal })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { clearTimeout(t); return d && d.ok === true; })
      .catch(function () { clearTimeout(t); return false; });
  }

  function candidatas() {
    if (CFG.API_URL) return [CFG.API_URL.replace(/\/$/, '')];
    var lista = [];
    var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === 'file:';
    if (location.protocol.indexOf('http') === 0) lista.push('/api');
    if (local) lista.push('http://localhost:4000/api');
    return lista;
  }

  function iniciar() {
    var lista = candidatas();
    function siguiente(i) {
      if (i >= lista.length) { modo = 'demo'; base = null; return Promise.resolve(modo); }
      return probar(lista[i]).then(function (ok) {
        if (ok) { base = lista[i]; modo = 'servidor'; return modo; }
        return siguiente(i + 1);
      });
    }
    return siguiente(0);
  }

  /* ---------- demo: login local ---------- */
  function sha256(texto) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.reject(error('Tu navegador no permite validar la contraseña en este contexto. Abrí el sitio desde https o localhost.'));
    }
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  /* ---------- API pública ---------- */
  var API = {
    iniciar: iniciar,
    modo: function () { return modo; },

    /* Sesión */
    haySesion: function () {
      return modo === 'servidor' ? !!leer(sessionStorage, CLAVES.token) : leer(sessionStorage, CLAVES.sesionDemo) === '1';
    },
    usuario: function () { return leer(sessionStorage, 'jc_usuario') || ''; },
    login: function (usuario, clave) {
      if (modo === 'servidor') {
        return pedir('/auth/login', { method: 'POST', body: { usuario: usuario, clave: clave } }).then(function (r) {
          escribir(sessionStorage, CLAVES.token, r.token);
          escribir(sessionStorage, 'jc_usuario', r.usuario);
          return r;
        });
      }
      return sha256(clave).then(function (hash) {
        if (usuario !== CFG.DEMO_ADMIN_USER || hash !== CFG.DEMO_ADMIN_PASS_SHA256) {
          throw error('Usuario o contraseña incorrectos.', 401);
        }
        escribir(sessionStorage, CLAVES.sesionDemo, '1');
        escribir(sessionStorage, 'jc_usuario', usuario);
        return { usuario: usuario };
      });
    },
    logout: function () {
      borrar(sessionStorage, CLAVES.token);
      borrar(sessionStorage, CLAVES.sesionDemo);
      borrar(sessionStorage, 'jc_usuario');
    },

    /* Noticias creadas desde el panel (las 10 originales viven en index.html) */
    listarNoticiasAdmin: function () {
      if (modo === 'servidor') {
        var baseIds = (window.JC_NOTICIAS || []).map(function (n) { return n.id; });
        return pedir('/news').then(function (todas) {
          return todas.filter(function (n) { return baseIds.indexOf(n.id) === -1; });
        });
      }
      return Promise.resolve(leerLista(CLAVES.noticias));
    },
    crearNoticia: function (d) {
      if (modo === 'servidor') {
        return pedir('/news', { method: 'POST', auth: true, body: { cat: d.cat, titulo: d.titulo, resumen: d.resumen, cuerpo: d.cuerpo, imagen: d.imagen, etiquetas: d.etiquetas } });
      }
      if (d.titulo.length < 3 || d.resumen.length < 10 || d.cuerpo.length < 20) {
        return Promise.reject(error('El título necesita 3+ caracteres, el resumen 10+ y el cuerpo 20+.', 400));
      }
      var claves = d.etiquetas ? d.etiquetas.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [];
      var nueva = {
        id: 'admin-' + Date.now(), cat: d.cat, titulo: d.titulo, corto: d.resumen, resumen: d.resumen,
        cuerpo: d.cuerpo, imagen: d.imagen, claves: claves.concat([d.titulo.toLowerCase(), d.cat.toLowerCase()]),
        creada: new Date().toISOString()
      };
      var lista = leerLista(CLAVES.noticias);
      lista.push(nueva);
      guardarLista(CLAVES.noticias, lista);
      return Promise.resolve(nueva);
    },
    borrarNoticia: function (id) {
      if (modo === 'servidor') return pedir('/news/' + encodeURIComponent(id), { method: 'DELETE', auth: true });
      guardarLista(CLAVES.noticias, leerLista(CLAVES.noticias).filter(function (n) { return n.id !== id; }));
      return Promise.resolve({ ok: true });
    },

    /* Contacto */
    enviarContacto: function (d) {
      if (modo === 'servidor') return pedir('/contact', { method: 'POST', body: d });

      if (CFG.CONTACT_FORM_URL) { // servicio externo de formularios (Formspree y similares)
        return fetch(CFG.CONTACT_FORM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name: d.nombre, email: d.email, subject: d.asunto, message: d.mensaje })
        }).then(function (r) {
          if (!r.ok) throw error('El servicio de formularios rechazó el mensaje. Probá de nuevo más tarde.', r.status);
          return { mensaje: '¡Gracias, ' + d.nombre + '! Recibimos tu mensaje y te vamos a responder a ' + d.email + ' a la brevedad.' };
        }, function () { throw error('No pudimos enviar el mensaje. Revisá tu conexión e intentá de nuevo.', 0); });
      }

      var lista = leerLista(CLAVES.mensajes);
      lista.push({ id: 'msg-' + Date.now(), nombre: d.nombre, email: d.email, asunto: d.asunto, mensaje: d.mensaje, recibido: new Date().toISOString() });
      guardarLista(CLAVES.mensajes, lista);
      return Promise.resolve({
        mensaje: 'Gracias, ' + d.nombre + '. Guardamos tu mensaje en este navegador: esta es la versión de demostración y no tiene servidor de correo. Para consultas reales escribinos a aaguiar1833@gmail.com.'
      });
    },
    listarMensajes: function () {
      if (modo === 'servidor') return pedir('/contact', { auth: true });
      return Promise.resolve(leerLista(CLAVES.mensajes).slice().reverse());
    },
    borrarMensaje: function (id) {
      if (modo === 'servidor') return pedir('/contact/' + encodeURIComponent(id), { method: 'DELETE', auth: true });
      guardarLista(CLAVES.mensajes, leerLista(CLAVES.mensajes).filter(function (m) { return m.id !== id; }));
      return Promise.resolve({ ok: true });
    },

    /* IA: asistente y generador. Si el servidor falla, se usa la copia local para no dejar al usuario sin respuesta. */
    chat: function (pregunta, noticias) {
      var local = function () { return window.JC_ASISTENTE.responder(pregunta, noticias); };
      if (modo !== 'servidor') return Promise.resolve(local());
      return pedir('/chat', { method: 'POST', body: { pregunta: pregunta } }).catch(function (e) {
        if (e.status === 0) return local(); // sin conexión: respaldo local
        throw e;
      });
    },
    generar: function (noticia, formato, noticias) {
      var local = function () { return window.JC_ASISTENTE.generar(noticia, formato); };
      if (modo !== 'servidor') return Promise.resolve(local());
      return pedir('/generate', { method: 'POST', body: { noticiaId: noticia.id, formato: formato } }).catch(function (e) {
        if (e.status === 0) return local();
        throw e;
      });
    }
  };

  window.JC_API = API;
})();
