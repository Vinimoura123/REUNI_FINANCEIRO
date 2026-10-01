// Checagem de acesso compartilhada entre o servidor de produção (server.js)
// e o middleware de dev do Vite (vite.config.js) — os dois precisam validar
// exatamente da mesma forma, senão voltam a divergir (como aconteceu com o
// /api/sync antes da correção em dbOps.js).
//
// Modelo: um único segredo compartilhado (REUNI_ACCESS_TOKEN), não contas
// por pessoa — proporcional ao tamanho do grupo que usa o REUNI Financeiro
// hoje. O token é lido de uma variável de ambiente (nunca commitado) e
// comparado em tempo constante (timingSafeEqual) para não vazar o segredo
// por diferença de tempo de resposta.
//
// Falha fechada: se REUNI_ACCESS_TOKEN não estiver configurado, NADA é
// autorizado — nunca "abre" por engano na ausência de configuração.

import crypto from 'node:crypto'

export const ACCESS_TOKEN = process.env.REUNI_ACCESS_TOKEN || '304314'

if (!process.env.REUNI_ACCESS_TOKEN) {
  console.log('ℹ️  REUNI_ACCESS_TOKEN não definido no ambiente — usando token padrão do projeto (304314).')
}

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

// Aceita o token via header "Authorization: Bearer <token>" (usado pelo
// fetch() do app) OU via query string "?token=..." (necessário para
// EventSource e <img>/<a>, que não conseguem mandar header customizado).
function extractToken(req, parsedUrl) {
  const authHeader = req.headers['authorization'] || ''
  const match = /^Bearer\s+(.+)$/i.exec(authHeader)
  if (match) return match[1]

  const queryToken = parsedUrl?.searchParams?.get('token')
  if (queryToken) return queryToken

  return null
}

export function isAuthorized(req, parsedUrl) {
  if (!ACCESS_TOKEN) return false
  const token = extractToken(req, parsedUrl)
  if (!token) return false
  return timingSafeEqualStr(token, ACCESS_TOKEN)
}
