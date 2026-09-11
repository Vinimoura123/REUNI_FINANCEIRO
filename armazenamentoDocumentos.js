// Armazenamento físico de comprovantes/documentos (local + SSD quando
// presente). Compartilhado entre server.js (rotas /api/documents/*) e
// pagamentoDemanda.js (upload automático junto do pagamento de demanda) —
// mesmo padrão de dbOps.js/auth.js, pra não duplicar a lógica de salvar/
// apagar arquivo em dois lugares.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localDocsDir = path.join(__dirname, 'data', 'comprovantes')

const SSD_ROOT = 'D:\\REUNI_STORAGE'
const hasSSD = fs.existsSync(SSD_ROOT)
const ssdDocsDir = hasSSD ? path.join(SSD_ROOT, 'comprovantes') : null

if (!fs.existsSync(localDocsDir)) fs.mkdirSync(localDocsDir, { recursive: true })
if (hasSSD && ssdDocsDir && !fs.existsSync(ssdDocsDir)) fs.mkdirSync(ssdDocsDir, { recursive: true })

export function salvarDocumento(buffer, fileExt) {
  const uniqueId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const safeFileName = `${uniqueId}${fileExt}`

  fs.writeFileSync(path.join(localDocsDir, safeFileName), buffer)

  let savedOnSSD = false
  if (hasSSD && ssdDocsDir) {
    try {
      fs.writeFileSync(path.join(ssdDocsDir, safeFileName), buffer)
      savedOnSSD = true
    } catch (e) {
      console.error('Erro ao gravar documento no SSD:', e.message)
    }
  }

  return { fileId: safeFileName, url: `/api/documents/${safeFileName}`, savedOnSSD }
}

export function localizarDocumento(fileId) {
  const safeFileId = path.basename(fileId)
  if (hasSSD && ssdDocsDir) {
    const ssdFilePath = path.join(ssdDocsDir, safeFileId)
    if (fs.existsSync(ssdFilePath)) return ssdFilePath
  }
  const localFilePath = path.join(localDocsDir, safeFileId)
  if (fs.existsSync(localFilePath)) return localFilePath
  return null
}

// Apaga o arquivo local E a cópia no SSD (quando existir). Devolve true se
// apagou pelo menos uma cópia, false se não encontrou nenhuma.
export function apagarDocumento(fileId) {
  const safeFileId = path.basename(fileId)
  let apagouAlgo = false

  const localFilePath = path.join(localDocsDir, safeFileId)
  if (fs.existsSync(localFilePath)) {
    fs.unlinkSync(localFilePath)
    apagouAlgo = true
  }

  if (hasSSD && ssdDocsDir) {
    const ssdFilePath = path.join(ssdDocsDir, safeFileId)
    if (fs.existsSync(ssdFilePath)) {
      fs.unlinkSync(ssdFilePath)
      apagouAlgo = true
    }
  }

  return apagouAlgo
}

export { localDocsDir, ssdDocsDir, hasSSD as ssdDetectadoParaDocumentos }
