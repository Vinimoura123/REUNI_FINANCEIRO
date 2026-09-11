// Cliente do gate de acesso (ver auth.js na raiz do projeto, lado servidor).
// Guarda o token só no navegador (localStorage) — nunca é persistido dentro
// de um registro do banco (reuni_db.json), pra não vazar o segredo pelos
// próprios dados sincronizados.

const TOKEN_KEY = 'reuni_access_token'

export function getAccessToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch (e) {
    return ''
  }
}

export function setAccessToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (e) {}
}

export function clearAccessToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (e) {}
}

// Header pronto pra spread num fetch: fetch(url, { headers: { ...authHeaders() } })
export function authHeaders() {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Só para exibição (<img src>, <a href>, EventSource) — não pode carregar
// header customizado, então o token vai como query string nesses casos.
// Nunca aplica em URL que já não seja da própria API de documentos (data:,
// blob:, http(s) externo continuam intocados).
export function withAccessToken(url) {
  if (!url || typeof url !== 'string') return url
  if (!url.startsWith('/api/documents/')) return url
  const token = getAccessToken()
  if (!token) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}token=${encodeURIComponent(token)}`
}

// Testa um token candidato contra o servidor sem gravar/ler nada real.
export async function verifyAccessToken(candidateToken) {
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidateToken}` }
    })
    return res.ok
  } catch (e) {
    return false
  }
}
