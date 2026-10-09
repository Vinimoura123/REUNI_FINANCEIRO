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

export function purgeDeleted(db) {
  if (!db || typeof db !== 'object') return db
  if (!db.deletedIds || typeof db.deletedIds !== 'object') return db
  for (const col of ALLOWED_COLLECTIONS) {
    if (Array.isArray(db[col])) {
      db[col] = db[col].filter(entry => entry && entry.id && !db.deletedIds[entry.id])
    }
  }
  return db
}

export function applyOp(db, op) {
  const { op: kind, colecao, id, item, fields, items, ids } = op || {}

  if (!ALLOWED_COLLECTIONS.includes(colecao)) {
    throw new Error(`Coleção inválida: ${colecao}`)
  }
  if (!Array.isArray(db[colecao])) db[colecao] = []

  if (kind === 'create') {
    if (!item || typeof item !== 'object') throw new Error('create exige "item"')
    // Se o item estava na lista de deletados anteriormente, remove o tombstone
    if (db.deletedIds && db.deletedIds[item.id]) {
      delete db.deletedIds[item.id]
    }
    db[colecao] = [item, ...db[colecao]]
  } else if (kind === 'createMany') {
    if (!Array.isArray(items)) throw new Error('createMany exige "items" (array)')
    if (db.deletedIds) {
      items.forEach(i => { if (i && i.id && db.deletedIds[i.id]) delete db.deletedIds[i.id] })
    }
    db[colecao] = [...items, ...db[colecao]]
  } else if (kind === 'update') {
    if (!id) throw new Error('update exige "id"')
    db[colecao] = db[colecao].map(entry => (entry.id === id ? { ...entry, ...(fields || {}) } : entry))
  } else if (kind === 'delete') {
    if (!id) throw new Error('delete exige "id"')
    db[colecao] = db[colecao].filter(entry => entry.id !== id)
    if (!db.deletedIds || typeof db.deletedIds !== 'object') db.deletedIds = {}
    db.deletedIds[id] = Date.now()
  } else if (kind === 'deleteMany') {
    const targetIds = Array.isArray(ids) ? ids : (Array.isArray(items) ? items.map(i => i.id || i) : [])
    if (targetIds.length === 0) throw new Error('deleteMany exige array de "ids"')
    const idSet = new Set(targetIds)
    db[colecao] = db[colecao].filter(entry => !idSet.has(entry.id))
    if (!db.deletedIds || typeof db.deletedIds !== 'object') db.deletedIds = {}
    targetIds.forEach(targetId => { db.deletedIds[targetId] = Date.now() })
  } else if (kind === 'replaceAll') {
    if (!Array.isArray(items)) throw new Error('replaceAll exige "items" (array)')
    db[colecao] = items
  } else {
    throw new Error(`Operação desconhecida: ${kind}`)
  }
}

export function applyOps(db, ops) {
  if (!db.deletedIds || typeof db.deletedIds !== 'object') db.deletedIds = {}
  for (const op of ops) applyOp(db, op)
  purgeDeleted(db)
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
    deletedIds: {},
    updatedAt: 0
  }
}
