# Jóvenes Creativos · Portal de Noticias, Tecnología y Cultura

Proyecto final de la **Ruta Avanzada · Mi emprendimiento digital** (Jóvenes Creativos 2026).
Portal de noticias que conecta tecnología, ciencia, innovación y cultura, con catálogo de notas,
formulario de contacto, panel de administración con login y un asistente de IA con el tono de la marca.

El sitio funciona de **dos maneras**, con el mismo código:

| Modo | Cuándo | Qué hace |
|---|---|---|
| **Servidor** | `npm start` en tu computadora, o con el backend desplegado | Contacto, noticias y login pasan por la API (datos guardados en el servidor, sesión firmada). |
| **Demostración** | GitHub Pages (solo archivos estáticos) | Todo funciona en el navegador: datos en `localStorage`, asistente local y login de demostración. |

El sitio detecta solo en qué modo está (ver `frontend/js/api.js`) y lo indica en el pie de página.

---

## Qué pide el PDF y dónde está

| Entregable / criterio | Dónde está |
|---|---|
| App publicada (URL) | GitHub Pages desde `.github/workflows/pages.yml` (pasos más abajo) |
| Repositorio GitHub con historial | Ver «Historial de Git» más abajo |
| Marca + home | `frontend/index.html` (página Inicio) y `frontend/css/styles.css` |
| Catálogo | Página **Noticias** (10 notas + las que se publican desde el panel; buscador y filtros) |
| Contacto real | Página **Contacto** → `POST /api/contact` (valida, guarda en `backend/data/messages.json`, anti-spam y límite de envíos). Los mensajes se leen en el panel de admin. |
| Admin con login | Página **Admin** → `POST /api/auth/login` (contraseña con scrypt, sesión firmada con HMAC, 2 h de duración, límite de intentos). Publicar y borrar notas, ver y borrar mensajes. |
| IA personalizada | Página **Asistente**: chat que conoce las noticias, el contacto y el tono de la marca (busca, recomienda, responde) + **generador de textos** (publicación para redes, titulares, newsletter). |
| Código limpio | Frontend y backend separados, carpetas claras, comentarios que explican decisiones |
| UX cuidada | Responsive (probado en 375 px), animaciones suaves, estados de carga en botones, indicador «escribiendo…», errores claros, `prefers-reduced-motion` |
| Git ≥ 15 commits, GitHub Pages, responsive | Ver más abajo |

---

## Estructura

```
Jovenes-creativos/
├── frontend/                   ← lo que se publica en GitHub Pages
│   ├── index.html              ← el index8 integrado (marcado de todas las páginas)
│   ├── css/styles.css          ← estilos
│   ├── js/
│   │   ├── config.js           ← único archivo a tocar para conectar un servidor
│   │   ├── noticias-base.js    ← datos de las 10 notas originales
│   │   ├── asistente-local.js  ← asistente/generador que corre en el navegador (modo demostración)
│   │   ├── api.js              ← capa de datos: decide servidor o demostración
│   │   └── app.js              ← interfaz: navegación, catálogo, chat, contacto, admin
│   └── imagenes/               ← imágenes de las noticias (feria-robot.jpeg, nube.jpeg …)
├── backend/                    ← API en Node, sin dependencias externas
│   ├── src/
│   │   ├── server.js · app.js · config.js
│   │   ├── routes/index.js     ← tabla de rutas de la API
│   │   ├── services/           ← noticias, contacto, asistente, generador
│   │   ├── lib/                ← http, auth, almacenamiento, límites, validación
│   │   └── data/news.js        ← noticias base y datos de la marca
│   ├── test/api.test.js        ← 11 pruebas automáticas
│   └── .env.example
├── .github/workflows/pages.yml ← pruebas + despliegue a GitHub Pages
└── README.md
```

## Probarlo en tu computadora

Necesitás **Node 18 o superior** (no hay que instalar paquetes: el backend no tiene dependencias).

```bash
cd backend
npm start
# abrí http://localhost:4000
```

El mismo servidor entrega el sitio y la API. Para correr las pruebas: `npm test` (dentro de `backend/`, o en la raíz).

**Usuario del panel:** `admin` · **contraseña por defecto:** `JovenesCreativos2026`.
Cambiala antes de publicar el backend: copiá `backend/.env.example` como `backend/.env` y definí `ADMIN_PASSWORD`.
(En modo demostración la clave es la misma, pero ahí el login es solo una barrera de demostración: en un sitio
estático cualquiera puede leer el JavaScript. La seguridad real la da el backend.)

---

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub y subí el proyecto (ver «Historial de Git»).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `git push` a `main` corre las pruebas y publica la carpeta `frontend/`.
4. La URL queda como `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`. Esa es la URL de la entrega.

## (Opcional) Conectar el backend a la versión publicada

