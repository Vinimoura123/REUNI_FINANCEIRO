import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { authHeaders, getAccessToken } from '../lib/auth'

const FinanceContext = createContext()

const STORAGE_KEY_DEMANDAS = 'reuni_demandas_v2'
const STORAGE_KEY_ARRECADACAO = 'reuni_arrecadacoes_v2'
const STORAGE_KEY_TRANSACOES = 'reuni_transacoes_v2'
const STORAGE_KEY_BAZAR = 'reuni_bazar_v2'
const STORAGE_KEY_KEEP = 'reuni_keep_v2'
const STORAGE_KEY_INVENTARIO = 'reuni_inventario_v2'
const STORAGE_KEY_TOMBSTONES = 'reuni_tombstones_v2'

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
  } catch (e) {}
  return {}
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
  } catch (e) {}
  return defaultVal
}

export function FinanceProvider({ children }) {
  const [lastSaved, setLastSaved] = useState(null)

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
      } catch (e) {}
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
      } catch (e) {}
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

  const lastServerTimestamp = useRef(0)

  const autoRestoreServerFromLocal = () => {
    const currentTombstones = tombstonesRef.current || {}
    const filterLive = (list) => (Array.isArray(list) ? list.filter(i => i && i.id && !currentTombstones[i.id]) : [])

    const ops = []
    const liveDemandas = filterLive(demandasRef.current)
    if (liveDemandas.length > 0) {
      ops.push({ op: 'replaceAll', colecao: 'demandas', items: liveDemandas })
    }
    const liveTransacoes = filterLive(transacoesRef.current)
    if (liveTransacoes.length > 0) {
      ops.push({ op: 'replaceAll', colecao: 'transacoes', items: liveTransacoes })
    }
    const liveArrecadacoes = filterLive(arrecadacoesRef.current)
    if (liveArrecadacoes.length > 0) {
      ops.push({ op: 'replaceAll', colecao: 'arrecadacoes', items: liveArrecadacoes })
    }
    const liveBazar = filterLive(bazarItemsRef.current)
    if (liveBazar.length > 0) {
      ops.push({ op: 'replaceAll', colecao: 'bazarItems', items: liveBazar })
    }
    const liveKeep = filterLive(keepNotesRef.current)
    if (liveKeep.length > 0) {
      ops.push({ op: 'replaceAll', colecao: 'keepNotes', items: liveKeep })
    }
    const liveInv = filterLive(inventarioItemsRef.current)
    if (liveInv.length > 0) {
      ops.push({ op: 'replaceAll', colecao: 'inventarioItems', items: liveInv })
    }

    if (ops.length > 0) {
      console.warn('🛡️ [Proteção Anti-Wipe] Servidor vazio detectado. Restaurando dados locais no servidor automaticamente...')
      fetch('/api/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ops })
      })
        .then(res => res.json())
        .then(result => {
          if (result && result.success) {
            console.log('✅ [Proteção Anti-Wipe] Banco do servidor restaurado com sucesso a partir dos dados locais!')
          }
        })
        .catch(err => {
          console.error('Falha ao restaurar banco do servidor:', err)
        })
    }
  }

  const applyServerData = (data) => {
    if (!data || typeof data !== 'object') return
    const incomingTimestamp = data.updatedAt || 0

    // O servidor é a fonte única da verdade, mas não se payload for antigo
    if (incomingTimestamp && incomingTimestamp <= lastServerTimestamp.current) {
      return
    }

    const currentTombstones = tombstonesRef.current || {}

    // PROTEÇÃO CRÍTICA ANTI-WIPE:
    // Se o servidor estiver vazio (0 demandas, 0 transações, 0 arrecadações, etc.),
    // mas o cliente local já possui dados no cache/localStorage, NÃO permitir que
    // o servidor vazio destrua as informações do usuário. Em vez disso, envia os dados
    // do cliente para repovoar o servidor automaticamente!
    const serverVazio = (
      (!data.demandas || data.demandas.length === 0) &&
      (!data.transacoes || data.transacoes.length === 0) &&
      (!data.arrecadacoes || data.arrecadacoes.length === 0) &&
      (!data.bazarItems || data.bazarItems.length === 0) &&
      (!data.keepNotes || data.keepNotes.length === 0) &&
      (!data.inventarioItems || data.inventarioItems.length === 0)
    )

    const clienteTemDados = (
      (demandasRef.current && demandasRef.current.length > 0) ||
      (transacoesRef.current && transacoesRef.current.length > 0) ||
      (arrecadacoesRef.current && arrecadacoesRef.current.length > 0) ||
      (bazarItemsRef.current && bazarItemsRef.current.length > 0) ||
      (keepNotesRef.current && keepNotesRef.current.length > 0) ||
      (inventarioItemsRef.current && inventarioItemsRef.current.length > 0)
    )

    if (serverVazio && clienteTemDados) {
      autoRestoreServerFromLocal()
      return
    }

    lastServerTimestamp.current = incomingTimestamp

    // Se o servidor trouxe dados de volta de um restart ou backup que inclui
    // IDs de itens deletados anteriormente, NUNCA ressuscita no cliente,
    // e agenda a exclusão desses IDs no servidor imediatamente!
    const zombieOps = []
    const syncMissingOps = []

    const processCollection = (colName, serverList, currentLocalList, setter, storageKey) => {
      if (!Array.isArray(serverList)) return currentLocalList

      // 1. Filtra qualquer item deletado (Tombstone)
      const cleanServer = []
      const resurrectedIds = []

      serverList.forEach(item => {
        if (!item || !item.id) return
        if (currentTombstones[item.id]) {
          resurrectedIds.push(item.id)
        } else {
          cleanServer.push(item)
        }
      })

      if (resurrectedIds.length > 0) {
        zombieOps.push({ op: 'deleteMany', colecao: colName, ids: resurrectedIds })
      }

      // 2. Proteção Anti-Perda: Se o cliente cadastrou itens novos localmente
      // que ainda não existem no servidor (ex: servidor reiniciou), PRESERVA os itens locais!
      const cleanServerIdSet = new Set(cleanServer.map(i => i.id))
      const missingOnServer = []

      if (Array.isArray(currentLocalList)) {
        currentLocalList.forEach(localItem => {
          if (localItem && localItem.id && !currentTombstones[localItem.id] && !cleanServerIdSet.has(localItem.id)) {
            missingOnServer.push(localItem)
          }
        })
      }

      if (missingOnServer.length > 0) {
        syncMissingOps.push({ op: 'createMany', colecao: colName, items: missingOnServer })
      }

      const finalResult = [...missingOnServer, ...cleanServer]
      setter(finalResult)
      try { localStorage.setItem(storageKey, JSON.stringify(finalResult)) } catch (e) {}
      return finalResult
    }

    if (Array.isArray(data.demandas)) {
      demandasRef.current = processCollection('demandas', data.demandas, demandasRef.current, setDemandas, STORAGE_KEY_DEMANDAS)
    }
    if (Array.isArray(data.arrecadacoes)) {
      arrecadacoesRef.current = processCollection('arrecadacoes', data.arrecadacoes, arrecadacoesRef.current, setArrecadacoes, STORAGE_KEY_ARRECADACAO)
    }
    if (Array.isArray(data.transacoes)) {
      transacoesRef.current = processCollection('transacoes', data.transacoes, transacoesRef.current, setTransacoes, STORAGE_KEY_TRANSACOES)
    }
    if (Array.isArray(data.bazarItems)) {
      bazarItemsRef.current = processCollection('bazarItems', data.bazarItems, bazarItemsRef.current, setBazarItems, STORAGE_KEY_BAZAR)
    }
    if (Array.isArray(data.keepNotes)) {
      keepNotesRef.current = processCollection('keepNotes', data.keepNotes, keepNotesRef.current, setKeepNotes, STORAGE_KEY_KEEP)
    }
    if (Array.isArray(data.inventarioItems)) {
      inventarioItemsRef.current = processCollection('inventarioItems', data.inventarioItems, inventarioItemsRef.current, setInventarioItems, STORAGE_KEY_INVENTARIO)
    }

    // Se foram detectados itens zumbis ou itens locais faltando no servidor,
    // dispara a sincronização corretiva silenciosa para o servidor
    const correctiveOps = [...zombieOps, ...syncMissingOps]
    if (correctiveOps.length > 0) {
      fetch('/api/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ops: correctiveOps })
      }).catch(() => {})
    }

    // Snapshot de emergência para recuperação em caso de limpeza de cache
    try {
      localStorage.setItem('reuni_emergency_snapshot', JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (e) {}

    setLastSaved(`Ao vivo: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
  }

  const pushStateToServer = (updatedState = {}, ops = []) => {
    const now = Date.now()
    lastServerTimestamp.current = now

    const nextDemandas = updatedState.demandas !== undefined ? updatedState.demandas : demandasRef.current
    const nextArrecadacoes = updatedState.arrecadacoes !== undefined ? updatedState.arrecadacoes : arrecadacoesRef.current
    const nextTransacoes = updatedState.transacoes !== undefined ? updatedState.transacoes : transacoesRef.current
    const nextBazarItems = updatedState.bazarItems !== undefined ? updatedState.bazarItems : bazarItemsRef.current
    const nextKeepNotes = updatedState.keepNotes !== undefined ? updatedState.keepNotes : keepNotesRef.current
    const nextInventarioItems = updatedState.inventarioItems !== undefined ? updatedState.inventarioItems : inventarioItemsRef.current

    demandasRef.current = nextDemandas
    arrecadacoesRef.current = nextArrecadacoes
    transacoesRef.current = nextTransacoes
    bazarItemsRef.current = nextBazarItems
    keepNotesRef.current = nextKeepNotes
    inventarioItemsRef.current = nextInventarioItems

    // 1. GARANTIR SALVAMENTO NO LOCALSTORAGE PRIMEIRO (PERSISTÊNCIA INDESTRUTÍVEL)
    try {
      localStorage.setItem(STORAGE_KEY_DEMANDAS, JSON.stringify(nextDemandas))
      localStorage.setItem(STORAGE_KEY_ARRECADACAO, JSON.stringify(nextArrecadacoes))
      localStorage.setItem(STORAGE_KEY_TRANSACOES, JSON.stringify(nextTransacoes))
      localStorage.setItem(STORAGE_KEY_BAZAR, JSON.stringify(nextBazarItems))
      localStorage.setItem(STORAGE_KEY_KEEP, JSON.stringify(nextKeepNotes))
      localStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(nextInventarioItems))
    } catch (e) {}

    setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

    // 2. SINCRONIZAR COM O SERVIDOR BACKEND (SE DISPONÍVEL)
    // Manda só a operação (criar/atualizar/apagar um item, ou substituir uma
    // coleção inteira de propósito) — o servidor aplica em cima do estado
    // ATUAL dele, nunca do array completo que este cliente lembra ter.
    // Isso evita que um cliente com cópia local desatualizada apague
    // silenciosamente o lançamento de outro (ver dbOps.js).
    if (ops.length > 0) {
      fetch('/api/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ops })
      })
        .then(res => res.json())
        .then(result => {
          if (result && result.success && result.data) {
            applyServerData(result.data)
          }
        })
        .catch(() => {})
    }
  }

  // Real-time EventSource connection & initial load & polling heartbeat
  useEffect(() => {
    // Sincronizar inicialmente com dados do servidor se houver
    fetch('/api/data', { headers: { ...authHeaders() } })
      .then(res => {
        if (!res.ok) throw new Error('Servidor sem rota estática')
        return res.json()
      })
      .then(data => {
        applyServerData(data)
      })
      .catch(() => {
        // Se a API /api/data der erro ou estiver offline, mantém os dados em cache sem sobrescrever o servidor
      })

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
        } catch (err) {}
      }
    } catch (err) {}

    const intervalId = setInterval(() => {
      fetch('/api/data', { headers: { ...authHeaders() } })
        .then(res => {
          if (!res.ok) return null
          return res.json()
        })
        .then(data => {
          if (data && data.updatedAt && data.updatedAt > lastServerTimestamp.current) {
            applyServerData(data)
          }
        })
        .catch(() => {})
    }, 25000)

    return () => {
      if (eventSource) eventSource.close()
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
    const newDemanda = {
      ...demanda,
      id: Date.now().toString(),
      data: new Date().toISOString().split('T')[0]
    }
    clearTombstones(newDemanda.id)
    const updated = [newDemanda, ...demandasRef.current]
    demandasRef.current = updated
    setDemandas(updated)
    pushStateToServer({ demandas: updated }, [{ op: 'create', colecao: 'demandas', item: newDemanda }])
  }

  const updateDemanda = (id, updatedFields) => {
    const updated = demandasRef.current.map(d => {
      if (d.id === id) {
        return { ...d, ...updatedFields }
      }
      return d
    })
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

    const updatedOtimista = demandasRef.current.map(d => d.id === id ? { ...d, status: 'Pago' } : d)
    demandasRef.current = updatedOtimista
    setDemandas(updatedOtimista)

    const enviar = (comprovantePayload) => {
      fetch('/api/demandas/pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ demandaId: id, ...(comprovantePayload ? { comprovante: comprovantePayload } : {}) })
      })
        .then(res => res.json())
        .then(result => {
          if (result && result.success && result.data) {
            applyServerData(result.data)
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
        .catch(() => {})
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

    // Qualquer outra transição de status (não envolve criar transação
    // automática) segue o caminho normal de update.
    const updated = demandasRef.current.map(d => d.id === id ? { ...d, status: newStatus } : d)
    demandasRef.current = updated
    setDemandas(updated)
    pushStateToServer({ demandas: updated }, [{ op: 'update', colecao: 'demandas', id, fields: { status: newStatus } }])
  }

  // Arrecadacao handlers
  const addArrecadacao = (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      atual: Number(item.atual) || 0,
      meta: Number(item.meta) || 0
    }
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
    const updated = arrecadacoesRef.current.map(item => {
      if (item.id === id) {
        return { ...item, ...computedFields }
      }
      return item
    })
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
        
        const newTrans = {
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
        }
        clearTombstones(newTrans.id)
        newTransacoes = [newTrans, ...transacoesRef.current]
        transacoesRef.current = newTransacoes
        setTransacoes(newTransacoes)
        transacaoCriada = newTrans
        arrecadacaoFieldsAtualizados = { atual: novoAtual, status: novoStatus }

        return { ...item, atual: novoAtual, status: novoStatus }
      }
      return item
    })
    arrecadacoesRef.current = updated
    setArrecadacoes(updated)
    pushStateToServer({ arrecadacoes: updated, transacoes: newTransacoes }, [
      { op: 'update', colecao: 'arrecadacoes', id, fields: arrecadacaoFieldsAtualizados },
      { op: 'create', colecao: 'transacoes', item: transacaoCriada }
    ])
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

    const newItem = {
      ...item,
      id: Date.now().toString(),
      precoAvaliado: Number(item.precoAvaliado) || 0,
      status: item.status || 'Em Avaliação',
      dataCadastro: new Date().toISOString().split('T')[0],
      dataHoraRecebimento: dataHoraNow
    }
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
    const updated = bazarItemsRef.current.map(item => {
      if (item.id === id) {
        return { ...item, ...computedFields }
      }
      return item
    })
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated }, [{ op: 'update', colecao: 'bazarItems', id, fields: computedFields }])
  }

  const updateBazarItemStatus = (id, newStatus) => {
    const updated = bazarItemsRef.current.map(item => {
      if (item.id === id) {
        return { ...item, status: newStatus }
      }
      return item
    })
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

        const newTrans = {
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
        }
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

        return { ...item, ...camposAtualizados }
      }
      return item
    })
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated, transacoes: newTransacoes }, [
      { op: 'update', colecao: 'bazarItems', id, fields: bazarItemFieldsAtualizados },
      { op: 'create', colecao: 'transacoes', item: transacaoCriada }
    ])
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
    const newTransacao = {
      ...transacao,
      id: Date.now().toString(),
      data: transacao.data || new Date().toISOString().split('T')[0],
      valor: Number(transacao.valor)
    }
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
    const updated = transacoesRef.current.map(t => {
      if (t.id === id) {
        return { ...t, ...computedFields }
      }
      return t
    })
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
    const updated = transacoesRef.current.map(t => {
      if (t.id === transacaoId) {
        return { ...t, comprovanteUrl }
      }
      return t
    })
    transacoesRef.current = updated
    setTransacoes(updated)
    pushStateToServer({ transacoes: updated }, [{ op: 'update', colecao: 'transacoes', id: transacaoId, fields: { comprovanteUrl } }])
  }

  // Keep / Informações Handlers
  const addKeepNote = (note) => {
    const newNote = {
      ...note,
      id: Date.now().toString(),
      dataCriacao: new Date().toISOString().split('T')[0],
      cor: note.cor || 'default',
      isPinned: note.isPinned || false,
      tags: note.tags || []
    }
    clearTombstones(newNote.id)
    const updated = [newNote, ...keepNotesRef.current]
    keepNotesRef.current = updated
    setKeepNotes(updated)
    pushStateToServer({ keepNotes: updated }, [{ op: 'create', colecao: 'keepNotes', item: newNote }])
  }

  const updateKeepNote = (id, updatedFields) => {
    const updated = keepNotesRef.current.map(note => {
      if (note.id === id) {
        return { ...note, ...updatedFields }
      }
      return note
    })
    keepNotesRef.current = updated
    setKeepNotes(updated)
    pushStateToServer({ keepNotes: updated }, [{ op: 'update', colecao: 'keepNotes', id, fields: updatedFields }])
  }

  const togglePinKeepNote = (id) => {
    let novoIsPinned = null
    const updated = keepNotesRef.current.map(note => {
      if (note.id === id) {
        novoIsPinned = !note.isPinned
        return { ...note, isPinned: novoIsPinned }
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
        return { ...note, checklistItems: updatedItems }
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
    const newItem = {
      ...item,
      id: Date.now().toString(),
      quantidade: Number(item.quantidade) || 1,
      valorEstimadoEconomizado: Number(item.valorEstimadoEconomizado) || 0,
      dataCadastro: new Date().toISOString().split('T')[0]
    }
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
    const updated = inventarioItemsRef.current.map(item => {
      if (item.id === id) {
        return { ...item, ...computedFields }
      }
      return item
    })
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

  const resetToDefault = () => {
    const allIds = [
      ...demandasRef.current.map(d => d.id),
      ...arrecadacoesRef.current.map(a => a.id),
      ...transacoesRef.current.map(t => t.id),
      ...bazarItemsRef.current.map(b => b.id),
      ...keepNotesRef.current.map(k => k.id),
      ...inventarioItemsRef.current.map(i => i.id)
    ].filter(Boolean)
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
    }, [
      { op: 'replaceAll', colecao: 'demandas', items: [] },
      { op: 'replaceAll', colecao: 'arrecadacoes', items: [] },
      { op: 'replaceAll', colecao: 'transacoes', items: [] },
      { op: 'replaceAll', colecao: 'bazarItems', items: [] },
      { op: 'replaceAll', colecao: 'keepNotes', items: [] },
      { op: 'replaceAll', colecao: 'inventarioItems', items: [] }
    ])
  }

  const clearAllData = () => {
    const allIds = [
      ...demandasRef.current.map(d => d.id),
      ...arrecadacoesRef.current.map(a => a.id),
      ...transacoesRef.current.map(t => t.id),
      ...bazarItemsRef.current.map(b => b.id),
      ...keepNotesRef.current.map(k => k.id),
      ...inventarioItemsRef.current.map(i => i.id)
    ].filter(Boolean)
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
    }, [
      { op: 'replaceAll', colecao: 'demandas', items: [] },
      { op: 'replaceAll', colecao: 'arrecadacoes', items: [] },
      { op: 'replaceAll', colecao: 'transacoes', items: [] },
      { op: 'replaceAll', colecao: 'bazarItems', items: [] },
      { op: 'replaceAll', colecao: 'keepNotes', items: [] },
      { op: 'replaceAll', colecao: 'inventarioItems', items: [] }
    ])
  }

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

  // Apaga o arquivo físico no servidor quando a URL veio de
  // /api/documents/upload. URLs data: (base64 embutido, ex.: comprovante
  // de venda de rifa) não têm arquivo no servidor — não faz nada nesse
  // caso, quem chamou só precisa limpar o campo comprovanteUrl do registro.
  const deleteDocument = async (comprovanteUrl) => {
    if (!comprovanteUrl || !comprovanteUrl.startsWith('/api/documents/')) return
    const fileId = comprovanteUrl.split('/').pop().split('?')[0]
    try {
      await fetch(`/api/documents/${fileId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
      })
    } catch (e) {}
  }

  // Importação atômica em lote com identificador de lote e suporte a desfazer/excluir
  const importBatch = async ({ demandas: impDemandas = [], arrecadacoes: impArrecadacoes = [], transacoes: impTransacoes = [], bazar: impBazar = [], inventario: impInventario = [], keep: impKeep = [] }) => {
    const ops = []
    const loteId = 'lote_' + Date.now()
    const allNewIds = []

    let nextDemandas = demandasRef.current
    if (impDemandas.length > 0) {
      const formatted = impDemandas.map((d, idx) => ({
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
      const formatted = impArrecadacoes.map((a, idx) => ({
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
      const formatted = impTransacoes.map((t, idx) => ({
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
      const formatted = impBazar.map((b, idx) => ({
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
      const formatted = impInventario.map((i, idx) => ({
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
      const formatted = impKeep.map((k, idx) => ({
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
    } catch (e) {}

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
      } catch (e) {}
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
