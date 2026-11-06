// Aplica operações atômicas (create/createMany/update/upsertMany/delete/deleteMany/replaceAll)
// sobre o estado do banco financeiro (data/reuni_db.json).
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
// o cliente manda só a operação (criar/atualizar/apagar um item, reconciliar
// por revisão lógica via upsertMany, ou substituir uma coleção inteira de
// propósito), e ela é aplicada em cima do estado ATUAL do arquivo — nunca do
// que o cliente lembra ter.

export const ALLOWED_COLLECTIONS = [
  'demandas',
  'arrecadacoes',
  'transacoes',
  'bazarItems',
  'keepNotes',
  'inventarioItems'
]

function canonicalValue(val) {
  if (val === null || val === undefined) return null
  if (Array.isArray(val)) return val.map(canonicalValue)
  if (typeof val === 'object') {
    const sorted = {}
    for (const key of Object.keys(val).sort()) {
      if (key === '_rev' || key === '_dirty' || key === '_baseRev' || key === '_recreated' || key === 'force' || key === 'clearTombstone') {
        continue
      }
      if (val[key] !== undefined) {
        sorted[key] = canonicalValue(val[key])
      }
    }
    return sorted
  }
  return val
}

export function serverItemsEqual(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  return JSON.stringify(canonicalValue(a)) === JSON.stringify(canonicalValue(b))
}

export function sanitizeItemForDb(rawItem, targetRev = 1) {
  if (!rawItem || typeof rawItem !== 'object') return rawItem
  const clean = { ...rawItem }
  delete clean._dirty
  delete clean._baseRev
  delete clean._recreated
  delete clean.force
  delete clean.clearTombstone
  clean._rev = Math.max(1, Number(targetRev) || 1, Number(rawItem._rev) || 1)
  return clean
}

