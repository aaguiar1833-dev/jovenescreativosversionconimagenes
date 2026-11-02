
import { config } from './config.js'
import { createApp } from './app.js'

createApp().listen(config.port, () => {
  console.log(`\n  Jóvenes Creativos · servidor listo`)
  console.log(`  Sitio y API:  http://localhost:${config.port}`)
  console.log(`  Salud:        http://localhost:${config.port}/api/health`)
  if (config.usingDefaultPassword) {
    console.log(`\n  ⚠  Estás usando la contraseña de admin por defecto.`)
    console.log(`     Definí ADMIN_PASSWORD (ver backend/.env.example) antes de publicar.\n`)
  }
})
