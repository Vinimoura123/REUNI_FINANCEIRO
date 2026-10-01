import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { authHeaders, getAccessToken } from '../lib/auth'

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

    // O servidor é a fonte única da verdade. Ignora payloads mais antigos ou iguais.
    if (incomingTimestamp && incomingTimestamp <= lastServerTimestamp.current) {
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
    const updated = inventarioItemsRef.current.filter(item => item.id !== id)
    inventarioItemsRef.current = updated
    setInventarioItems(updated)
    pushStateToServer({ inventarioItems: updated }, [{ op: 'delete', colecao: 'inventarioItems', id }])
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
