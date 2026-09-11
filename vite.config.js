import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { applyOps, emptyDb } from './dbOps.js'
import { isAuthorized } from './auth.js'

function syncServerPlugin() {
  const dbPath = fileURLToPath(new URL('./data/reuni_db.json', import.meta.url))
  const oldDbPath = fileURLToPath(new URL('./src/data/reuni_db.json', import.meta.url))
  const dataDir = path.dirname(dbPath)

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Migrate old db if present and new db does not exist yet
  if (!fs.existsSync(dbPath) && fs.existsSync(oldDbPath)) {
    try {
      fs.copyFileSync(oldDbPath, dbPath)
    } catch (e) {}
  }

  let sseClients = []

  const broadcast = (data) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`
    sseClients = sseClients.filter(clientRes => {
      try {
        clientRes.write(payload)
        return true
      } catch (e) {
        return false
      }
    })
  }

  return {
    name: 'reuni-sync-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const parsedUrl = new URL(req.url, 'http://internal')
        const url = parsedUrl.pathname

        const ROTAS_PROTEGIDAS = [
          { path: '/api/data', method: 'GET' },
          { path: '/api/events', method: 'GET' },
          { path: '/api/mutate', method: 'POST' },
          { path: '/api/auth/verify', method: 'POST' }
        ]
        const precisaAutorizacao = ROTAS_PROTEGIDAS.some(r => r.path === url && r.method === req.method)
        if (precisaAutorizacao && !isAuthorized(req, parsedUrl)) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: 'Não autorizado' }))
        }

        if (url === '/api/auth/verify' && req.method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ ok: true }))
        }

        if (url === '/api/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          })
          res.write('retry: 1500\n\n')
          sseClients.push(res)

          if (fs.existsSync(dbPath)) {
            try {
              const currentData = fs.readFileSync(dbPath, 'utf-8')
              if (currentData.trim()) {
                res.write(`data: ${currentData}\n\n`)
              }
            } catch (err) {}
          }

          req.on('close', () => {
            sseClients = sseClients.filter(c => c !== res)
          })
          return
        }

        if (url === '/api/data' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          if (fs.existsSync(dbPath)) {
            try {
              const content = fs.readFileSync(dbPath, 'utf-8')
              return res.end(content || '{}')
            } catch (e) {
              return res.end('{}')
            }
          } else {
            return res.end(JSON.stringify({}))
          }
        }

        if (url === '/api/mutate' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const { ops } = JSON.parse(body)
              if (!Array.isArray(ops) || ops.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ error: '"ops" precisa ser um array não vazio' }))
              }

              let current = emptyDb()
              if (fs.existsSync(dbPath)) {
                try {
                  const raw = fs.readFileSync(dbPath, 'utf-8')
                  if (raw.trim()) current = JSON.parse(raw)
                } catch (e) {}
              }

              applyOps(current, ops)
              current.updatedAt = Date.now()

              fs.writeFileSync(dbPath, JSON.stringify(current, null, 2), 'utf-8')
              broadcast(current)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, updatedAt: current.updatedAt, data: current }))
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    syncServerPlugin()
  ],
  server: {
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/data/**', '**/reuni_db.json']
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: { sourcemap: false },
  esbuild: { sourcemap: false }
})