// Garante versão estritamente monotônica mesmo quando o relógio de um cliente
// estava adiantado em relação ao relógio NTP do servidor em nuvem.
export function bumpDbVersion(db, minRevision = 0, now = Date.now()) {
  if (!db || typeof db !== 'object') return db
  const baseRev = Math.max(Number(db.revision) || 0, Number(minRevision) || 0)
  db.revision = baseRev + 1
  db.updatedAt = Math.max(Number(now) || 0, (Number(db.updatedAt) || 0) + 1)
  return db
}

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
    if (db.deletedIds && item.id && db.deletedIds[item.id]) {
      delete db.deletedIds[item.id]
    }
    const existingIdx = item.id ? db[colecao].findIndex(e => e && e.id === item.id) : -1
    if (existingIdx >= 0) {
      const existing = db[colecao][existingIdx]
      const nextRev = serverItemsEqual(existing, item)
        ? Math.max(Number(existing._rev) || 1, Number(item._rev) || 1)
        : Math.max(Number(existing._rev) || 1, Number(item._rev) || 1) + 1
      db[colecao] = db[colecao].map((entry, idx) =>
        idx === existingIdx ? sanitizeItemForDb({ ...entry, ...item }, nextRev) : entry
      )
    } else {
      db[colecao] = [sanitizeItemForDb(item, Number(item._rev) || 1), ...db[colecao]]
    }
  } else if (kind === 'createMany') {
    if (!Array.isArray(items)) throw new Error('createMany exige "items" (array)')
    if (db.deletedIds) {
      items.forEach(i => { if (i && i.id && db.deletedIds[i.id]) delete db.deletedIds[i.id] })
    }
    const existingById = new Map()
    db[colecao].forEach((entry, idx) => {
      if (entry && entry.id) existingById.set(entry.id, idx)
    })
    const updatedList = [...db[colecao]]
    const brandNew = []
    const seenNewIds = new Set()

    for (const raw of items) {
      if (!raw || typeof raw !== 'object' || !raw.id) continue
      if (existingById.has(raw.id)) {
        const idx = existingById.get(raw.id)
        const prev = updatedList[idx]
        const nextRev = serverItemsEqual(prev, raw)
          ? Math.max(Number(prev._rev) || 1, Number(raw._rev) || 1)
          : Math.max(Number(prev._rev) || 1, Number(raw._rev) || 1) + 1
        updatedList[idx] = sanitizeItemForDb({ ...prev, ...raw }, nextRev)
      } else if (!seenNewIds.has(raw.id)) {
        seenNewIds.add(raw.id)
        brandNew.push(sanitizeItemForDb(raw, Number(raw._rev) || 1))
      }
    }
    db[colecao] = [...brandNew, ...updatedList]
  } else if (kind === 'update') {
    if (!id) throw new Error('update exige "id"')
    const cleanFields = { ...(fields || {}) }
    delete cleanFields._dirty
    delete cleanFields._baseRev
    delete cleanFields._recreated
    db[colecao] = db[colecao].map(entry => {
      if (!entry || entry.id !== id) return entry
      const mergedCandidate = { ...entry, ...cleanFields }
      const nextRev = serverItemsEqual(entry, mergedCandidate)
        ? Math.max(1, Number(entry._rev) || 1)
        : (Number(entry._rev) || 1) + 1
      return sanitizeItemForDb(mergedCandidate, nextRev)
    })
  } else if (kind === 'upsertMany') {
    if (!Array.isArray(items)) throw new Error('upsertMany exige "items" (array)')
    const existingMap = new Map()
    db[colecao].forEach((entry, idx) => {
      if (entry && entry.id) existingMap.set(entry.id, idx)
    })
    const nextList = [...db[colecao]]
    const toPrepend = []
    const seenPrepends = new Set()

    for (const inc of items) {
      if (!inc || typeof inc !== 'object' || !inc.id) continue
      if (db.deletedIds && db.deletedIds[inc.id]) {
        if (inc.clearTombstone) {
          delete db.deletedIds[inc.id]
        } else {
          continue
        }
      }

      if (existingMap.has(inc.id)) {
        const idx = existingMap.get(inc.id)
        const existing = nextList[idx]
        if (serverItemsEqual(existing, inc)) {
          const syncedRev = Math.max(Number(existing._rev) || 1, Number(inc._rev) || 1)
          nextList[idx] = sanitizeItemForDb(existing, syncedRev)
        } else {
          const existingRev = Number(existing._rev) || 1
          const incRev = Number(inc._rev) || 1
          if (inc.force || incRev >= existingRev) {
            const bumpedRev = Math.max(existingRev, incRev) + 1
            nextList[idx] = sanitizeItemForDb({ ...existing, ...inc }, bumpedRev)
          }
        }
      } else if (!seenPrepends.has(inc.id)) {
        seenPrepends.add(inc.id)
        toPrepend.push(sanitizeItemForDb(inc, Math.max(1, Number(inc._rev) || 1)))
      }
    }
    db[colecao] = [...toPrepend, ...nextList]
  } else if (kind === 'delete') {
    if (!id) throw new Error('delete exige "id"')
    db[colecao] = db[colecao].filter(entry => entry.id !== id)
    if (!db.deletedIds || typeof db.deletedIds !== 'object') db.deletedIds = {}
    db.deletedIds[id] = Math.max(Date.now(), (Number(db.updatedAt) || 0) + 1)
  } else if (kind === 'deleteMany') {
    const targetIds = Array.isArray(ids) ? ids : (Array.isArray(items) ? items.map(i => i.id || i) : [])
    if (targetIds.length === 0) throw new Error('deleteMany exige array de "ids"')
    const idSet = new Set(targetIds)
    db[colecao] = db[colecao].filter(entry => !idSet.has(entry.id))
    if (!db.deletedIds || typeof db.deletedIds !== 'object') db.deletedIds = {}
    const ts = Math.max(Date.now(), (Number(db.updatedAt) || 0) + 1)
    targetIds.forEach(targetId => { db.deletedIds[targetId] = ts })
  } else if (kind === 'replaceAll') {
    if (!Array.isArray(items)) throw new Error('replaceAll exige "items" (array)')
    const deduped = []
    const seen = new Set()
    for (const raw of items) {
      if (!raw || typeof raw !== 'object' || !raw.id || seen.has(raw.id)) continue
      seen.add(raw.id)
      deduped.push(sanitizeItemForDb(raw, Math.max(1, Number(raw._rev) || 1)))
    }
    db[colecao] = deduped
  } else {
    throw new Error(`Operação desconhecida: ${kind}`)
  }
}

export function applyOps(db, ops, options = {}) {
  if (!db.deletedIds || typeof db.deletedIds !== 'object') db.deletedIds = {}
  let maxMinRevision = Number(options.minRevision) || 0
  for (const op of ops) {
    if (op && Number(op.minRevision) > maxMinRevision) {
      maxMinRevision = Number(op.minRevision)
    }
    applyOp(db, op)
  }
  purgeDeleted(db)
  bumpDbVersion(db, maxMinRevision)
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
    revision: 0,
    updatedAt: 0
  }
}
