// Armazenamento físico de comprovantes/documentos no servidor da hospedagem.
// Compartilhado entre server.js (rotas /api/documents/*) e
// pagamentoDemanda.js (upload automático junto do pagamento de demanda).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localDocsDir = path.join(__dirname, 'data', 'comprovantes')

if (!fs.existsSync(localDocsDir)) fs.mkdirSync(localDocsDir, { recursive: true })

export function salvarDocumento(buffer, fileExt) {
  const uniqueId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const safeFileName = `${uniqueId}${fileExt}`

  fs.writeFileSync(path.join(localDocsDir, safeFileName), buffer)

  return { fileId: safeFileName, url: `/api/documents/${safeFileName}`, savedOnSSD: false }
}

export function localizarDocumento(fileId) {
  const safeFileId = path.basename(fileId)
  const localFilePath = path.join(localDocsDir, safeFileId)
  if (fs.existsSync(localFilePath)) return localFilePath
  return null
}

// Apaga o arquivo físico no servidor. Devolve true se apagou, false se não encontrou.
export function apagarDocumento(fileId) {
  const safeFileId = path.basename(fileId)
  const localFilePath = path.join(localDocsDir, safeFileId)
  if (fs.existsSync(localFilePath)) {
    fs.unlinkSync(localFilePath)
    return true
  }
  return false
}

const ssdDocsDir = null
const ssdDetectadoParaDocumentos = false

export { localDocsDir, ssdDocsDir, ssdDetectadoParaDocumentos }

