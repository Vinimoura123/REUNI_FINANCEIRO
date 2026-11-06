import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { authHeaders, getAccessToken } from '../lib/auth'
import {
  computeServerSignature,
  markLocalCreated,
  markLocalUpdated,
  reconcileStateWithServer,
  SYNC_COLLECTIONS
} from '../lib/syncEngine'

const FinanceContext = createContext()

const STORAGE_KEY_DEMANDAS = 'reuni_demandas_v2'
const STORAGE_KEY_ARRECADACAO = 'reuni_arrecadacoes_v2'
const STORAGE_KEY_TRANSACOES = 'reuni_transacoes_v2'
const STORAGE_KEY_BAZAR = 'reuni_bazar_v2'
const STORAGE_KEY_KEEP = 'reuni_keep_v2'
const STORAGE_KEY_INVENTARIO = 'reuni_inventario_v2'
const STORAGE_KEY_TOMBSTONES = 'reuni_tombstones_v2'
const STORAGE_KEY_PENDING_OPS = 'reuni_pending_ops_v2'
const STORAGE_KEY_SYNCED_BASE = 'reuni_synced_base_v2'
const STORAGE_KEY_SYNCED_BASE_REV = 'reuni_synced_base_rev_v2'
const STORAGE_KEY_SYNCED_BASE_TS = 'reuni_synced_base_ts_v2'
const STORAGE_KEY_V3_INITIALIZED = 'reuni_sync_v3_initialized'

const DEFAULT_DEMANDAS = []
const DEFAULT_ARRECADACAO = []
const DEFAULT_TRANSACOES = []
const DEFAULT_BAZAR = []
const DEFAULT_KEEP = []
const DEFAULT_INVENTARIO = []

const getStoredTombstones = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOMBSTONES)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

const getStoredPendingOps = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_OPS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

const getInitialSyncedBase = () => {
  try {
    const savedBase = localStorage.getItem(STORAGE_KEY_SYNCED_BASE)
    if (savedBase) {
      const parsed = JSON.parse(savedBase)
      if (parsed && typeof parsed === 'object') return parsed
    }
    // Migração suave: aproveita o último snapshot de servidor conhecido pré-v3
    const legacySnap = localStorage.getItem('reuni_emergency_snapshot')
    if (legacySnap) {
      const parsedSnap = JSON.parse(legacySnap)
      const data = parsedSnap?.data || parsedSnap
      if (data && typeof data === 'object') {
        const extracted = {}
        for (const col of SYNC_COLLECTIONS) {
          if (Array.isArray(data[col])) extracted[col] = data[col]
        }
        return extracted
      }
    }
  } catch {}
  return null
}

const getInitialBaseUpdatedAt = () => {
  try {
    const savedTs = localStorage.getItem(STORAGE_KEY_SYNCED_BASE_TS)
    if (savedTs) return Number(savedTs) || 0
    const legacySnap = localStorage.getItem('reuni_emergency_snapshot')
    if (legacySnap) {
      const parsedSnap = JSON.parse(legacySnap)
      const data = parsedSnap?.data || parsedSnap
      return Number(data?.updatedAt) || 0
    }
  } catch {}
  return 0
}

const filterTombstoned = (items, tombstones) => {
  if (!Array.isArray(items)) return items
  if (!tombstones || Object.keys(tombstones).length === 0) return items
  return items.filter(i => i && i.id && !tombstones[i.id])
}

const loadStorageWithFallback = (primaryKey, fallbackKeys = [], defaultVal = []) => {
  const tombstones = getStoredTombstones()
  try {
    const saved = localStorage.getItem(primaryKey)
    if (saved && saved !== '[]' && saved !== 'null') {
      return filterTombstoned(JSON.parse(saved), tombstones)
    }
    for (const fb of fallbackKeys) {
      const fbSaved = localStorage.getItem(fb)
      if (fbSaved && fbSaved !== '[]' && fbSaved !== 'null') {
        const parsed = JSON.parse(fbSaved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = filterTombstoned(parsed, tombstones)
          localStorage.setItem(primaryKey, JSON.stringify(sanitized))
          return sanitized
        }
      }
    }
    const snap = localStorage.getItem('reuni_emergency_snapshot')
    if (snap) {
      const parsedSnap = JSON.parse(snap)
      const data = parsedSnap.data || parsedSnap
      const colMap = {
        [STORAGE_KEY_DEMANDAS]: 'demandas',
        [STORAGE_KEY_ARRECADACAO]: 'arrecadacoes',
        [STORAGE_KEY_TRANSACOES]: 'transacoes',
        [STORAGE_KEY_BAZAR]: 'bazarItems',
        [STORAGE_KEY_KEEP]: 'keepNotes',
        [STORAGE_KEY_INVENTARIO]: 'inventarioItems'
      }
      const colName = colMap[primaryKey]
      if (colName && data && Array.isArray(data[colName]) && data[colName].length > 0) {
        const sanitized = filterTombstoned(data[colName], tombstones)
        localStorage.setItem(primaryKey, JSON.stringify(sanitized))
        return sanitized
      }
    }
  } catch {}
  return defaultVal
}

