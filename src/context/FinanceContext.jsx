import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

const FinanceContext = createContext()

const STORAGE_KEY_DEMANDAS = 'reuni_demandas_v2'
const STORAGE_KEY_ARRECADACAO = 'reuni_arrecadacoes_v2'
const STORAGE_KEY_TRANSACOES = 'reuni_transacoes_v2'
const STORAGE_KEY_BAZAR = 'reuni_bazar_v2'
const STORAGE_KEY_KEEP = 'reuni_keep_v2'
const STORAGE_KEY_INVENTARIO = 'reuni_inventario_v2'

const DEFAULT_DEMANDAS = []
const DEFAULT_ARRECADACAO = []
const DEFAULT_TRANSACOES = []
const DEFAULT_BAZAR = []
const DEFAULT_KEEP = []
const DEFAULT_INVENTARIO = []

export function FinanceProvider({ children }) {
  const [lastSaved, setLastSaved] = useState(null)

  // Initialize state cleanly with empty fallback (no hypothetical pre-made items)
  const [demandas, setDemandas] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DEMANDAS)
      return saved !== null ? JSON.parse(saved) : DEFAULT_DEMANDAS
    } catch (e) {
      return DEFAULT_DEMANDAS
    }
  })

  const [arrecadacoes, setArrecadacoes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ARRECADACAO)
      return saved !== null ? JSON.parse(saved) : DEFAULT_ARRECADACAO
    } catch (e) {
      return DEFAULT_ARRECADACAO
    }
  })

  const [transacoes, setTransacoes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRANSACOES)
      return saved !== null ? JSON.parse(saved) : DEFAULT_TRANSACOES
    } catch (e) {
      return DEFAULT_TRANSACOES
    }
  })

  const [bazarItems, setBazarItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BAZAR)
      return saved !== null ? JSON.parse(saved) : DEFAULT_BAZAR
    } catch (e) {
      return DEFAULT_BAZAR
    }
  })

  const [keepNotes, setKeepNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_KEEP)
      return saved !== null ? JSON.parse(saved) : DEFAULT_KEEP
    } catch (e) {
      return DEFAULT_KEEP
    }
  })

  const [inventarioItems, setInventarioItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVENTARIO)
      return saved !== null ? JSON.parse(saved) : DEFAULT_INVENTARIO
    } catch (e) {
      return DEFAULT_INVENTARIO
    }
  })

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

  const applyServerData = (data) => {
    if (!data || typeof data !== 'object') return
    const incomingTimestamp = data.updatedAt || 0

    // Verificar se o cliente local possui dados salvos
    const hasLocalData = 
      demandasRef.current.length > 0 ||
      arrecadacoesRef.current.length > 0 ||
      transacoesRef.current.length > 0 ||
      bazarItemsRef.current.length > 0 ||
      keepNotesRef.current.length > 0 ||
      inventarioItemsRef.current.length > 0

    // Se a resposta do servidor for vazia ou updatedAt = 0 (ex: reinício do servidor no Render)
    if (!incomingTimestamp || incomingTimestamp === 0) {
      if (hasLocalData) {
        // Se o cliente tem dados mas o servidor está limpo, sincroniza os dados locais para o servidor!
        pushStateToServer()
      }
      return
    }

    // Ignorar respostas do servidor que sejam mais antigas ou iguais ao timestamp local
    if (incomingTimestamp <= lastServerTimestamp.current) {
      return
    }

    // Se o servidor for mais novo que a nossa gravação local, aplica os dados do servidor
    lastServerTimestamp.current = incomingTimestamp

    if (Array.isArray(data.demandas)) {
      demandasRef.current = data.demandas
      setDemandas(data.demandas)
      try { localStorage.setItem(STORAGE_KEY_DEMANDAS, JSON.stringify(data.demandas)) } catch (e) {}
    }
    if (Array.isArray(data.arrecadacoes)) {
      arrecadacoesRef.current = data.arrecadacoes
      setArrecadacoes(data.arrecadacoes)
      try { localStorage.setItem(STORAGE_KEY_ARRECADACAO, JSON.stringify(data.arrecadacoes)) } catch (e) {}
    }
    if (Array.isArray(data.transacoes)) {
      transacoesRef.current = data.transacoes
      setTransacoes(data.transacoes)
      try { localStorage.setItem(STORAGE_KEY_TRANSACOES, JSON.stringify(data.transacoes)) } catch (e) {}
    }
    if (Array.isArray(data.bazarItems)) {
      bazarItemsRef.current = data.bazarItems
      setBazarItems(data.bazarItems)
      try { localStorage.setItem(STORAGE_KEY_BAZAR, JSON.stringify(data.bazarItems)) } catch (e) {}
    }
    if (Array.isArray(data.keepNotes)) {
      keepNotesRef.current = data.keepNotes
      setKeepNotes(data.keepNotes)
      try { localStorage.setItem(STORAGE_KEY_KEEP, JSON.stringify(data.keepNotes)) } catch (e) {}
    }
    if (Array.isArray(data.inventarioItems)) {
      inventarioItemsRef.current = data.inventarioItems
      setInventarioItems(data.inventarioItems)
      try { localStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(data.inventarioItems)) } catch (e) {}
    }

    setLastSaved(`Ao vivo: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
  }

  const pushStateToServer = (updatedState = {}) => {
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
    const fullPayload = {
      demandas: nextDemandas,
      arrecadacoes: nextArrecadacoes,
      transacoes: nextTransacoes,
      bazarItems: nextBazarItems,
      keepNotes: nextKeepNotes,
      inventarioItems: nextInventarioItems,
      updatedAt: now
    }

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload)
    }).catch(() => {})
  }

  // Real-time EventSource connection & initial load & polling heartbeat
  useEffect(() => {
    // Sincronizar inicialmente com dados do servidor se houver
    fetch('/api/data')
      .then(res => {
        if (!res.ok) throw new Error('Servidor sem rota estática')
        return res.json()
      })
      .then(data => {
        applyServerData(data)
      })
      .catch(() => {
        // Se a API /api/data der erro ou offline, garante a sincronização dos dados locais
        const hasLocal = demandasRef.current.length > 0 || transacoesRef.current.length > 0
        if (hasLocal) pushStateToServer()
      })

    let eventSource
    try {
      eventSource = new EventSource('/api/events')
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          applyServerData(data)
        } catch (err) {}
      }
    } catch (err) {}

    const intervalId = setInterval(() => {
      fetch('/api/data')
        .then(res => {
          if (!res.ok) return null
          return res.json()
        })
        .then(data => {
          if (data) applyServerData(data)
        })
        .catch(() => {})
    }, 2000)

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
    const updated = [newDemanda, ...demandasRef.current]
    demandasRef.current = updated
    setDemandas(updated)
    pushStateToServer({ demandas: updated })
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
    pushStateToServer({ demandas: updated })
  }

  const deleteDemanda = (id) => {
    const updated = demandasRef.current.filter(d => d.id !== id)
    demandasRef.current = updated
    setDemandas(updated)
    pushStateToServer({ demandas: updated })
  }

  const updateDemandaStatus = (id, newStatus) => {
    let newTransacoes = transacoesRef.current
    const updated = demandasRef.current.map(d => {
      if (d.id === id) {
        if (newStatus === 'Pago' && d.status !== 'Pago') {
          const newTransacao = {
            id: Date.now().toString(),
            data: new Date().toISOString().split('T')[0],
            descricao: `Pagamento Demanda: ${d.item} (${d.comissao})`,
            tipo: 'Saída',
            valor: Number(d.custo),
            categoria: d.comissao
          }
          newTransacoes = [newTransacao, ...transacoesRef.current]
          transacoesRef.current = newTransacoes
          setTransacoes(newTransacoes)
        }
        return { ...d, status: newStatus }
      }
      return d
    })
    demandasRef.current = updated
    setDemandas(updated)
    pushStateToServer({ demandas: updated, transacoes: newTransacoes })
  }

  // Arrecadacao handlers
  const addArrecadacao = (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      atual: Number(item.atual) || 0,
      meta: Number(item.meta) || 0
    }
    const updated = [newItem, ...arrecadacoesRef.current]
    arrecadacoesRef.current = updated
    setArrecadacoes(updated)
    pushStateToServer({ arrecadacoes: updated })
  }

  const updateArrecadacao = (id, updatedFields) => {
    const updated = arrecadacoesRef.current.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          ...updatedFields,
          meta: updatedFields.meta !== undefined ? Number(updatedFields.meta) : item.meta,
          atual: updatedFields.atual !== undefined ? Number(updatedFields.atual) : item.atual
        }
      }
      return item
    })
    arrecadacoesRef.current = updated
    setArrecadacoes(updated)
    pushStateToServer({ arrecadacoes: updated })
  }

  const updateArrecadacaoValor = (id, valorAdicional, descricaoTransacao, comprovanteUrl = null, dadosVenda = {}) => {
    let newTransacoes = transacoesRef.current
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
        newTransacoes = [newTrans, ...transacoesRef.current]
        transacoesRef.current = newTransacoes
        setTransacoes(newTransacoes)

        return { ...item, atual: novoAtual, status: novoStatus }
      }
      return item
    })
    arrecadacoesRef.current = updated
    setArrecadacoes(updated)
    pushStateToServer({ arrecadacoes: updated, transacoes: newTransacoes })
  }

  const deleteArrecadacao = (id) => {
    const updated = arrecadacoesRef.current.filter(a => a.id !== id)
    arrecadacoesRef.current = updated
    setArrecadacoes(updated)
    pushStateToServer({ arrecadacoes: updated })
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
    const updated = [newItem, ...bazarItemsRef.current]
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated })
  }

  const updateBazarItem = (id, updatedFields) => {
    const updated = bazarItemsRef.current.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          ...updatedFields,
          precoAvaliado: updatedFields.precoAvaliado !== undefined ? Number(updatedFields.precoAvaliado) : item.precoAvaliado
        }
      }
      return item
    })
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated })
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
    pushStateToServer({ bazarItems: updated })
  }

  const venderBazarItem = (id, valorFinal, comprador, comprovanteUrl, vendedorBalcao = '', dataHoraVendaInput = '') => {
    const now = new Date()
    const dataHoraVenda = dataHoraVendaInput || `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

    let newTransacoes = transacoesRef.current
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
        newTransacoes = [newTrans, ...transacoesRef.current]
        transacoesRef.current = newTransacoes
        setTransacoes(newTransacoes)

        return { 
          ...item, 
          status: 'Vendido', 
          precoVendido: valorVenda,
          comprador: comprador,
          vendedorBalcao: vendedorBalcao,
          comprovanteUrl: comprovanteUrl,
          dataVenda: new Date().toISOString().split('T')[0],
          dataHoraVenda: dataHoraVenda
        }
      }
      return item
    })
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated, transacoes: newTransacoes })
  }

  const deleteBazarItem = (id) => {
    const updated = bazarItemsRef.current.filter(b => b.id !== id)
    bazarItemsRef.current = updated
    setBazarItems(updated)
    pushStateToServer({ bazarItems: updated })
  }

  // Transacoes handlers
  const addTransacao = (transacao) => {
    const newTransacao = {
      ...transacao,
      id: Date.now().toString(),
      data: transacao.data || new Date().toISOString().split('T')[0],
      valor: Number(transacao.valor)
    }
    const updated = [newTransacao, ...transacoesRef.current]
    transacoesRef.current = updated
    setTransacoes(updated)
    pushStateToServer({ transacoes: updated })
  }

  const updateTransacao = (id, updatedFields) => {
    const updated = transacoesRef.current.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          ...updatedFields,
          valor: updatedFields.valor !== undefined ? Number(updatedFields.valor) : t.valor
        }
      }
      return t
    })
    transacoesRef.current = updated
    setTransacoes(updated)
    pushStateToServer({ transacoes: updated })
  }

  const deleteTransacao = (id) => {
    const updated = transacoesRef.current.filter(t => t.id !== id)
    transacoesRef.current = updated
    setTransacoes(updated)
    pushStateToServer({ transacoes: updated })
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
    pushStateToServer({ transacoes: updated })
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
    const updated = [newNote, ...keepNotesRef.current]
    keepNotesRef.current = updated
    setKeepNotes(updated)
    pushStateToServer({ keepNotes: updated })
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
    pushStateToServer({ keepNotes: updated })
  }

  const togglePinKeepNote = (id) => {
    const updated = keepNotesRef.current.map(note => {
      if (note.id === id) {
        return { ...note, isPinned: !note.isPinned }
      }
      return note
    })
    keepNotesRef.current = updated
    setKeepNotes(updated)
    pushStateToServer({ keepNotes: updated })
  }

  const deleteKeepNote = (id) => {
    const updated = keepNotesRef.current.filter(note => note.id !== id)
    keepNotesRef.current = updated
    setKeepNotes(updated)
    pushStateToServer({ keepNotes: updated })
  }

  const toggleChecklistItem = (noteId, itemId) => {
    const updated = keepNotesRef.current.map(note => {
      if (note.id === noteId && note.checklistItems) {
        const updatedItems = note.checklistItems.map(item => {
          if (item.id === itemId) {
            return { ...item, completed: !item.completed }
          }
          return item
        })
        return { ...note, checklistItems: updatedItems }
      }
      return note
    })
    keepNotesRef.current = updated
    setKeepNotes(updated)
    pushStateToServer({ keepNotes: updated })
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
    const updated = [newItem, ...inventarioItemsRef.current]
    inventarioItemsRef.current = updated
    setInventarioItems(updated)
    pushStateToServer({ inventarioItems: updated })
  }

  const updateInventarioItem = (id, updatedFields) => {
    const updated = inventarioItemsRef.current.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          ...updatedFields,
          quantidade: updatedFields.quantidade !== undefined ? Number(updatedFields.quantidade) : item.quantidade,
          valorEstimadoEconomizado: updatedFields.valorEstimadoEconomizado !== undefined ? Number(updatedFields.valorEstimadoEconomizado) : item.valorEstimadoEconomizado
        }
      }
      return item
    })
    inventarioItemsRef.current = updated
    setInventarioItems(updated)
    pushStateToServer({ inventarioItems: updated })
  }

  const deleteInventarioItem = (id) => {
    const updated = inventarioItemsRef.current.filter(item => item.id !== id)
    inventarioItemsRef.current = updated
    setInventarioItems(updated)
    pushStateToServer({ inventarioItems: updated })
  }

  const resetToDefault = () => {
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
    })
  }

  const clearAllData = () => {
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
    })
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
      addDemanda,
      updateDemanda,
      deleteDemanda,
      updateDemandaStatus,
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
