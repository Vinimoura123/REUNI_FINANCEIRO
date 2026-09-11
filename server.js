import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyOps, emptyDb } from './dbOps.js'
import { isAuthorized } from './auth.js'
import { processarPagamentoDemanda } from './pagamentoDemanda.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
const dbPath = path.join(__dirname, 'data', 'reuni_db.json')
const distDir = path.join(__dirname, 'dist')
const localDocsDir = path.join(__dirname, 'data', 'comprovantes')

// Detectar diretórios no SSD Externo de 1TB (Disco D:\)
const SSD_ROOT = 'D:\\REUNI_STORAGE'
const hasSSD = fs.existsSync(SSD_ROOT)

const ssdDbDir = hasSSD ? path.join(SSD_ROOT, 'db') : null
const ssdDocsDir = hasSSD ? path.join(SSD_ROOT, 'comprovantes') : null
const ssdBackupsDir = hasSSD ? path.join(SSD_ROOT, 'backups') : null

// Garantir criação das pastas locais e do SSD
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(localDocsDir)) fs.mkdirSync(localDocsDir, { recursive: true })

if (hasSSD) {
  if (!fs.existsSync(ssdDbDir)) fs.mkdirSync(ssdDbDir, { recursive: true })
  if (!fs.existsSync(ssdDocsDir)) fs.mkdirSync(ssdDocsDir, { recursive: true })
  if (!fs.existsSync(ssdBackupsDir)) fs.mkdirSync(ssdBackupsDir, { recursive: true })
  console.log(`✅ SSD de 1 TB Detectado e Conectado: ${SSD_ROOT}`)
}

if (!fs.existsSync(dbPath)) {
  const initialData = JSON.stringify({
    demandas: [],
    arrecadacoes: [],
    transacoes: [],
    bazarItems: [],
    keepNotes: [],
    inventarioItems: [],
    documents: [],
    updatedAt: 0
  }, null, 2)
  fs.writeFileSync(dbPath, initialData, 'utf-8')
}

// Se o SSD estiver presente mas sem o DB, copiar a versão inicial
if (hasSSD && ssdDbDir && !fs.existsSync(path.join(ssdDbDir, 'reuni_db.json'))) {
  try {
    fs.copyFileSync(dbPath, path.join(ssdDbDir, 'reuni_db.json'))
  } catch (err) {
    console.error('Erro ao clonar DB para o SSD:', err.message)
  }
}

let sseClients = []

