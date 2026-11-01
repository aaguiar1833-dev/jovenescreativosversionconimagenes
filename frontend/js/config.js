/**
 * config.js
 * Ajustes del frontend. Es el único archivo que hay que tocar para conectar el sitio con un servidor.
 *
 * Cómo decide el sitio si usa el servidor (backend) o el modo demostración:
 *   1. Si API_URL tiene un valor, prueba esa dirección.
 *   2. Si está vacío, prueba "/api" (cuando el backend sirve el sitio) y, en tu computadora,
 *      también http://localhost:4000/api.
 *   3. Si ninguna responde (por ejemplo en GitHub Pages), el sitio sigue funcionando en
 *      MODO DEMOSTRACIÓN: guarda los datos en el navegador y el asistente corre en el propio navegador.
 */
window.JC_CONFIG = {
  // Dirección pública del backend una vez desplegado. Ejemplo: 'https://jovenes-creativos-api.onrender.com/api'
  API_URL: '',

  // Opcional: servicio de formularios (por ejemplo Formspree) para que Contacto envíe correos reales
  // también en modo demostración. Ejemplo: 'https://formspree.io/f/xxxxxxxx'
  CONTACT_FORM_URL: '',

  // Credenciales del panel en MODO DEMOSTRACIÓN (sin servidor). Se compara el hash SHA-256 de la clave.
  // Ojo: en un sitio estático esto es solo una barrera de demostración; la seguridad real
  // la da el backend (login con sesión firmada). Usuario por defecto: admin
  DEMO_ADMIN_USER: 'admin',
  DEMO_ADMIN_PASS_SHA256: '0727d8b964bd64771ddd313b0ca28acddf6af8f1f95d0daef082c51c9a7f24b9'
};
