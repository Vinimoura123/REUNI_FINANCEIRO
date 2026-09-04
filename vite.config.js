import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

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
        const url = req.url?.split('?')[0]

        if (url === '/api/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
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
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
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

        if (url === '/api/sync' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              data.updatedAt = Date.now()
              fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
              broadcast(data)
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
              res.end(JSON.stringify({ success: true, updatedAt: data.updatedAt }))
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
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