// Lê o estado ATUAL do disco (nunca confia no que o cliente lembra ter)
const readCurrentDb = () => {
  if (!fs.existsSync(dbPath)) return null
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8')
    return raw.trim() ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

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

// Salvar cópias no SSD e criar backups versionados
const syncToSSDAndBackups = (data) => {
  if (!hasSSD || !ssdDbDir) return

  try {
    // 1. Gravar no SSD de 1TB
    fs.writeFileSync(path.join(ssdDbDir, 'reuni_db.json'), JSON.stringify(data, null, 2), 'utf-8')
    
    // 2. Snapshot de Backup no SSD
    fs.writeFileSync(path.join(ssdBackupsDir, 'reuni_db_latest.json'), JSON.stringify(data, null, 2), 'utf-8')
    
    // 3. Backup Diário / Temporal (a cada 20 atualizações)
    const backupName = `reuni_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const backupFiles = fs.readdirSync(ssdBackupsDir).filter(f => f.startsWith('reuni_db_backup_'))
    
    if (backupFiles.length < 50) {
      fs.writeFileSync(path.join(ssdBackupsDir, backupName), JSON.stringify(data, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('Erro ao sincronizar com o SSD:', err.message)
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

// Rotas que exigem REUNI_ACCESS_TOKEN válido (ver auth.js). O front-end e a
// API sempre rodam na mesma origem (este mesmo processo serve os dois), então
// não existe CORS legítimo a preservar — por isso ele foi removido, não
// restrito a uma allowlist. Chamada servidor-a-servidor (um futuro sub-agente,
// por exemplo) nunca passa por CORS de qualquer forma.
const ROTAS_PROTEGIDAS = [
  { path: '/api/data', method: 'GET' },
  { path: '/api/events', method: 'GET' },
  { path: '/api/mutate', method: 'POST' },
  { path: '/api/documents/upload', method: 'POST' },
  { path: '/api/auth/verify', method: 'POST' },
  { path: '/api/demandas/pagar', method: 'POST' }
]

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://internal')
  const urlPath = parsedUrl.pathname

  const precisaAutorizacao =
    ROTAS_PROTEGIDAS.some(r => r.path === urlPath && r.method === req.method) ||
    (urlPath.startsWith('/api/documents/') && urlPath !== '/api/documents/upload' && req.method === 'GET')

  if (precisaAutorizacao && !isAuthorized(req, parsedUrl)) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Não autorizado' }))
  }

  // Endpoint só para a tela de login validar o token na hora (não grava/lê nada)
  if (urlPath === '/api/auth/verify' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true }))
  }

  // API Status & Telemetria do SSD
  if (urlPath === '/api/system/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    let localDocsCount = 0
    let ssdDocsCount = 0

    try { localDocsCount = fs.readdirSync(localDocsDir).length } catch (e) {}
    if (hasSSD && ssdDocsDir) {
      try { ssdDocsCount = fs.readdirSync(ssdDocsDir).length } catch (e) {}
    }

    return res.end(JSON.stringify({
      ssdConnected: hasSSD,
      ssdPath: hasSSD ? SSD_ROOT : null,
      localDocsCount,
      ssdDocsCount,
      totalDocuments: Math.max(localDocsCount, ssdDocsCount),
      status: 'online',
      storageEngine: hasSSD ? 'SSD 1TB (Disco D:\\) + Fallback Cloud' : 'Cloud / Memory Local'
    }))
  }

  // API Server-Sent Events (SSE Real-Time Sync)
  if (urlPath === '/api/events') {
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

  // API Obter Dados
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

  // API Mutação atômica (create/update/delete/replaceAll de uma coleção)
  // Aplicada sempre em cima do estado ATUAL do arquivo, nunca de uma cópia
  // que o cliente mandou — isso é o que evita o lost-update de duas pessoas
  // gravando quase ao mesmo tempo (ver dbOps.js para o porquê).
  if (urlPath === '/api/mutate' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { ops } = JSON.parse(body)
        if (!Array.isArray(ops) || ops.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: '"ops" precisa ser um array não vazio' }))
        }

        const current = readCurrentDb() || emptyDb()
        applyOps(current, ops)
        current.updatedAt = Date.now()

        // 1. Grava no DB local
        fs.writeFileSync(dbPath, JSON.stringify(current, null, 2), 'utf-8')

        // 2. Grava no SSD e cria backup
        syncToSSDAndBackups(current)

        // 3. Notifica todos os navegadores em tempo real
        broadcast(current)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          updatedAt: current.updatedAt,
          data: current,
          ssdSynced: hasSSD
        }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  // API Pagamento de demanda — passa pelo gate conciliador-demandas ->
  // avaliador-financeiro antes de criar a transação correspondente.
  // O status "Pago" é sempre gravado; a transação só é criada se aprovada.
  if (urlPath === '/api/demandas/pagar' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { demandaId, extracao } = JSON.parse(body)
        if (!demandaId) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: '"demandaId" é obrigatório' }))
        }

        const current = readCurrentDb() || emptyDb()
        const { plano, avaliacao, transacaoCriada } = processarPagamentoDemanda(current, demandaId, extracao || null)

        fs.writeFileSync(dbPath, JSON.stringify(current, null, 2), 'utf-8')
        syncToSSDAndBackups(current)
        broadcast(current)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          updatedAt: current.updatedAt,
          data: current,
          plano,
          avaliacao,
          transacaoCriada
        }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  // API Upload de Documentos/PDFs/Imagens para o SSD de 1TB
  if (urlPath === '/api/documents/upload' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { fileName, fileType, base64 } = JSON.parse(body)
        if (!fileName || !base64) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: 'Parâmetros inválidos (fileName e base64 são obrigatórios)' }))
        }

        const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '')
        const buffer = Buffer.from(cleanBase64, 'base64')
        const fileExt = path.extname(fileName) || (fileType?.includes('pdf') ? '.pdf' : '.png')
        const uniqueId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const safeFileName = `${uniqueId}${fileExt}`

        // Save local
        const localPath = path.join(localDocsDir, safeFileName)
        fs.writeFileSync(localPath, buffer)

        // Save to SSD if available
        let savedOnSSD = false
        if (hasSSD && ssdDocsDir) {
          try {
            fs.writeFileSync(path.join(ssdDocsDir, safeFileName), buffer)
            savedOnSSD = true
          } catch (e) {
            console.error('Erro ao gravar arquivo no SSD:', e.message)
          }
        }

        const fileUrl = `/api/documents/${safeFileName}`
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          fileId: safeFileName,
          fileName,
          url: fileUrl,
          size: buffer.length,
          savedOnSSD,
          uploadedAt: new Date().toISOString()
        }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  // API Servir Documentos / PDFs / Fotos do SSD ou Local
  if (urlPath.startsWith('/api/documents/') && req.method === 'GET') {
    const fileId = urlPath.replace('/api/documents/', '')
    const safeFileId = path.basename(fileId)

    let targetPath = null

    // Tentar no SSD primeiro
    if (hasSSD && ssdDocsDir) {
      const ssdFilePath = path.join(ssdDocsDir, safeFileId)
      if (fs.existsSync(ssdFilePath)) targetPath = ssdFilePath
    }

    // Fallback para pasta local
    if (!targetPath) {
      const localFilePath = path.join(localDocsDir, safeFileId)
      if (fs.existsSync(localFilePath)) targetPath = localFilePath
    }

    if (targetPath) {
      const ext = path.extname(targetPath).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      fs.readFile(targetPath, (err, content) => {
        if (err) {
          res.writeHead(500)
          res.end('Erro ao ler documento')
        } else {
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400'
          })
          res.end(content)
        }
      })
      return
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Documento não encontrado' }))
    }
  }

  // Servir arquivos estáticos da SPA em /dist
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
  if (hasSSD) {
    console.log(`💾 Armazenamento do SSD Ativo em: ${SSD_ROOT}`)
  }
})