export function FinanceProvider({ children }) {
  const [lastSaved, setLastSaved] = useState(null)
  const [pendingOpsCount, setPendingOpsCount] = useState(() => getStoredPendingOps().length)
  const [syncStatus, setSyncStatus] = useState(() =>
    getStoredPendingOps().length > 0 ? 'pending' : 'syncing'
  )

  // Tombstones persistentes para garantia absoluta anti-ressurreição de itens deletados
  const [tombstones, setTombstones] = useState(() => getStoredTombstones())
  const tombstonesRef = useRef(tombstones)
  useEffect(() => { tombstonesRef.current = tombstones }, [tombstones])

  const registerTombstones = (ids) => {
    const targetIds = Array.isArray(ids) ? ids : [ids]
    if (targetIds.length === 0) return
    const now = Date.now()
    setTombstones(prev => {
      const next = { ...prev }
      targetIds.forEach(id => {
        if (id) next[id] = now
      })
      try {
        localStorage.setItem(STORAGE_KEY_TOMBSTONES, JSON.stringify(next))
      } catch {}
      tombstonesRef.current = next
      return next
    })
  }

  const clearTombstones = (ids) => {
    const targetIds = Array.isArray(ids) ? ids : [ids]
    if (targetIds.length === 0) return
    setTombstones(prev => {
      let changed = false
      const next = { ...prev }
      targetIds.forEach(id => {
        if (id && next[id]) {
          delete next[id]
          changed = true
        }
      })
      if (!changed) return prev
      try {
        localStorage.setItem(STORAGE_KEY_TOMBSTONES, JSON.stringify(next))
      } catch {}
      tombstonesRef.current = next
      return next
    })
  }

  // Initialize state with automated fallback to previous storage keys and snapshots
  const [demandas, setDemandas] = useState(() =>
    loadStorageWithFallback(STORAGE_KEY_DEMANDAS, ['reuni_financeiro_demandas', 'reuni_demandas'], DEFAULT_DEMANDAS)
  )

  const [arrecadacoes, setArrecadacoes] = useState(() =>
    loadStorageWithFallback(STORAGE_KEY_ARRECADACAO, ['reuni_financeiro_arrecadacao', 'reuni_arrecadacoes'], DEFAULT_ARRECADACAO)
  )

  const [transacoes, setTransacoes] = useState(() =>
    loadStorageWithFallback(STORAGE_KEY_TRANSACOES, ['reuni_financeiro_transacoes', 'reuni_transacoes'], DEFAULT_TRANSACOES)
  )

  const [bazarItems, setBazarItems] = useState(() =>
    loadStorageWithFallback(STORAGE_KEY_BAZAR, ['reuni_financeiro_bazar', 'reuni_bazar'], DEFAULT_BAZAR)
  )

  const [keepNotes, setKeepNotes] = useState(() =>
    loadStorageWithFallback(STORAGE_KEY_KEEP, ['reuni_keep_notes', 'reuni_keep'], DEFAULT_KEEP)
  )

  const [inventarioItems, setInventarioItems] = useState(() =>
    loadStorageWithFallback(STORAGE_KEY_INVENTARIO, ['reuni_financeiro_inventario', 'reuni_inventario'], DEFAULT_INVENTARIO)
  )

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('reuni_theme') || 'dark'
  })

  // Refs for current state to eliminate closure stale state issues
  const demandasRef = useRef(demandas)
  const arrecadacoesRef = useRef(arrecadacoes)
  const transacoesRef = useRef(transacoes)
  const bazarItemsRef = useRef(bazarItems)
  const keepNotesRef = useRef(keepNotes)
  const inventarioItemsRef = useRef(inventarioItems)

  useEffect(() => { demandasRef.current = demandas }, [demandas])
  useEffect(() => { arrecadacoesRef.current = arrecadacoes }, [arrecadacoes])
  useEffect(() => { transacoesRef.current = transacoes }, [transacoes])
  useEffect(() => { bazarItemsRef.current = bazarItems }, [bazarItems])
  useEffect(() => { keepNotesRef.current = keepNotes }, [keepNotes])
  useEffect(() => { inventarioItemsRef.current = inventarioItems }, [inventarioItems])

  // Controle de base sincronizada, fila persistente (Outbox) e assinatura lógica (sem depender de Date.now() do cliente)
  const syncedBaseRef = useRef(getInitialSyncedBase())
  const baseRevisionRef = useRef(Number(localStorage.getItem(STORAGE_KEY_SYNCED_BASE_REV)) || 0)
  const baseUpdatedAtRef = useRef(getInitialBaseUpdatedAt())
  const hasSyncedV3Ref = useRef(localStorage.getItem(STORAGE_KEY_V3_INITIALIZED) === '1')
  const lastAppliedSignatureRef = useRef('')
  const pendingOpsRef = useRef(getStoredPendingOps())
  const isFlushingRef = useRef(false)
  const retryTimeoutRef = useRef(null)

  const savePendingOpsQueue = (nextQueue) => {
    pendingOpsRef.current = nextQueue
    setPendingOpsCount(nextQueue.length)
    try {
      localStorage.setItem(STORAGE_KEY_PENDING_OPS, JSON.stringify(nextQueue))
    } catch {}
  }

  const enqueueOps = (ops, tag = 'mutation') => {
    if (!Array.isArray(ops) || ops.length === 0) return
    const currentQueue = [...pendingOpsRef.current]
    if (tag === 'corrective') {
      const filtered = currentQueue.filter(entry => entry.tag !== 'corrective')
      filtered.push({
        batchId: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tag: 'corrective',
        minRevision: baseRevisionRef.current,
        ops
      })
      savePendingOpsQueue(filtered)
      return
    }
    currentQueue.push({
      batchId: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tag,
      minRevision: baseRevisionRef.current,
      ops
    })
    savePendingOpsQueue(currentQueue)
  }

  const hasAnyDirtyLocalItem = () => {
    const allLists = [
      demandasRef.current,
      arrecadacoesRef.current,
      transacoesRef.current,
      bazarItemsRef.current,
      keepNotesRef.current,
      inventarioItemsRef.current
    ]
    return allLists.some(list => Array.isArray(list) && list.some(item => item && item._dirty))
  }

  const persistAllCollectionsToStorage = (stateObj) => {
    try {
      localStorage.setItem(STORAGE_KEY_DEMANDAS, JSON.stringify(stateObj.demandas))
      localStorage.setItem(STORAGE_KEY_ARRECADACAO, JSON.stringify(stateObj.arrecadacoes))
      localStorage.setItem(STORAGE_KEY_TRANSACOES, JSON.stringify(stateObj.transacoes))
      localStorage.setItem(STORAGE_KEY_BAZAR, JSON.stringify(stateObj.bazarItems))
      localStorage.setItem(STORAGE_KEY_KEEP, JSON.stringify(stateObj.keepNotes))
      localStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(stateObj.inventarioItems))
    } catch {}
  }

  const scheduleFlushRetry = (delayMs = 4000) => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null
      flushPendingOps()
    }, delayMs)
  }

  const flushPendingOps = async () => {
    if (isFlushingRef.current) return
    const snapshotQueue = [...pendingOpsRef.current]
    if (snapshotQueue.length === 0) return

    isFlushingRef.current = true
    setSyncStatus('syncing')

    const batchIdsToAck = new Set(snapshotQueue.map(b => b.batchId))
    const flatOps = snapshotQueue.flatMap(b => b.ops || [])
    const maxMinRev = snapshotQueue.reduce(
      (acc, b) => Math.max(acc, Number(b.minRevision) || 0),
      baseRevisionRef.current
    )

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)
      const res = await fetch('/api/mutate', {
        method: 'POST',
        cache: 'no-store',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ops: flatOps, minRevision: maxMinRev })
      })
      clearTimeout(timeoutId)

      if (res.status === 401) {
        setSyncStatus('auth_error')
        isFlushingRef.current = false
        return
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const result = await res.json()
      if (result && result.success && result.data) {
        const remaining = pendingOpsRef.current.filter(b => !batchIdsToAck.has(b.batchId))
        savePendingOpsQueue(remaining)
        isFlushingRef.current = false
        applyServerData(result.data, { fromMutationAck: true })
        if (remaining.length > 0) {
          flushPendingOps()
        }
        return
      }
      throw new Error(result?.error || 'Resposta inválida do servidor')
    } catch {
      isFlushingRef.current = false
      setSyncStatus('pending')
      scheduleFlushRetry(4000)
    }
  }

  const applyServerData = (data, options = {}) => {
    if (!data || typeof data !== 'object') return

    const incomingSignature = computeServerSignature(data)
    if (
      !options.force &&
      !options.fromMutationAck &&
      hasSyncedV3Ref.current &&
      incomingSignature === lastAppliedSignatureRef.current &&
      pendingOpsRef.current.length === 0 &&
      !hasAnyDirtyLocalItem()
    ) {
      setSyncStatus('synced')
      return
    }

    const currentLocalState = {
      demandas: demandasRef.current,
      arrecadacoes: arrecadacoesRef.current,
      transacoes: transacoesRef.current,
      bazarItems: bazarItemsRef.current,
      keepNotes: keepNotesRef.current,
      inventarioItems: inventarioItemsRef.current
    }

    const {
      mergedState,
      mergedTombstones,
      tombstonesChanged,
      correctiveOps,
      cleanBaseCandidate,
      nextBaseRevision
    } = reconcileStateWithServer({
      localState: currentLocalState,
      baseState: syncedBaseRef.current,
      baseRevision: baseRevisionRef.current,
      baseUpdatedAt: baseUpdatedAtRef.current,
      serverData: data,
      localTombstones: tombstonesRef.current,
      hasSyncedV3Before: hasSyncedV3Ref.current
    })

    if (tombstonesChanged) {
      tombstonesRef.current = mergedTombstones
      setTombstones(mergedTombstones)
      try {
        localStorage.setItem(STORAGE_KEY_TOMBSTONES, JSON.stringify(mergedTombstones))
      } catch {}
    }

    demandasRef.current = mergedState.demandas
    arrecadacoesRef.current = mergedState.arrecadacoes
    transacoesRef.current = mergedState.transacoes
    bazarItemsRef.current = mergedState.bazarItems
    keepNotesRef.current = mergedState.keepNotes
    inventarioItemsRef.current = mergedState.inventarioItems

    setDemandas(mergedState.demandas)
    setArrecadacoes(mergedState.arrecadacoes)
    setTransacoes(mergedState.transacoes)
    setBazarItems(mergedState.bazarItems)
    setKeepNotes(mergedState.keepNotes)
    setInventarioItems(mergedState.inventarioItems)

    persistAllCollectionsToStorage(mergedState)
    lastAppliedSignatureRef.current = incomingSignature

    if (correctiveOps.length > 0) {
      enqueueOps(correctiveOps, 'corrective')
      flushPendingOps()
      return
    }

    if (pendingOpsRef.current.length > 0) {
      flushPendingOps()
      return
    }

    // Convergência total atingida entre este dispositivo e o servidor!
    syncedBaseRef.current = cleanBaseCandidate
    baseRevisionRef.current = nextBaseRevision
    baseUpdatedAtRef.current = Number(data.updatedAt) || baseUpdatedAtRef.current
    hasSyncedV3Ref.current = true

    try {
      localStorage.setItem(STORAGE_KEY_SYNCED_BASE, JSON.stringify(cleanBaseCandidate))
      localStorage.setItem(STORAGE_KEY_SYNCED_BASE_REV, String(nextBaseRevision))
      localStorage.setItem(STORAGE_KEY_SYNCED_BASE_TS, String(baseUpdatedAtRef.current))
      localStorage.setItem(STORAGE_KEY_V3_INITIALIZED, '1')
      localStorage.setItem('reuni_emergency_snapshot', JSON.stringify({
        data: { ...cleanBaseCandidate, revision: nextBaseRevision, updatedAt: baseUpdatedAtRef.current },
        timestamp: Date.now()
      }))
    } catch {}

    setSyncStatus('synced')
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLastSaved(`Rev #${nextBaseRevision || 1} · ${hora}`)
  }

  const pushStateToServer = (updatedState = {}, ops = []) => {
    const nextState = {
      demandas: updatedState.demandas !== undefined ? updatedState.demandas : demandasRef.current,
      arrecadacoes: updatedState.arrecadacoes !== undefined ? updatedState.arrecadacoes : arrecadacoesRef.current,
      transacoes: updatedState.transacoes !== undefined ? updatedState.transacoes : transacoesRef.current,
      bazarItems: updatedState.bazarItems !== undefined ? updatedState.bazarItems : bazarItemsRef.current,
      keepNotes: updatedState.keepNotes !== undefined ? updatedState.keepNotes : keepNotesRef.current,
      inventarioItems: updatedState.inventarioItems !== undefined ? updatedState.inventarioItems : inventarioItemsRef.current
    }

    demandasRef.current = nextState.demandas
    arrecadacoesRef.current = nextState.arrecadacoes
    transacoesRef.current = nextState.transacoes
    bazarItemsRef.current = nextState.bazarItems
    keepNotesRef.current = nextState.keepNotes
    inventarioItemsRef.current = nextState.inventarioItems

    // 1. Persiste imediatamente no localStorage (latência zero)
    persistAllCollectionsToStorage(nextState)

    // 2. Grava na fila persistente Outbox antes da rede e dispara envio atômico com retry
    if (ops.length > 0) {
      enqueueOps(ops, 'mutation')
      flushPendingOps()
    }
  }

  const forceSyncNow = async () => {
    setSyncStatus('syncing')
    if (pendingOpsRef.current.length > 0) {
      await flushPendingOps()
    }
    try {
      const res = await fetch('/api/data', {
        cache: 'no-store',
        headers: { ...authHeaders() }
      })
      if (res.status === 401) {
        setSyncStatus('auth_error')
        return false
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      applyServerData(data, { force: true })
      return true
    } catch {
      setSyncStatus(pendingOpsRef.current.length > 0 ? 'pending' : 'offline')
      return false
    }
  }

  // Real-time EventSource connection, initial reconciliation, online/visibility recovery & heartbeat
  useEffect(() => {
    const syncFromServer = (force = false) => {
      if (pendingOpsRef.current.length > 0) {
        flushPendingOps()
      }
      fetch('/api/data', {
        cache: 'no-store',
        headers: { ...authHeaders() }
      })
        .then(res => {
          if (res.status === 401) {
            setSyncStatus('auth_error')
            return null
          }
          if (!res.ok) throw new Error('Falha ao consultar /api/data')
          return res.json()
        })
        .then(data => {
          if (data) applyServerData(data, { force })
        })
        .catch(() => {
          setSyncStatus(pendingOpsRef.current.length > 0 ? 'pending' : 'offline')
        })
    }

    syncFromServer(true)

    // EventSource nativo não manda header customizado, então o token vai
    // como query string aqui (mesmo mecanismo de auth.js, aceito via ?token=)
    let eventSource
    try {
      const token = getAccessToken()
      eventSource = new EventSource(`/api/events${token ? `?token=${encodeURIComponent(token)}` : ''}`)
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          applyServerData(data)
        } catch {}
      }
    } catch {}

    const handleOnline = () => syncFromServer(true)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncFromServer(false)
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    const intervalId = setInterval(() => {
      syncFromServer(false)
    }, 20000)

    return () => {
      if (eventSource) eventSource.close()
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('reuni_theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Demanda handlers
  const addDemanda = (demanda) => {
    const newDemanda = markLocalCreated({
      ...demanda,
      id: Date.now().toString(),
      data: new Date().toISOString().split('T')[0]
    })
    clearTombstones(newDemanda.id)
    const updated = [newDemanda, ...demandasRef.current]
    demandasRef.current = updated
    setDemandas(updated)
    pushStateToServer({ demandas: updated }, [{ op: 'create', colecao: 'demandas', item: newDemanda }])
  }

  const updateDemanda = (id, updatedFields) => {
    const updated = demandasRef.current.map(d => (d.id === id ? markLocalUpdated(d, updatedFields) : d))
    demandasRef.current = updated
    setDemandas(updated)
    pushStateToServer({ demandas: updated }, [{ op: 'update', colecao: 'demandas', id, fields: updatedFields }])
  }

  const deleteDemanda = (id) => {
    registerTombstones(id)
    const updated = demandasRef.current.filter(d => d.id !== id)
    demandasRef.current = updated
    setDemandas(updated)
    pushStateToServer({ demandas: updated }, [{ op: 'delete', colecao: 'demandas', id }])
  }

  // Passa pelo gate conciliador-demandas -> avaliador-financeiro no
  // servidor (nunca no cliente — checagem de duplicidade precisa do
  // estado real, não de uma cópia que este navegador tem). O status
  // "Pago" é sempre gravado; a transação só é criada se aprovada.
  // comprovanteFile é opcional — quando informado, o servidor roda o
  // extrator-comprovante de verdade (Gemini) antes de avaliar.
  const pagarDemanda = (id, comprovanteFile = null) => {
    const demandaAtual = demandasRef.current.find(d => d.id === id)
    if (!demandaAtual || demandaAtual.status === 'Pago') return

    const updatedOtimista = demandasRef.current.map(d =>
      d.id === id ? markLocalUpdated(d, { status: 'Pago' }) : d
    )
    demandasRef.current = updatedOtimista
    setDemandas(updatedOtimista)
    try {
      localStorage.setItem(STORAGE_KEY_DEMANDAS, JSON.stringify(updatedOtimista))
    } catch {}
    setSyncStatus('syncing')

    const enviar = (comprovantePayload) => {
      fetch('/api/demandas/pagar', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ demandaId: id, ...(comprovantePayload ? { comprovante: comprovantePayload } : {}) })
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then(result => {
          if (result && result.success && result.data) {
            applyServerData(result.data, { fromMutationAck: true })
            if (result.erroExtracao) {
              alert(
                `Comprovante anexado, mas a extração automática falhou:\n\n${result.erroExtracao}\n\n` +
                `O pagamento seguiu sem extração (confiança baixa, revisão humana).`
              )
            }
            if (result.avaliacao && !result.avaliacao.aprovado) {
              alert(
                `Demanda marcada como paga, mas o lançamento automático da transação NÃO foi feito:\n\n` +
                `${result.avaliacao.justificativa}\n\n` +
                `Alertas: ${result.avaliacao.alertas.join(', ') || 'nenhum'}\n\n` +
                `Lance manualmente em Gestão de Caixa depois de conferir.`
              )
            }
          } else if (result && result.error) {
            alert(`Não foi possível processar o pagamento: ${result.error}`)
          }
        })
        .catch(() => {
          enqueueOps([{ op: 'update', colecao: 'demandas', id, fields: { status: 'Pago' } }], 'mutation')
          setSyncStatus('pending')
          scheduleFlushRetry(4000)
        })
    }

    if (comprovanteFile) {
      const reader = new FileReader()
      reader.onload = () => {
        enviar({ base64: reader.result, mimeType: comprovanteFile.type, fileName: comprovanteFile.name })
      }
      reader.onerror = () => enviar(null)
      reader.readAsDataURL(comprovanteFile)
    } else {
      enviar(null)
    }
  }

  const updateDemandaStatus = (id, newStatus) => {
    const demandaAtual = demandasRef.current.find(d => d.id === id)
    const vaiVirarPago = newStatus === 'Pago' && demandaAtual && demandaAtual.status !== 'Pago'

    if (vaiVirarPago) {
      pagarDemanda(id, null)
      return
    }

    const updated = demandasRef.current.map(d =>
      d.id === id ? markLocalUpdated(d, { status: newStatus }) : d
    )
    demandasRef.current = updated
    setDemandas(updated)
    pushStateToServer({ demandas: updated }, [{ op: 'update', colecao: 'demandas', id, fields: { status: newStatus } }])
  }

  // Arrecadacao handlers
  const addArrecadacao = (item) => {
    const newItem = markLocalCreated({
      ...item,
      id: Date.now().toString(),
      atual: Number(item.atual) || 0,
      meta: Number(item.meta) || 0
    })
    clearTombstones(newItem.id)
    const updated = [newItem, ...arrecadacoesRef.current]
    arrecadacoesRef.current = updated
    setArrecadacoes(updated)
    pushStateToServer({ arrecadacoes: updated }, [{ op: 'create', colecao: 'arrecadacoes', item: newItem }])
  }

  const updateArrecadacao = (id, updatedFields) => {
    const computedFields = {
      ...updatedFields,
      ...(updatedFields.meta !== undefined ? { meta: Number(updatedFields.meta) } : {}),
      ...(updatedFields.atual !== undefined ? { atual: Number(updatedFields.atual) } : {})
    }
    const updated = arrecadacoesRef.current.map(item =>
      item.id === id ? markLocalUpdated(item, computedFields) : item
    )
    arrecadacoesRef.current = updated
    setArrecadacoes(updated)
    pushStateToServer({ arrecadacoes: updated }, [{ op: 'update', colecao: 'arrecadacoes', id, fields: computedFields }])
  }

  const updateArrecadacaoValor = (id, valorAdicional, descricaoTransacao, comprovanteUrl = null, dadosVenda = {}) => {
    let newTransacoes = transacoesRef.current
    let arrecadacaoFieldsAtualizados = null
    let transacaoCriada = null
    const updated = arrecadacoesRef.current.map(item => {
      if (item.id === id) {
        const novoAtual = Number(item.atual) + Number(valorAdicional)
        const novoStatus = novoAtual >= item.meta ? 'Concluído' : item.status
        const now = new Date()
        const dataHoraFormatada = dadosVenda.dataHora || `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

        let descDetalhada = descricaoTransacao || `Arrecadação: ${item.nome}`
        if (dadosVenda.vendedor) {
          descDetalhada += ` (Vendedor: ${dadosVenda.vendedor}`
          if (dadosVenda.qtdBilhetes) descDetalhada += ` • ${dadosVenda.qtdBilhetes} bilhetes`
          if (dadosVenda.numerosBilhetes) descDetalhada += ` [Nº ${dadosVenda.numerosBilhetes}]`
          descDetalhada += `)`
        }

        const newTrans = markLocalCreated({
          id: Date.now().toString(),
          data: new Date().toISOString().split('T')[0],
          descricao: descDetalhada,
          tipo: 'Entrada',
          valor: Number(valorAdicional),
          categoria: item.tipo,
          comprovanteUrl: comprovanteUrl,
          vendedor: dadosVenda.vendedor,
          qtdBilhetes: dadosVenda.qtdBilhetes,
          numerosBilhetes: dadosVenda.numerosBilhetes,
          comprador: dadosVenda.comprador,
          dataHora: dataHoraFormatada
        })
        clearTombstones(newTrans.id)
        newTransacoes = [newTrans, ...transacoesRef.current]
        transacoesRef.current = newTransacoes
        setTransacoes(newTransacoes)
        transacaoCriada = newTrans
        arrecadacaoFieldsAtualizados = { atual: novoAtual, status: novoStatus }

        return markLocalUpdated(item, arrecadacaoFieldsAtualizados)
      }
      return item
    })
    arrecadacoesRef.current = updated
    setArrecadacoes(updated)
    if (arrecadacaoFieldsAtualizados && transacaoCriada) {
      pushStateToServer({ arrecadacoes: updated, transacoes: newTransacoes }, [
        { op: 'update', colecao: 'arrecadacoes', id, fields: arrecadacaoFieldsAtualizados },
        { op: 'create', colecao: 'transacoes', item: transacaoCriada }
      ])
    }
  }

  const deleteArrecadacao = (id) => {
    registerTombstones(id)
    const updated = arrecadacoesRef.current.filter(a => a.id !== id)
    arrecadacoesRef.current = updated
    setArrecadacoes(updated)
    pushStateToServer({ arrecadacoes: updated }, [{ op: 'delete', colecao: 'arrecadacoes', id }])
  }

  // Bazar handlers
  const addBazarItem = (item) => {
    const now = new Date()
    const dataHoraNow = item.dataHoraRecebimento || `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

    const newItem = markLocalCreated({
      ...item,
      id: Date.now().toString(),
      precoAvaliado: Number(item.precoAvaliado) || 0,
      status: item.status || 'Em Avaliação',
      dataCadastro: new Date().toISOString().split('T')[0],
      dataHoraRecebimento: dataHoraNow
    })
    clearTombstones(newItem.id)
    const updated = [newItem, ...bazarItemsRef.current]
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated }, [{ op: 'create', colecao: 'bazarItems', item: newItem }])
  }

  const updateBazarItem = (id, updatedFields) => {
    const computedFields = {
      ...updatedFields,
      ...(updatedFields.precoAvaliado !== undefined ? { precoAvaliado: Number(updatedFields.precoAvaliado) } : {})
    }
    const updated = bazarItemsRef.current.map(item =>
      item.id === id ? markLocalUpdated(item, computedFields) : item
    )
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated }, [{ op: 'update', colecao: 'bazarItems', id, fields: computedFields }])
  }

  const updateBazarItemStatus = (id, newStatus) => {
    const updated = bazarItemsRef.current.map(item =>
      item.id === id ? markLocalUpdated(item, { status: newStatus }) : item
    )
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated }, [{ op: 'update', colecao: 'bazarItems', id, fields: { status: newStatus } }])
  }

  const venderBazarItem = (id, valorFinal, comprador, comprovanteUrl, vendedorBalcao = '', dataHoraVendaInput = '') => {
    const now = new Date()
    const dataHoraVenda = dataHoraVendaInput || `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

    let newTransacoes = transacoesRef.current
    let bazarItemFieldsAtualizados = null
    let transacaoCriada = null
    const updated = bazarItemsRef.current.map(item => {
      if (item.id === id) {
        const valorVenda = Number(valorFinal) || Number(item.precoAvaliado)

        let descTransacao = `Venda Bazar [${item.categoria}]: ${item.nome}`
        if (vendedorBalcao) descTransacao += ` (Vendedor no Balcão: ${vendedorBalcao})`
        if (comprador) descTransacao += ` (Comprador: ${comprador})`

        const newTrans = markLocalCreated({
          id: Date.now().toString(),
          data: new Date().toISOString().split('T')[0],
          descricao: descTransacao,
          tipo: 'Entrada',
          valor: valorVenda,
          categoria: 'Bazar',
          comprovanteUrl: comprovanteUrl,
          vendedor: vendedorBalcao,
          comprador: comprador,
          dataHora: dataHoraVenda
        })
        clearTombstones(newTrans.id)
        newTransacoes = [newTrans, ...transacoesRef.current]
        transacoesRef.current = newTransacoes
        setTransacoes(newTransacoes)
        transacaoCriada = newTrans

        const camposAtualizados = {
          status: 'Vendido',
          precoVendido: valorVenda,
          comprador: comprador,
          vendedorBalcao: vendedorBalcao,
          comprovanteUrl: comprovanteUrl,
          dataVenda: new Date().toISOString().split('T')[0],
          dataHoraVenda: dataHoraVenda
        }
        bazarItemFieldsAtualizados = camposAtualizados

        return markLocalUpdated(item, camposAtualizados)
      }
      return item
    })
    bazarItemsRef.current = updated
    setBazarItems(updated)
    if (bazarItemFieldsAtualizados && transacaoCriada) {
      pushStateToServer({ bazarItems: updated, transacoes: newTransacoes }, [
        { op: 'update', colecao: 'bazarItems', id, fields: bazarItemFieldsAtualizados },
        { op: 'create', colecao: 'transacoes', item: transacaoCriada }
      ])
    }
  }

  const deleteBazarItem = (id) => {
    registerTombstones(id)
    const updated = bazarItemsRef.current.filter(b => b.id !== id)
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated }, [{ op: 'delete', colecao: 'bazarItems', id }])
  }

  // Transacoes handlers
  const addTransacao = (transacao) => {
    const newTransacao = markLocalCreated({
      ...transacao,
      id: Date.now().toString(),
      data: transacao.data || new Date().toISOString().split('T')[0],
      valor: Number(transacao.valor)
    })
    clearTombstones(newTransacao.id)
    const updated = [newTransacao, ...transacoesRef.current]
    transacoesRef.current = updated
    setTransacoes(updated)
    pushStateToServer({ transacoes: updated }, [{ op: 'create', colecao: 'transacoes', item: newTransacao }])
  }

  const updateTransacao = (id, updatedFields) => {
    const computedFields = {
      ...updatedFields,
      ...(updatedFields.valor !== undefined ? { valor: Number(updatedFields.valor) } : {})
    }
    const updated = transacoesRef.current.map(t =>
      t.id === id ? markLocalUpdated(t, computedFields) : t
    )
    transacoesRef.current = updated
    setTransacoes(updated)
    pushStateToServer({ transacoes: updated }, [{ op: 'update', colecao: 'transacoes', id, fields: computedFields }])
  }

  const deleteTransacao = (id) => {
    registerTombstones(id)
    const updated = transacoesRef.current.filter(t => t.id !== id)
    transacoesRef.current = updated
    setTransacoes(updated)
    pushStateToServer({ transacoes: updated }, [{ op: 'delete', colecao: 'transacoes', id }])
  }

  const attachComprovanteToTransacao = (transacaoId, comprovanteUrl) => {
    const updated = transacoesRef.current.map(t =>
      t.id === transacaoId ? markLocalUpdated(t, { comprovanteUrl }) : t
    )
    transacoesRef.current = updated
    setTransacoes(updated)
    pushStateToServer({ transacoes: updated }, [{ op: 'update', colecao: 'transacoes', id: transacaoId, fields: { comprovanteUrl } }])
  }

  // Keep / Informações Handlers
  const addKeepNote = (note) => {
    const newNote = markLocalCreated({
      ...note,
      id: Date.now().toString(),
      dataCriacao: new Date().toISOString().split('T')[0],
      cor: note.cor || 'default',
      isPinned: note.isPinned || false,
      tags: note.tags || []
    })
    clearTombstones(newNote.id)
    const updated = [newNote, ...keepNotesRef.current]
    keepNotesRef.current = updated
    setKeepNotes(updated)
    pushStateToServer({ keepNotes: updated }, [{ op: 'create', colecao: 'keepNotes', item: newNote }])
  }

  const updateKeepNote = (id, updatedFields) => {
    const updated = keepNotesRef.current.map(note =>
      note.id === id ? markLocalUpdated(note, updatedFields) : note
    )
    keepNotesRef.current = updated
    setKeepNotes(updated)
    pushStateToServer({ keepNotes: updated }, [{ op: 'update', colecao: 'keepNotes', id, fields: updatedFields }])
  }

  const togglePinKeepNote = (id) => {
    let novoIsPinned = null
    const updated = keepNotesRef.current.map(note => {
      if (note.id === id) {
        novoIsPinned = !note.isPinned
        return markLocalUpdated(note, { isPinned: novoIsPinned })
      }
      return note
    })
    keepNotesRef.current = updated
    setKeepNotes(updated)
    if (novoIsPinned !== null) {
      pushStateToServer({ keepNotes: updated }, [{ op: 'update', colecao: 'keepNotes', id, fields: { isPinned: novoIsPinned } }])
    }
  }

  const deleteKeepNote = (id) => {
    registerTombstones(id)
    const updated = keepNotesRef.current.filter(note => note.id !== id)
    keepNotesRef.current = updated
    setKeepNotes(updated)
    pushStateToServer({ keepNotes: updated }, [{ op: 'delete', colecao: 'keepNotes', id }])
  }

  const toggleChecklistItem = (noteId, itemId) => {
    let checklistItemsAtualizado = null
    const updated = keepNotesRef.current.map(note => {
      if (note.id === noteId && note.checklistItems) {
        const updatedItems = note.checklistItems.map(item => {
          if (item.id === itemId) {
            return { ...item, completed: !item.completed }
          }
          return item
        })
        checklistItemsAtualizado = updatedItems
        return markLocalUpdated(note, { checklistItems: updatedItems })
      }
      return note
    })
    keepNotesRef.current = updated
    setKeepNotes(updated)
    if (checklistItemsAtualizado !== null) {
      pushStateToServer({ keepNotes: updated }, [{ op: 'update', colecao: 'keepNotes', id: noteId, fields: { checklistItems: checklistItemsAtualizado } }])
    }
  }

  // Inventário Handlers
  const addInventarioItem = (item) => {
    const newItem = markLocalCreated({
      ...item,
      id: Date.now().toString(),
      quantidade: Number(item.quantidade) || 1,
      valorEstimadoEconomizado: Number(item.valorEstimadoEconomizado) || 0,
      dataCadastro: new Date().toISOString().split('T')[0]
    })
    clearTombstones(newItem.id)
    const updated = [newItem, ...inventarioItemsRef.current]
    inventarioItemsRef.current = updated
    setInventarioItems(updated)
    pushStateToServer({ inventarioItems: updated }, [{ op: 'create', colecao: 'inventarioItems', item: newItem }])
  }

  const updateInventarioItem = (id, updatedFields) => {
    const computedFields = {
      ...updatedFields,
      ...(updatedFields.quantidade !== undefined ? { quantidade: Number(updatedFields.quantidade) } : {}),
      ...(updatedFields.valorEstimadoEconomizado !== undefined ? { valorEstimadoEconomizado: Number(updatedFields.valorEstimadoEconomizado) } : {})
    }
    const updated = inventarioItemsRef.current.map(item =>
      item.id === id ? markLocalUpdated(item, computedFields) : item
    )
    inventarioItemsRef.current = updated
    setInventarioItems(updated)
    pushStateToServer({ inventarioItems: updated }, [{ op: 'update', colecao: 'inventarioItems', id, fields: computedFields }])
  }

  const deleteInventarioItem = (id) => {
    registerTombstones(id)
    const updated = inventarioItemsRef.current.filter(item => item.id !== id)
    inventarioItemsRef.current = updated
    setInventarioItems(updated)
    pushStateToServer({ inventarioItems: updated }, [{ op: 'delete', colecao: 'inventarioItems', id }])
  }

  const wipeAllCollectionsAndTombstone = () => {
    const ops = []
    const collectionsWithRefs = [
      ['demandas', demandasRef.current],
      ['arrecadacoes', arrecadacoesRef.current],
      ['transacoes', transacoesRef.current],
      ['bazarItems', bazarItemsRef.current],
      ['keepNotes', keepNotesRef.current],
      ['inventarioItems', inventarioItemsRef.current]
    ]
    const allIds = []
    for (const [col, arr] of collectionsWithRefs) {
      const ids = (arr || []).map(i => i?.id).filter(Boolean)
      if (ids.length > 0) {
        allIds.push(...ids)
        ops.push({ op: 'deleteMany', colecao: col, ids })
      }
      ops.push({ op: 'replaceAll', colecao: col, items: [] })
    }
    if (allIds.length > 0) registerTombstones(allIds)

    demandasRef.current = []
    arrecadacoesRef.current = []
    transacoesRef.current = []
    bazarItemsRef.current = []
    keepNotesRef.current = []
    inventarioItemsRef.current = []

    setDemandas([])
    setArrecadacoes([])
    setTransacoes([])
    setBazarItems([])
    setKeepNotes([])
    setInventarioItems([])

    pushStateToServer({
      demandas: [],
      arrecadacoes: [],
      transacoes: [],
      bazarItems: [],
      keepNotes: [],
      inventarioItems: []
    }, ops)
  }

  const resetToDefault = () => wipeAllCollectionsAndTombstone()
  const clearAllData = () => wipeAllCollectionsAndTombstone()

  // Calculated values
  const totalArrecadado = transacoes
    .filter(t => t.tipo === 'Entrada')
    .reduce((sum, t) => sum + Number(t.valor), 0)

  const totalGastos = transacoes
    .filter(t => t.tipo === 'Saída')
    .reduce((sum, t) => sum + Number(t.valor), 0)

  const saldoAtual = totalArrecadado - totalGastos

  const totalDemandasPrevistas = demandas
    .reduce((sum, d) => sum + Number(d.custo), 0)

  const metaArrecadacaoTotal = arrecadacoes
    .reduce((sum, a) => sum + Number(a.meta), 0)

  const uploadDocument = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = reader.result
          const res = await fetch('/api/documents/upload', {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              base64
            })
          })
          const data = await res.json()
          if (data.success) {
            resolve(data)
          } else {
            reject(new Error(data.error || 'Erro ao realizar upload'))
          }
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = error => reject(error)
      reader.readAsDataURL(file)
    })
  }

  const deleteDocument = async (comprovanteUrl) => {
    if (!comprovanteUrl || !comprovanteUrl.startsWith('/api/documents/')) return
    const fileId = comprovanteUrl.split('/').pop().split('?')[0]
    try {
      await fetch(`/api/documents/${fileId}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: { ...authHeaders() }
      })
    } catch {}
  }

  // Importação atômica em lote com identificador de lote e suporte a desfazer/excluir
  const importBatch = async ({ demandas: impDemandas = [], arrecadacoes: impArrecadacoes = [], transacoes: impTransacoes = [], bazar: impBazar = [], inventario: impInventario = [], keep: impKeep = [] }) => {
    const ops = []
    const loteId = 'lote_' + Date.now()
    const allNewIds = []

    let nextDemandas = demandasRef.current
    if (impDemandas.length > 0) {
      const formatted = impDemandas.map((d, idx) => markLocalCreated({
        ...d,
        id: d.id || ('demanda_imp_' + (idx + 1) + '_' + Date.now()),
        data: d.data || new Date().toISOString().split('T')[0],
        importLoteId: loteId,
        origem: 'planilha'
      }))
      formatted.forEach(item => allNewIds.push(item.id))
      nextDemandas = [...formatted, ...nextDemandas]
      demandasRef.current = nextDemandas
      setDemandas(nextDemandas)
      ops.push({ op: 'createMany', colecao: 'demandas', items: formatted })
    }

    let nextArrecadacoes = arrecadacoesRef.current
    if (impArrecadacoes.length > 0) {
      const formatted = impArrecadacoes.map((a, idx) => markLocalCreated({
        ...a,
        id: a.id || ('arrec_imp_' + (idx + 1) + '_' + Date.now()),
        atual: Number(a.atual) || 0,
        meta: Number(a.meta) || 0,
        importLoteId: loteId,
        origem: 'planilha'
      }))
      formatted.forEach(item => allNewIds.push(item.id))
      nextArrecadacoes = [...formatted, ...nextArrecadacoes]
      arrecadacoesRef.current = nextArrecadacoes
      setArrecadacoes(nextArrecadacoes)
      ops.push({ op: 'createMany', colecao: 'arrecadacoes', items: formatted })
    }

    let nextTransacoes = transacoesRef.current
    if (impTransacoes.length > 0) {
      const formatted = impTransacoes.map((t, idx) => markLocalCreated({
        ...t,
        id: t.id || ('trans_imp_' + (idx + 1) + '_' + Date.now()),
        data: t.data || new Date().toISOString().split('T')[0],
        valor: Number(t.valor) || 0,
        importLoteId: loteId,
        origem: 'planilha'
      }))
      formatted.forEach(item => allNewIds.push(item.id))
      nextTransacoes = [...formatted, ...nextTransacoes]
      transacoesRef.current = nextTransacoes
      setTransacoes(nextTransacoes)
      ops.push({ op: 'createMany', colecao: 'transacoes', items: formatted })
    }

    let nextBazar = bazarItemsRef.current
    if (impBazar.length > 0) {
      const formatted = impBazar.map((b, idx) => markLocalCreated({
        ...b,
        id: b.id || ('bazar_imp_' + (idx + 1) + '_' + Date.now()),
        precoAvaliado: Number(b.precoAvaliado) || 0,
        dataCadastro: b.dataCadastro || new Date().toISOString().split('T')[0],
        importLoteId: loteId,
        origem: 'planilha'
      }))
      formatted.forEach(item => allNewIds.push(item.id))
      nextBazar = [...formatted, ...nextBazar]
      bazarItemsRef.current = nextBazar
      setBazarItems(nextBazar)
      ops.push({ op: 'createMany', colecao: 'bazarItems', items: formatted })
    }

    let nextInventario = inventarioItemsRef.current
    if (impInventario.length > 0) {
      const formatted = impInventario.map((i, idx) => markLocalCreated({
        ...i,
        id: i.id || ('inv_imp_' + (idx + 1) + '_' + Date.now()),
        quantidade: Number(i.quantidade) || 1,
        valorEstimadoEconomizado: Number(i.valorEstimadoEconomizado) || 0,
        dataCadastro: i.dataCadastro || new Date().toISOString().split('T')[0],
        importLoteId: loteId,
        origem: 'planilha'
      }))
      formatted.forEach(item => allNewIds.push(item.id))
      nextInventario = [...formatted, ...nextInventario]
      inventarioItemsRef.current = nextInventario
      setInventarioItems(nextInventario)
      ops.push({ op: 'createMany', colecao: 'inventarioItems', items: formatted })
    }

    let nextKeep = keepNotesRef.current
    if (impKeep.length > 0) {
      const formatted = impKeep.map((k, idx) => markLocalCreated({
        ...k,
        id: k.id || ('keep_imp_' + (idx + 1) + '_' + Date.now()),
        dataCriacao: k.dataCriacao || new Date().toISOString().split('T')[0],
        importLoteId: loteId,
        origem: 'planilha'
      }))
      formatted.forEach(item => allNewIds.push(item.id))
      nextKeep = [...formatted, ...nextKeep]
      keepNotesRef.current = nextKeep
      setKeepNotes(nextKeep)
      ops.push({ op: 'createMany', colecao: 'keepNotes', items: formatted })
    }

    if (allNewIds.length > 0) {
      clearTombstones(allNewIds)
    }

    try {
      localStorage.setItem('reuni_last_import_lote', loteId)
    } catch {}

    pushStateToServer({
      demandas: nextDemandas,
      arrecadacoes: nextArrecadacoes,
      transacoes: nextTransacoes,
      bazarItems: nextBazar,
      inventarioItems: nextInventario,
      keepNotes: nextKeep
    }, ops)

    return {
      loteId,
      total: impDemandas.length + impArrecadacoes.length + impTransacoes.length + impBazar.length + impInventario.length + impKeep.length,
      counts: {
        demandas: impDemandas.length,
        arrecadacoes: impArrecadacoes.length,
        transacoes: impTransacoes.length,
        bazar: impBazar.length,
        inventario: impInventario.length,
        keep: impKeep.length
      }
    }
  }

  // Exclusão em lote otimizada de múltiplos IDs com garantia de tombstone
  const deleteBatch = (colecao, ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return
    registerTombstones(ids)
    const idSet = new Set(ids)

    if (colecao === 'demandas') {
      const updated = demandasRef.current.filter(d => !idSet.has(d.id))
      demandasRef.current = updated
      setDemandas(updated)
      pushStateToServer({ demandas: updated }, [{ op: 'deleteMany', colecao: 'demandas', ids }])
    } else if (colecao === 'arrecadacoes') {
      const updated = arrecadacoesRef.current.filter(a => !idSet.has(a.id))
      arrecadacoesRef.current = updated
      setArrecadacoes(updated)
      pushStateToServer({ arrecadacoes: updated }, [{ op: 'deleteMany', colecao: 'arrecadacoes', ids }])
    } else if (colecao === 'transacoes') {
      const updated = transacoesRef.current.filter(t => !idSet.has(t.id))
      transacoesRef.current = updated
      setTransacoes(updated)
      pushStateToServer({ transacoes: updated }, [{ op: 'deleteMany', colecao: 'transacoes', ids }])
    } else if (colecao === 'bazarItems') {
      const updated = bazarItemsRef.current.filter(b => !idSet.has(b.id))
      bazarItemsRef.current = updated
      setBazarItems(updated)
      pushStateToServer({ bazarItems: updated }, [{ op: 'deleteMany', colecao: 'bazarItems', ids }])
    } else if (colecao === 'inventarioItems') {
      const updated = inventarioItemsRef.current.filter(i => !idSet.has(i.id))
      inventarioItemsRef.current = updated
      setInventarioItems(updated)
      pushStateToServer({ inventarioItems: updated }, [{ op: 'deleteMany', colecao: 'inventarioItems', ids }])
    } else if (colecao === 'keepNotes') {
      const updated = keepNotesRef.current.filter(k => !idSet.has(k.id))
      keepNotesRef.current = updated
      setKeepNotes(updated)
      pushStateToServer({ keepNotes: updated }, [{ op: 'deleteMany', colecao: 'keepNotes', ids }])
    }
  }

  // Desfazer uma importação de planilha completa pelo ID do lote com sepultamento permanente dos IDs
  const undoImportBatch = (loteId) => {
    if (!loteId) return false
    const ops = []
    const updatedState = {}

    const filterLote = (list, colecaoNome) => {
      const toDelete = list.filter(item => item.importLoteId === loteId)
      if (toDelete.length > 0) {
        const ids = toDelete.map(item => item.id)
        registerTombstones(ids)
        ops.push({ op: 'deleteMany', colecao: colecaoNome, ids })
        return list.filter(item => item.importLoteId !== loteId)
      }
      return list
    }

    const nextDemandas = filterLote(demandasRef.current, 'demandas')
    if (nextDemandas !== demandasRef.current) {
      demandasRef.current = nextDemandas
      setDemandas(nextDemandas)
      updatedState.demandas = nextDemandas
    }
    const nextArrecadacoes = filterLote(arrecadacoesRef.current, 'arrecadacoes')
    if (nextArrecadacoes !== arrecadacoesRef.current) {
      arrecadacoesRef.current = nextArrecadacoes
      setArrecadacoes(nextArrecadacoes)
      updatedState.arrecadacoes = nextArrecadacoes
    }
    const nextTransacoes = filterLote(transacoesRef.current, 'transacoes')
    if (nextTransacoes !== transacoesRef.current) {
      transacoesRef.current = nextTransacoes
      setTransacoes(nextTransacoes)
      updatedState.transacoes = nextTransacoes
    }
    const nextBazar = filterLote(bazarItemsRef.current, 'bazarItems')
    if (nextBazar !== bazarItemsRef.current) {
      bazarItemsRef.current = nextBazar
      setBazarItems(nextBazar)
      updatedState.bazarItems = nextBazar
    }
    const nextInventario = filterLote(inventarioItemsRef.current, 'inventarioItems')
    if (nextInventario !== inventarioItemsRef.current) {
      inventarioItemsRef.current = nextInventario
      setInventarioItems(nextInventario)
      updatedState.inventarioItems = nextInventario
    }
    const nextKeep = filterLote(keepNotesRef.current, 'keepNotes')
    if (nextKeep !== keepNotesRef.current) {
      keepNotesRef.current = nextKeep
      setKeepNotes(nextKeep)
      updatedState.keepNotes = nextKeep
    }

    if (ops.length > 0) {
      pushStateToServer(updatedState, ops)
      try {
        if (localStorage.getItem('reuni_last_import_lote') === loteId) {
          localStorage.removeItem('reuni_last_import_lote')
        }
      } catch {}
      return true
    }
    return false
  }

  return (
    <FinanceContext.Provider value={{
      demandas,
      arrecadacoes,
      transacoes,
      bazarItems,
      keepNotes,
      inventarioItems,
      theme,
      lastSaved,
      syncStatus,
      pendingOpsCount,
      forceSyncNow,
      toggleTheme,
      uploadDocument,
      deleteDocument,
      importBatch,
      deleteBatch,
      undoImportBatch,
      addDemanda,
      updateDemanda,
      deleteDemanda,
      updateDemandaStatus,
      pagarDemanda,
      addArrecadacao,
      updateArrecadacao,
      updateArrecadacaoValor,
      deleteArrecadacao,
      addBazarItem,
      updateBazarItem,
      updateBazarItemStatus,
      venderBazarItem,
      deleteBazarItem,
      addTransacao,
      updateTransacao,
      deleteTransacao,
      attachComprovanteToTransacao,
      addKeepNote,
      updateKeepNote,
      togglePinKeepNote,
      deleteKeepNote,
      toggleChecklistItem,
      addInventarioItem,
      updateInventarioItem,
      deleteInventarioItem,
      resetToDefault,
      clearAllData,
      totalArrecadado,
      totalGastos,
      saldoAtual,
      totalDemandasPrevistas,
      metaArrecadacaoTotal
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) {
    throw new Error('useFinance deve ser usado dentro de um FinanceProvider')
  }
  return context
}
