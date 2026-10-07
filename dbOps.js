// Aplica operações atômicas (create/update/delete/replaceAll) sobre o estado
// do banco financeiro (data/reuni_db.json).
//
// Usado tanto pelo servidor de produção (server.js, node server.js) quanto
// pelo middleware de dev do Vite (vite.config.js, npm run dev), para que os
// dois tenham exatamente o mesmo comportamento de escrita e não voltem a
// divergir com o tempo.
//
// Por que isso existe (ver auditoria/relatório de bug): o formato anterior
// deixava o cliente mandar o array inteiro de uma coleção para sobrescrever
// o banco. Se dois clientes tivessem uma cópia local desatualizada, o
// segundo a gravar apagava silenciosamente o lançamento do primeiro. Agora
// o cliente manda só a operação (criar/atualizar/apagar um item, ou
// substituir uma coleção inteira de propósito), e ela é aplicada em cima do
// estado ATUAL do arquivo — nunca do que o cliente lembra ter.

export const ALLOWED_COLLECTIONS = [
  'demandas',
  'arrecadacoes',
  'transacoes',
  'bazarItems',
  'keepNotes',
  'inventarioItems'
]

export function applyOp(db, op) {
  const { op: kind, colecao, id, item, fields, items } = op || {}

  if (!ALLOWED_COLLECTIONS.includes(colecao)) {
    throw new Error(`Coleção inválida: ${colecao}`)
  }
  if (!Array.isArray(db[colecao])) db[colecao] = []

  if (kind === 'create') {
    if (!item || typeof item !== 'object') throw new Error('create exige "item"')
    db[colecao] = [item, ...db[colecao]]
  } else if (kind === 'createMany') {
    if (!Array.isArray(items)) throw new Error('createMany exige "items" (array)')
    db[colecao] = [...items, ...db[colecao]]
  } else if (kind === 'update') {
    if (!id) throw new Error('update exige "id"')
    db[colecao] = db[colecao].map(entry => (entry.id === id ? { ...entry, ...(fields || {}) } : entry))
  } else if (kind === 'delete') {
    if (!id) throw new Error('delete exige "id"')
    db[colecao] = db[colecao].filter(entry => entry.id !== id)
  } else if (kind === 'deleteMany') {
    const targetIds = Array.isArray(ids) ? ids : (Array.isArray(items) ? items.map(i => i.id || i) : [])
    if (targetIds.length === 0) throw new Error('deleteMany exige array de "ids"')
    const idSet = new Set(targetIds)
    db[colecao] = db[colecao].filter(entry => !idSet.has(entry.id))
  } else if (kind === 'replaceAll') {
    if (!Array.isArray(items)) throw new Error('replaceAll exige "items" (array)')
    db[colecao] = items
  } else {
    throw new Error(`Operação desconhecida: ${kind}`)
  }
}

export function applyOps(db, ops) {
  for (const op of ops) applyOp(db, op)
  return db
}

export function emptyDb() {
  return {
    demandas: [],
    arrecadacoes: [],
    transacoes: [],
    bazarItems: [],
    keepNotes: [],
    inventarioItems: [],
    documents: [],
    updatedAt: 0
  }
}
