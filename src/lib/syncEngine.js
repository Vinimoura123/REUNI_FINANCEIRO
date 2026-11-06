// Motor determinístico de reconciliação em 3 vias (Base + Local + Servidor)
// com relógio lógico monotônico (_rev / revision), imune a divergências de
// fuso/relógio entre dispositivos (ex.: PC com data adiantada vs servidor NTP
// em nuvem vs celulares dos membros) e resiliente a resets de container efêmero.

export const SYNC_COLLECTIONS = [
  'demandas',
  'arrecadacoes',
  'transacoes',
  'bazarItems',
  'keepNotes',
  'inventarioItems'
]

const TRANSIENT_META_KEYS = new Set([
  '_rev',
  '_dirty',
  '_baseRev',
  '_recreated',
  'force',
  'clearTombstone'
])

function canonicalize(val) {
  if (val === null || val === undefined) return null
  if (Array.isArray(val)) return val.map(canonicalize)
  if (typeof val === 'object') {
    const out = {}
    for (const k of Object.keys(val).sort()) {
      if (TRANSIENT_META_KEYS.has(k)) continue
      if (val[k] !== undefined) {
        out[k] = canonicalize(val[k])
      }
    }
    return out
  }
  return val
}

export function itemsContentEqual(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b))
}

export function stripTransientFlags(item) {
  if (!item || typeof item !== 'object') return item
  const copy = { ...item }
  delete copy._dirty
  delete copy._baseRev
  delete copy._recreated
  delete copy.force
  delete copy.clearTombstone
  copy._rev = Math.max(1, Number(item._rev) || 1)
  return copy
}

export function markLocalCreated(item) {
  if (!item || typeof item !== 'object') return item
  return {
    ...item,
    _rev: Math.max(1, Number(item._rev) || 1),
    _dirty: true,
    _recreated: true
  }
}

export function markLocalUpdated(prevItem, updatedFields) {
  const prevRev = Number(prevItem?._rev) || 1
  return {
    ...prevItem,
    ...updatedFields,
    _rev: prevRev + 1,
    _baseRev: Number(prevItem?._baseRev) || prevRev,
    _dirty: true
  }
}

export function computeServerSignature(serverData) {
  if (!serverData || typeof serverData !== 'object') return 'empty'
  const rev = Number(serverData.revision) || 0
  const ts = Number(serverData.updatedAt) || 0
  const delCount = serverData.deletedIds ? Object.keys(serverData.deletedIds).length : 0
  const colParts = SYNC_COLLECTIONS.map(col => {
    const arr = Array.isArray(serverData[col]) ? serverData[col] : []
    let revSum = 0
    for (const item of arr) {
      revSum += Number(item?._rev) || 1
    }
    const firstId = arr[0]?.id || ''
    const lastId = arr[arr.length - 1]?.id || ''
    return `${col}:${arr.length}:${revSum}:${firstId}:${lastId}`
  })
  return `r=${rev}|t=${ts}|d=${delCount}|${colParts.join(';')}`
}

