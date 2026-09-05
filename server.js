import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
const dbPath = path.join(__dirname, 'data', 'reuni_db.json')
const distDir = path.join(__dirname, 'dist')

// Ensure data directory exists
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({
    demandas: [],
    arrecadacoes: [],
    transacoes: [],
    bazarItems: [],
    keepNotes: [],
    inventarioItems: [],
    updatedAt: 0
  }, null, 2), 'utf-8')
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

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

const server = http.createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] || '/'

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  // API Routes
  if (urlPath === '/api/events') {
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

  if (urlPath === '/api/data' && req.method === 'GET') {
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

  if (urlPath === '/api/sync' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        data.updatedAt = Date.now()
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
        broadcast(data)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, updatedAt: data.updatedAt }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  // Serve static files from /dist
  let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath)

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500)
      res.end('Erro interno do servidor')
    } else {
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content, 'utf-8')
    }
  })
})

server.listen(PORT, () => {
  console.log(`🚀 Servidor REUNI Financeiro rodando 24/7 na porta ${PORT}`)
})