GitHub Pages no ejecuta Node, así que el backend se despliega aparte (por ejemplo en [Render](https://render.com), plan gratuito):

1. Nuevo *Web Service* desde tu repositorio. **Root Directory:** `backend` · **Build:** (vacío) · **Start:** `npm start`.
2. Variables de entorno: `ADMIN_PASSWORD`, `TOKEN_SECRET` (cadena larga al azar), `TRUST_PROXY=true`,
   `SERVE_FRONTEND=false` y `CORS_ORIGIN=https://TU-USUARIO.github.io`.
3. En `frontend/js/config.js` poné `API_URL: 'https://TU-SERVICIO.onrender.com/api'` y hacé push.

Ojo: en los planes gratuitos los archivos del servidor (`backend/data/`) pueden borrarse al reiniciar; para uso real
habría que cambiar `lib/store.js` por una base de datos (los servicios solo usan `readCollection`/`writeCollection`).

Para que Contacto envíe correos reales sin backend, podés crear un formulario en [Formspree](https://formspree.io)
y pegar su URL en `CONTACT_FORM_URL` (`frontend/js/config.js`).

---

## Historial de Git (mínimo 15 commits)

La regla del proyecto pide control de versiones con al menos 15 commits. El historial tiene que reflejar tu trabajo,
así que conviene ir comiteando a medida que revisás y entendés cada parte (recordá que en la defensa se pregunta por el código).
Una secuencia sugerida, con un commit por paso:

| # | Mensaje sugerido | Qué incluye |
|---|---|---|
| 1 | `chore: estructura inicial y .gitignore` | `.gitignore`, `package.json`, `README.md` |
| 2 | `feat(frontend): página base index.html` | `frontend/index.html` |
| 3 | `style: estilos globales y marca` | `frontend/css/styles.css` |
| 4 | `feat(frontend): datos de noticias base` | `frontend/js/noticias-base.js` |
| 5 | `feat(frontend): navegación, catálogo y buscador` | `frontend/js/app.js` |
| 6 | `feat(frontend): capa de datos con modo demostración` | `frontend/js/api.js`, `config.js` |
| 7 | `feat(frontend): asistente local` | `frontend/js/asistente-local.js` |
| 8 | `feat(backend): servidor HTTP, configuración y utilidades` | `backend/src/server.js`, `app.js`, `config.js`, `lib/http.js`, `lib/store.js`, `package.json` |
| 9 | `feat(backend): noticias y datos de marca` | `backend/src/data/`, `services/newsService.js` |
| 10 | `feat(backend): formulario de contacto real` | `services/contactService.js`, `lib/validate.js`, `lib/rateLimit.js` |
| 11 | `feat(backend): login de administrador` | `lib/auth.js`, rutas de auth |
| 12 | `feat(backend): asistente de IA y generador de textos` | `services/assistant.js`, `generator.js` |
| 13 | `feat(backend): rutas de la API` | `routes/index.js` |
| 14 | `test(backend): pruebas de la API` | `backend/test/api.test.js` |
| 15 | `feat(ux): estados de carga, animaciones y responsive` | ajustes en CSS/JS |
| 16 | `ci: despliegue en GitHub Pages` | `.github/workflows/pages.yml` |
| 17 | `docs: README y guía de despliegue` | `README.md`, `.env.example` |

```bash
git init -b main
git add .gitignore package.json README.md
git commit -m "chore: estructura inicial y .gitignore"
# ... repetí git add <archivos> + git commit para cada fila
git remote add origin https://github.com/TU-USUARIO/NOMBRE-DEL-REPO.git
git push -u origin main
```

---

## Decisiones técnicas (para la defensa)

- **Backend sin dependencias:** solo módulos propios de Node (`http`, `crypto`, `fs`). No hay `npm install` y menos superficie de fallos.
- **Dos modos con un mismo código:** `api.js` es el único que sabe si hay servidor; la interfaz solo pide datos. Así el sitio funciona en GitHub Pages y también con backend.
- **Seguridad del admin:** contraseña con *scrypt*, comparación en tiempo constante, token firmado con HMAC-SHA256 que vence, límite de intentos (429) y rutas privadas protegidas con `401`.
- **Contacto:** validación en cliente y servidor, campo «trampa» anti-bots, límite de envíos por IP y tope de tamaño del cuerpo.
- **IA personalizada:** el asistente funciona por intenciones (saludo, contacto, recomendar, listar, buscar) y por puntajes de relevancia sobre las noticias; responde en voseo y con el tono de la marca. No usa un modelo de lenguaje externo.
- **Accesibilidad:** enlace «Saltar al contenido», `aria-live` en el chat y los avisos, foco visible, navegación por teclado, `prefers-reduced-motion`.

## Limitaciones conocidas

- Las imágenes de las noticias están en `frontend/imagenes/`. Si alguna falta, se muestra un recuadro reservado.
- El almacenamiento del backend son archivos JSON: sirve para este proyecto, no para mucho tráfico.
- En modo demostración, los mensajes de contacto quedan solo en el navegador de quien los envía (salvo que configures `CONTACT_FORM_URL`).