export function reconcileStateWithServer({
  localState = {},
  baseState = null,
  baseRevision = 0,
  baseUpdatedAt = 0,
  serverData = {},
  localTombstones = {},
  hasSyncedV3Before = false
}) {
  const serverRev = Number(serverData?.revision) || 0
  const serverUpdatedAt = Number(serverData?.updatedAt) || 0
  const knownBaseRev = Number(baseRevision) || 0
  const knownBaseUpdatedAt = Number(baseUpdatedAt) || 0
  const serverDeletedIds =
    serverData && typeof serverData.deletedIds === 'object' && serverData.deletedIds
      ? serverData.deletedIds
      : {}

  // Rollback confirmado pós-v3: o servidor voltou a uma revisão menor do que a
  // última revisão já confirmada por este navegador (ex.: hibernação Render).
  const confirmedServerRollback = knownBaseRev > 0 && serverRev < knownBaseRev
  const isInitialV3Migration = !hasSyncedV3Before && serverRev === 0
  const serverRolledBack = confirmedServerRollback || isInitialV3Migration

  const mergedTombstones = { ...(localTombstones || {}) }
  let tombstonesChanged = false

  // Absorve exclusões confirmadas por outros membros no servidor (exceto se
  // este cliente recriou explicitamente o ID agora com _recreated: true).
  const recreatedLocalIds = new Set()
  for (const col of SYNC_COLLECTIONS) {
    const list = localState[col]
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && item.id && item._dirty && item._recreated) {
          recreatedLocalIds.add(item.id)
        }
      }
    }
  }

  for (const [delId, delTs] of Object.entries(serverDeletedIds)) {
    if (!recreatedLocalIds.has(delId) && !mergedTombstones[delId]) {
      mergedTombstones[delId] = Number(delTs) || Date.now()
      tombstonesChanged = true
    }
  }

  const zombieOps = []
  const upsertOps = []
  const mergedState = {}
  const targetMinRevision = Math.max(knownBaseRev, serverRev)

  for (const colName of SYNC_COLLECTIONS) {
    const serverList = serverData?.[colName]
    const currentLocalList = Array.isArray(localState[colName]) ? localState[colName] : []

    if (!Array.isArray(serverList)) {
      mergedState[colName] = currentLocalList
      continue
    }

    const baseList = Array.isArray(baseState?.[colName]) ? baseState[colName] : []
    const baseMap = new Map()
    for (const bItem of baseList) {
      if (bItem && bItem.id) baseMap.set(bItem.id, bItem)
    }

    // 1. Filtra itens deletados (tombstones locais ou remotos) e agenda expurgo de zumbis
    const cleanServer = []
    const cleanServerMap = new Map()
    const resurrectedIds = []

    for (const sItem of serverList) {
      if (!sItem || !sItem.id) continue
      if (mergedTombstones[sItem.id] && !recreatedLocalIds.has(sItem.id)) {
        if (!serverDeletedIds[sItem.id]) {
          resurrectedIds.push(sItem.id)
        }
      } else if (!cleanServerMap.has(sItem.id)) {
        cleanServer.push(sItem)
        cleanServerMap.set(sItem.id, sItem)
      }
    }

    if (resurrectedIds.length > 0) {
      zombieOps.push({
        op: 'deleteMany',
        colecao: colName,
        ids: resurrectedIds,
        minRevision: targetMinRevision
      })
    }

    // 2. Reconciliação item a item entre estado local e estado limpo do servidor
    const localOnlyToPrepend = []
    const itemsToUpsertOnServer = []
    const resolvedById = new Map()
    const seenLocalIds = new Set()

    for (const localItem of currentLocalList) {
      if (!localItem || !localItem.id || seenLocalIds.has(localItem.id)) continue
      seenLocalIds.add(localItem.id)

      if (mergedTombstones[localItem.id] && !recreatedLocalIds.has(localItem.id)) {
        continue
      }

      const serverItem = cleanServerMap.get(localItem.id)

      // Caso 1: Item existe no cliente e não existe no servidor (e não foi deletado por ninguém)
      if (!serverItem) {
        const nextRev = Math.max(1, Number(localItem._rev) || 1)
        const pendingLocal = {
          ...stripTransientFlags(localItem),
          _rev: nextRev,
          _dirty: true
        }
        localOnlyToPrepend.push(pendingLocal)
        itemsToUpsertOnServer.push({
          ...stripTransientFlags(localItem),
          _rev: nextRev,
          ...(recreatedLocalIds.has(localItem.id) ? { clearTombstone: true } : {})
        })
        continue
      }

      // Caso 2: Conteúdo idêntico nos dois lados -> convergiu, limpa flag _dirty
      if (itemsContentEqual(localItem, serverItem)) {
        const syncedRev = Math.max(1, Number(localItem._rev) || 1, Number(serverItem._rev) || 1)
        resolvedById.set(localItem.id, stripTransientFlags({ ...serverItem, _rev: syncedRev }))
        continue
      }

      // Caso 3: Mesmo ID com conteúdo divergente (edição de saldo, status, custo, quantidade, etc.)
      const baseItem = baseMap.get(localItem.id)
      const localRev = Number(localItem._rev) || 1
      const sItemRev = Number(serverItem._rev) || 1
      const localChangedFromBase = baseItem ? !itemsContentEqual(localItem, baseItem) : false
      const serverChangedFromBase = baseItem ? !itemsContentEqual(serverItem, baseItem) : false

      let localWins = false

      if (localItem._dirty) {
        if (!confirmedServerRollback && baseItem && serverChangedFromBase && sItemRev > localRev) {
          localWins = false
        } else {
          localWins = true
        }
      } else if (confirmedServerRollback) {
        // O servidor reiniciou para uma revisão anterior à já confirmada por este navegador
        localWins = true
      } else if (isInitialV3Migration) {
        // Na migração inicial pré-v3: se o navegador de um membro está intocado desde um
        // snapshot mais antigo (ex.: 01/10) e o servidor evoluiu depois (ex.: 06/10), o servidor
        // vence; em todos os demais casos (edições da madrugada no PC do coordenador), o local vence!
        if (baseItem && !localChangedFromBase && serverChangedFromBase && serverUpdatedAt > knownBaseUpdatedAt && knownBaseUpdatedAt > 0) {
          localWins = false
        } else {
          localWins = true
        }
      } else if (baseItem) {
        if (localChangedFromBase && !serverChangedFromBase) {
          localWins = true
        } else if (!localChangedFromBase && serverChangedFromBase) {
          localWins = false
        } else {
          localWins = localRev > sItemRev
        }
      } else {
        localWins = localRev > sItemRev
      }

      if (localWins) {
        const bumpedRev = Math.max(localRev, sItemRev) + 1
        const winnerLocal = {
          ...stripTransientFlags(localItem),
          _rev: bumpedRev,
          _dirty: true
        }
        resolvedById.set(localItem.id, winnerLocal)
        itemsToUpsertOnServer.push({
          ...stripTransientFlags(localItem),
          _rev: bumpedRev,
          force: true
        })
      } else {
        resolvedById.set(
          localItem.id,
          stripTransientFlags({ ...serverItem, _rev: sItemRev })
        )
      }
    }

    const finalList = [
      ...localOnlyToPrepend,
      ...cleanServer.map(s =>
        resolvedById.get(s.id) || stripTransientFlags({ ...s, _rev: Math.max(1, Number(s._rev) || 1) })
      )
    ]

    mergedState[colName] = finalList

    if (itemsToUpsertOnServer.length > 0) {
      upsertOps.push({
        op: 'upsertMany',
        colecao: colName,
        items: itemsToUpsertOnServer,
        minRevision: targetMinRevision
      })
    }
  }

  const correctiveOps = [...zombieOps, ...upsertOps]
  const cleanBaseCandidate = {}
  for (const col of SYNC_COLLECTIONS) {
    cleanBaseCandidate[col] = Array.isArray(mergedState[col])
      ? mergedState[col].map(stripTransientFlags)
      : []
  }

  return {
    mergedState,
    mergedTombstones,
    tombstonesChanged,
    correctiveOps,
    serverRolledBack,
    cleanBaseCandidate,
    nextBaseRevision: Math.max(knownBaseRev, serverRev)
  }
}
