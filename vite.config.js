import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { applyOps, emptyDb, purgeDeleted } from './dbOps.js'
import { isAuthorized } from './auth.js'
import { processarPagamentoDemanda, processarPagamentoDemandaComComprovante } from './pagamentoDemanda.js'
import { salvarDocumento, localizarDocumento, apagarDocumento } from './armazenamentoDocumentos.js'

const NO_STORE_JSON_HEADERS = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
}

function syncServerPlugin() {
  const dbPath = fileURLToPath(new URL('./data/reuni_db.json', import.meta.url))
  const seedDbPath = fileURLToPath(new URL('./data/reuni_db.seed.json', import.meta.url))
  const oldDbPath = fileURLToPath(new URL('./src/data/reuni_db.json', import.meta.url))
  const dataDir = path.dirname(dbPath)
  const localBackupsDir = path.join(dataDir, 'backups')
  const localDocsDir = path.join(dataDir, 'comprovantes')

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(localBackupsDir)) fs.mkdirSync(localBackupsDir, { recursive: true })
  if (!fs.existsSync(localDocsDir)) fs.mkdirSync(localDocsDir, { recursive: true })

  const safeWriteDb = (targetPath, data) => {
    const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(tempPath, targetPath)
  }

  const syncBackups = (data) => {
    try {
      safeWriteDb(path.join(localBackupsDir, 'reuni_db_latest.json'), data)
      safeWriteDb(seedDbPath, data)
      const backupName = `reuni_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      const backupFiles = fs.readdirSync(localBackupsDir).filter(f => f.startsWith('reuni_db_backup_'))
      if (backupFiles.length < 50) {
        safeWriteDb(path.join(localBackupsDir, backupName), data)
      }
    } catch (err) {
      console.error('Erro ao gravar backup no servidor dev:', err.message)
    }
  }

  // Migrate or recover db if present and new db does not exist yet
  if (!fs.existsSync(dbPath)) {
    if (fs.existsSync(seedDbPath)) {
      try { fs.copyFileSync(seedDbPath, dbPath) } catch {}
    } else if (fs.existsSync(oldDbPath)) {
      try { fs.copyFileSync(oldDbPath, dbPath) } catch {}
    }
  }

  const readCurrentDb = () => {
    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') return purgeDeleted(parsed)
        }
      } catch {}
    }
    const latestBackup = path.join(localBackupsDir, 'reuni_db_latest.json')
    if (fs.existsSync(latestBackup)) {
      try {
        const raw = fs.readFileSync(latestBackup, 'utf-8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          const purged = purgeDeleted(parsed)
          safeWriteDb(dbPath, purged)
          return purged
        }
      } catch {}
    }
    if (fs.existsSync(seedDbPath)) {
      try {
        const raw = fs.readFileSync(seedDbPath, 'utf-8')
        if (raw.trim()) {
          const parsed = JSON.parse(raw)
          const purged = purgeDeleted(parsed)
          safeWriteDb(dbPath, purged)
          return purged
        }
      } catch {}
    }
    return emptyDb()
  }

  let sseClients = []

  const broadcast = (data) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`
    sseClients = sseClients.filter(clientRes => {
      try {
        clientRes.write(payload)
        return true
      } catch {
        return false
      }
    })
  }

  const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.svg': 'image/svg+xml'
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
          { path: '/api/auth/verify', method: 'POST' },
          { path: '/api/demandas/pagar', method: 'POST' },
          { path: '/api/documents/upload', method: 'POST' }
        ]
        const precisaAutorizacao =
          ROTAS_PROTEGIDAS.some(r => r.path === url && r.method === req.method) ||
          (url.startsWith('/api/documents/') && url !== '/api/documents/upload' && (req.method === 'GET' || req.method === 'DELETE'))

        if (precisaAutorizacao && !isAuthorized(req, parsedUrl)) {
          res.writeHead(401, NO_STORE_JSON_HEADERS)
          return res.end(JSON.stringify({ error: 'Não autorizado' }))
        }

        if (url === '/api/auth/verify' && req.method === 'POST') {
          res.writeHead(200, NO_STORE_JSON_HEADERS)
          return res.end(JSON.stringify({ ok: true }))
        }

        if (url === '/api/system/status' && req.method === 'GET') {
          let localDocsCount = 0
          try { localDocsCount = fs.readdirSync(localDocsDir).length } catch {}
          const currentData = readCurrentDb() || emptyDb()
          res.writeHead(200, NO_STORE_JSON_HEADERS)
          return res.end(JSON.stringify({
            ssdConnected: false,
            ssdPath: null,
            localDocsCount,
            totalDocuments: localDocsCount,
            status: 'online',
            revision: currentData.revision || 0,
            updatedAt: currentData.updatedAt || 0,
            connectedClients: sseClients.length,
            storageEngine: 'Vite Dev Server (Paridade Atômica + Revisão Monotônica)'
          }))
        }

        if (url === '/api/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=UTF-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
          })
          res.write('retry: 1500\n\n')
          sseClients.push(res)

          const currentData = readCurrentDb()
          if (currentData) {
            res.write(`data: ${JSON.stringify(currentData)}\n\n`)
          }

          const keepAliveTimer = setInterval(() => {
            try {
              res.write(': keepalive\n\n')
            } catch {
              clearInterval(keepAliveTimer)
            }
          }, 20000)
          if (keepAliveTimer.unref) keepAliveTimer.unref()

          req.on('close', () => {
            clearInterval(keepAliveTimer)
            sseClients = sseClients.filter(c => c !== res)
          })
          return
        }

        if (url === '/api/data' && req.method === 'GET') {
          const currentData = readCurrentDb()
          res.writeHead(200, NO_STORE_JSON_HEADERS)
          return res.end(JSON.stringify(currentData))
        }

        if (url === '/api/mutate' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const { ops, minRevision } = JSON.parse(body)
              if (!Array.isArray(ops) || ops.length === 0) {
                res.writeHead(400, NO_STORE_JSON_HEADERS)
                return res.end(JSON.stringify({ error: '"ops" precisa ser um array não vazio' }))
              }

              const current = readCurrentDb() || emptyDb()
              applyOps(current, ops, { minRevision })

              safeWriteDb(dbPath, current)
              syncBackups(current)
              broadcast(current)
              res.writeHead(200, NO_STORE_JSON_HEADERS)
              res.end(JSON.stringify({
                success: true,
                revision: current.revision,
                updatedAt: current.updatedAt,
                data: current,
                serverSynced: true
              }))
            } catch (err) {
              if (!res.headersSent) {
                res.writeHead(400, NO_STORE_JSON_HEADERS)
              }
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        if (url === '/api/demandas/pagar' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { demandaId, extracao, comprovante } = JSON.parse(body)
              if (!demandaId) {
                res.writeHead(400, NO_STORE_JSON_HEADERS)
                return res.end(JSON.stringify({ error: '"demandaId" é obrigatório' }))
              }

              const current = readCurrentDb() || emptyDb()
              const { plano, avaliacao, transacaoCriada, erroExtracao } = comprovante
                ? await processarPagamentoDemandaComComprovante(current, demandaId, comprovante)
                : processarPagamentoDemanda(current, demandaId, extracao || null)

              safeWriteDb(dbPath, current)
              syncBackups(current)
              broadcast(current)
              res.writeHead(200, NO_STORE_JSON_HEADERS)
              res.end(JSON.stringify({
                success: true,
                revision: current.revision,
                updatedAt: current.updatedAt,
                data: current,
                plano,
                avaliacao,
                transacaoCriada,
                erroExtracao
              }))
            } catch (err) {
              if (!res.headersSent) {
                res.writeHead(400, NO_STORE_JSON_HEADERS)
              }
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // Upload de Comprovante no Dev Server
        if (url === '/api/documents/upload' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const { fileName, fileType, base64 } = JSON.parse(body)
              if (!fileName || !base64) {
                res.writeHead(400, NO_STORE_JSON_HEADERS)
                return res.end(JSON.stringify({ error: 'Parâmetros inválidos' }))
              }
              const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '')
              const buffer = Buffer.from(cleanBase64, 'base64')
              const fileExt = path.extname(fileName) || (fileType?.includes('pdf') ? '.pdf' : '.png')
              const { fileId, url: fileUrl, savedOnSSD } = salvarDocumento(buffer, fileExt)

              res.writeHead(200, NO_STORE_JSON_HEADERS)
              res.end(JSON.stringify({
                success: true,
                fileId,
                fileName,
                url: fileUrl,
                size: buffer.length,
                savedOnSSD,
                uploadedAt: new Date().toISOString()
              }))
            } catch (err) {
              if (!res.headersSent) res.writeHead(500, NO_STORE_JSON_HEADERS)
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // Servir documentos / comprovantes no Dev Server
        if (url.startsWith('/api/documents/') && url !== '/api/documents/upload' && req.method === 'GET') {
          const fileId = url.replace('/api/documents/', '')
          const targetPath = localizarDocumento(fileId)
          if (targetPath && fs.existsSync(targetPath)) {
            const ext = path.extname(targetPath).toLowerCase()
            const contentType = MIME_TYPES[ext] || 'application/octet-stream'
            fs.readFile(targetPath, (err, content) => {
              if (err) {
                res.writeHead(500)
                res.end('Erro ao ler documento')
              } else {
                res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' })
                res.end(content)
              }
            })
            return
          }
          res.writeHead(404, NO_STORE_JSON_HEADERS)
          return res.end(JSON.stringify({ error: 'Documento não encontrado' }))
        }

        // Excluir comprovante no Dev Server
        if (url.startsWith('/api/documents/') && url !== '/api/documents/upload' && req.method === 'DELETE') {
          const fileId = url.replace('/api/documents/', '')
          const apagou = apagarDocumento(fileId)
          res.writeHead(apagou ? 200 : 404, NO_STORE_JSON_HEADERS)
          return res.end(JSON.stringify({ success: apagou }))
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
