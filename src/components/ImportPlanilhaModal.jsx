import React, { useState } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import * as XLSX from 'xlsx'

// Função auxiliar para parsing de valores monetários e numéricos no padrão pt-BR
function parseCustoBR(val) {
  if (typeof val === 'number') {
    return { custo: val, semCusto: val === 0, tipoSemCusto: val === 0 ? 'Sem Custo' : '' }
  }
  if (!val) {
    return { custo: 0, semCusto: true, tipoSemCusto: 'A Definir' }
  }
  const str = String(val).trim()
  if (str.toLowerCase().includes('definir') || str.toLowerCase().includes('cotação') || str.toLowerCase().includes('cotacao')) {
    return { custo: 0, semCusto: true, tipoSemCusto: 'A Definir (Sob Cotação)' }
  }
  const clean = str.replace(/[R$\s+]/g, '').replace(/\./g, '').replace(',', '.')
  const num = parseFloat(clean)
  if (isNaN(num)) {
    return { custo: 0, semCusto: true, tipoSemCusto: 'A Definir' }
  }
  return { custo: num, semCusto: num === 0, tipoSemCusto: num === 0 ? 'Sem Custo' : '' }
}

function parseNumeroBR(val, fallback = 0) {
  if (typeof val === 'number') return val
  if (!val) return fallback
  const clean = String(val).replace(/[R$\s+]/g, '').replace(/\./g, '').replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? fallback : num
}

export default function ImportPlanilhaModal({ isOpen, onClose, defaultModule = 'auto' }) {
  const { importBatch, undoImportBatch } = useFinance()

  const [targetModule, setTargetModule] = useState(defaultModule) // 'auto' | 'demandas' | 'arrecadacao' | 'bazar' | 'caixa' | 'inventario' | 'keep'
  const [fileName, setFileName] = useState('')
  const [parsedResult, setParsedResult] = useState(null)
  const [mappedData, setMappedData] = useState({
    demandas: [],
    arrecadacoes: [],
    bazar: [],
    caixa: [],
    inventario: [],
    keep: []
  })
  const [importSummary, setImportSummary] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeLoteId, setActiveLoteId] = useState(null)
  const [undoSuccessMessage, setUndoSuccessMessage] = useState('')
  const [hasRecentLote, setHasRecentLote] = useState(() => {
    try { return !!localStorage.getItem('reuni_last_import_lote') } catch (e) { return false }
  })

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setImportSummary(null)
    setErrorMessage('')
    setIsProcessing(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const buffer = event.target.result
        const workbook = XLSX.read(buffer, { type: 'array' })

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('A planilha está vazia ou ilegível.')
        }

        // 1. Verificar se é uma planilha multi-aba exportada do ecossistema REUNI
        const sheetNamesLower = workbook.SheetNames.map(s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
        const isReuniEcosystem = sheetNamesLower.some(s => s.includes('demandas') || s.includes('caixa') || s.includes('arrecadacao') || s.includes('bazar') || s.includes('inventario'))

        if (isReuniEcosystem && targetModule === 'auto') {
          processReuniMultiSheet(workbook)
        } else {
          // Processa a primeira aba ou a aba ativa
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
          if (rawRows.length === 0) {
            throw new Error('Nenhuma linha de dados encontrada na planilha.')
          }
          const headers = Object.keys(rawRows[0] || {}).map(h => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
          setParsedResult({ headers, rows: rawRows })
          organizeRowsIntoModules(rawRows, headers, targetModule)
        }
      } catch (err) {
        console.error('Erro ao ler planilha:', err)
        setErrorMessage(err.message || 'Erro ao processar a planilha. Verifique se o formato é válido (.xlsx, .xls ou .csv).')
      } finally {
        setIsProcessing(false)
      }
    }

    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo no navegador.')
      setIsProcessing(false)
    }

    reader.readAsArrayBuffer(file)
  }

  // Processa planilhas oficiais com abas estruturadas
  const processReuniMultiSheet = (workbook) => {
    const result = {
      demandas: [],
      arrecadacoes: [],
      bazar: [],
      caixa: [],
      inventario: [],
      keep: []
    }

    let totalLinhas = 0

    for (const sheetName of workbook.SheetNames) {
      const sheetKey = sheetName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const ws = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      totalLinhas += rows.length

      if (sheetKey.includes('demanda')) {
        rows.forEach(r => {
          const itemNome = r['Nome do Item'] || r['Item'] || r['item'] || r['descricao'] || ''
          if (!itemNome) return
          const { custo, semCusto, tipoSemCusto } = parseCustoBR(r['Custo Estimado'] || r['Custo'] || r['custo'])
          result.demandas.push({
            item: itemNome,
            comissao: r['Comissão'] || r['Comissao'] || r['comissao'] || 'Estrutura',
            quantidade: parseInt(r['Quantidade'] || r['quantidade'] || r['Qtd'] || 1, 10) || 1,
            detalhamento: r['Detalhamento / Especificações'] || r['Detalhamento'] || r['detalhamento'] || '',
            custo,
            semCusto,
            tipoSemCusto,
            prioridade: r['Prioridade'] || r['prioridade'] || 'Inegociável',
            status: r['Status'] || r['status'] || 'Pendente',
            prazoData: r['Prazo Limite'] || r['Prazo'] || ''
          })
        })
      } else if (sheetKey.includes('caixa') || sheetKey.includes('transac')) {
        rows.forEach(r => {
          const desc = r['Descrição da Movimentação'] || r['Descricao'] || r['descricao'] || r['Item'] || ''
          if (!desc) return
          const valor = parseNumeroBR(r['Valor (R$)'] || r['Valor'] || r['valor'], 0)
          const tipo = String(r['Tipo'] || r['tipo'] || '').toLowerCase().includes('saida') ? 'Saída' : 'Entrada'
          result.caixa.push({
            descricao: desc,
            tipo,
            valor,
            categoria: r['Categoria / Comissão'] || r['Categoria'] || r['categoria'] || 'Geral',
            data: r['Data'] || r['data'] || new Date().toISOString().split('T')[0]
          })
        })
      } else if (sheetKey.includes('arrecadac')) {
        rows.forEach(r => {
          const nome = r['Nome da Campanha'] || r['Campanha'] || r['Nome'] || r['nome'] || ''
          if (!nome) return
          result.arrecadacoes.push({
            nome,
            tipo: r['Tipo / Categoria'] || r['Tipo'] || r['tipo'] || 'Rifa',
            meta: parseNumeroBR(r['Meta (R$)'] || r['Meta'] || r['meta'], 100),
            atual: parseNumeroBR(r['Arrecadado (R$)'] || r['Atual'] || r['atual'], 0),
            status: r['Status'] || r['status'] || 'Em Andamento'
          })
        })
      } else if (sheetKey.includes('bazar')) {
        rows.forEach(r => {
          const nome = r['Peça / Item'] || r['Nome'] || r['item'] || ''
          if (!nome) return
          result.bazar.push({
            nome,
            categoria: r['Categoria'] || r['categoria'] || 'Roupas',
            precoAvaliado: parseNumeroBR(r['Preço Sugerido (R$)'] || r['Preco'] || r['precoAvaliado'], 10),
            doador: r['Doador'] || r['doador'] || 'Anônimo',
            tamanho: r['Tamanho'] || r['tamanho'] || 'M',
            estado: r['Estado de Conservação'] || r['Estado'] || 'Excelente',
            status: r['Status'] || 'Em Avaliação'
          })
        })
      } else if (sheetKey.includes('inventario') || sheetKey.includes('patrimonio')) {
        rows.forEach(r => {
          const item = r['Material / Equipamento'] || r['Item'] || r['material'] || ''
          if (!item) return
          result.inventario.push({
            item,
            comissao: r['Comissão / Guarda'] || r['Comissao'] || r['comissao'] || 'Recreação',
            quantidade: parseInt(r['Quantidade'] || r['quantidade'] || 1, 10) || 1,
            unidade: r['Unidade'] || 'unidades',
            estadoConservacao: r['Estado de Conservação'] || r['Estado'] || 'Excelente (Pronto)',
            localArmazenamento: r['Local de Armazenamento'] || r['Local'] || 'Acervo REUNI',
            responsavelGuarda: r['Responsável pela Guarda'] || r['Responsavel'] || '-',
            valorEstimadoEconomizado: parseNumeroBR(r['Valor Economizado (R$)'] || r['Economia'], 0),
            status: r['Status'] || 'Disponível para Uso'
          })
        })
      }
    }

    setParsedResult({ headers: ['multi-sheet'], rows: new Array(totalLinhas).fill({}) })
    setMappedData(result)
  }

  const organizeRowsIntoModules = (rows, headers, selectedModule) => {
    const result = {
      demandas: [],
      arrecadacoes: [],
      bazar: [],
      caixa: [],
      inventario: [],
      keep: []
    }

    rows.forEach(row => {
      const getVal = (...keys) => {
        for (const k of keys) {
          for (const headerKey of Object.keys(row)) {
            const normKey = headerKey.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            if (normKey.includes(k)) {
              return row[headerKey]
            }
          }
        }
        return ''
      }

      if (selectedModule !== 'auto') {
        if (selectedModule === 'demandas') {
          const { custo, semCusto, tipoSemCusto } = parseCustoBR(getVal('custo', 'valor', 'preco', 'orcamento'))
          result.demandas.push({
            item: String(getVal('item', 'descricao', 'nome', 'gasto') || 'Item de Demanda'),
            comissao: String(getVal('comissao', 'setor', 'departamento') || 'Estrutura'),
            quantidade: parseInt(getVal('quantidade', 'qtd', 'num') || 1, 10) || 1,
            detalhamento: String(getVal('detalhamento', 'especificacao', 'detalhe', 'observacao') || ''),
            custo,
            semCusto,
            tipoSemCusto,
            prioridade: String(getVal('prioridade', 'nivel') || 'Inegociável'),
            status: String(getVal('status', 'situacao') || 'Pendente'),
            prazoData: String(getVal('prazo', 'data_limite', 'limite') || '')
          })
        } else if (selectedModule === 'arrecadacao') {
          result.arrecadacoes.push({
            nome: String(getVal('nome', 'campanha', 'titulo', 'item') || 'Campanha de Arrecadação'),
            tipo: String(getVal('tipo', 'categoria') || 'Rifa'),
            meta: parseNumeroBR(getVal('meta', 'valor', 'alvo'), 100),
            atual: parseNumeroBR(getVal('atual', 'arrecadado', 'saldo'), 0),
            status: String(getVal('status') || 'Em Andamento')
          })
        } else if (selectedModule === 'bazar') {
          result.bazar.push({
            nome: String(getVal('nome', 'item', 'peca', 'descricao') || 'Peça de Bazar'),
            categoria: String(getVal('categoria', 'tipo') || 'Roupas'),
            precoAvaliado: parseNumeroBR(getVal('preco', 'valor', 'custo'), 10),
            doador: String(getVal('doador', 'origem') || 'Anônimo'),
            tamanho: String(getVal('tamanho') || 'M'),
            estado: String(getVal('estado', 'conservacao') || 'Excelente'),
            status: String(getVal('status') || 'Em Avaliação')
          })
        } else if (selectedModule === 'caixa') {
          const tipo = String(getVal('tipo', 'movimentacao') || '').toLowerCase().includes('saida') ? 'Saída' : 'Entrada'
          result.caixa.push({
            descricao: String(getVal('descricao', 'item', 'historico', 'nome') || 'Lançamento de Caixa'),
            tipo,
            valor: parseNumeroBR(getVal('valor', 'quantia', 'preco'), 0),
            categoria: String(getVal('categoria', 'comissao') || 'Geral'),
            data: String(getVal('data') || new Date().toISOString().split('T')[0])
          })
        } else if (selectedModule === 'inventario') {
          result.inventario.push({
            item: String(getVal('item', 'nome', 'material', 'equipamento') || 'Material de Inventário'),
            comissao: String(getVal('comissao', 'setor') || 'Estrutura'),
            quantidade: parseInt(getVal('quantidade', 'qtd', 'num') || 1, 10) || 1,
            unidade: String(getVal('unidade', 'medida') || 'unidades'),
            estadoConservacao: String(getVal('estado', 'conservacao') || 'Excelente (Pronto)'),
            localArmazenamento: String(getVal('local', 'armazenamento', 'sala') || 'Armário Central'),
            responsavelGuarda: String(getVal('responsavel', 'guarda') || 'Secretaria Geral'),
            valorEstimadoEconomizado: parseNumeroBR(getVal('economia', 'valor', 'custo'), 0),
            status: String(getVal('status') || 'Disponível para Uso')
          })
        } else if (selectedModule === 'keep') {
          result.keep.push({
            titulo: String(getVal('titulo', 'nome', 'assunto') || 'Nota Importada'),
            conteudo: String(getVal('conteudo', 'descricao', 'texto', 'nota') || ''),
            tags: [String(getVal('tag', 'categoria') || '#Importado')],
            isPinned: false
          })
        }
        return
      }

      // Detecção heurística inteligente para modo auto
      const rawText = JSON.stringify(row).toLowerCase()

      if (rawText.includes('inventario') || rawText.includes('patrimonio') || rawText.includes('armazenamento') || rawText.includes('guarda')) {
        result.inventario.push({
          item: String(getVal('item', 'nome', 'material', 'equipamento') || 'Material de Inventário'),
          comissao: String(getVal('comissao', 'setor') || 'Estrutura'),
          quantidade: parseInt(getVal('quantidade', 'qtd') || 1, 10) || 1,
          unidade: String(getVal('unidade') || 'unidades'),
          estadoConservacao: String(getVal('estado', 'conservacao') || 'Excelente (Pronto)'),
          localArmazenamento: String(getVal('local', 'armazenamento') || 'Acervo REUNI'),
          responsavelGuarda: String(getVal('responsavel', 'guarda') || 'Secretaria Geral'),
          valorEstimadoEconomizado: parseNumeroBR(getVal('economia', 'valor'), 0),
          status: String(getVal('status') || 'Disponível para Uso')
        })
      } else if (rawText.includes('bazar') || rawText.includes('doador') || rawText.includes('tamanho')) {
        result.bazar.push({
          nome: String(getVal('nome', 'item', 'peca') || 'Peça de Bazar'),
          categoria: String(getVal('categoria') || 'Roupas'),
          precoAvaliado: parseNumeroBR(getVal('preco', 'valor'), 10),
          doador: String(getVal('doador') || 'Anônimo'),
          tamanho: String(getVal('tamanho') || 'M'),
          estado: String(getVal('estado') || 'Excelente'),
          status: String(getVal('status') || 'Em Avaliação')
        })
      } else if (rawText.includes('meta') || rawText.includes('arrecadado') || rawText.includes('campanha') || rawText.includes('rifa')) {
        result.arrecadacoes.push({
          nome: String(getVal('nome', 'campanha', 'item') || 'Campanha de Arrecadação'),
          tipo: String(getVal('tipo') || 'Rifa'),
          meta: parseNumeroBR(getVal('meta', 'alvo'), 100),
          atual: parseNumeroBR(getVal('atual', 'arrecadado'), 0),
          status: String(getVal('status') || 'Em Andamento')
        })
      } else if (rawText.includes('demanda') || rawText.includes('custo') || rawText.includes('prioridade')) {
        const { custo, semCusto, tipoSemCusto } = parseCustoBR(getVal('custo', 'valor'))
        result.demandas.push({
          item: String(getVal('item', 'descricao', 'nome') || 'Item de Demanda'),
          comissao: String(getVal('comissao', 'setor') || 'Estrutura'),
          quantidade: parseInt(getVal('quantidade', 'qtd') || 1, 10) || 1,
          detalhamento: String(getVal('detalhamento', 'especificacao', 'detalhe') || ''),
          custo,
          semCusto,
          tipoSemCusto,
          prioridade: String(getVal('prioridade') || 'Inegociável'),
          status: String(getVal('status') || 'Pendente'),
          prazoData: String(getVal('prazo') || '')
        })
      } else if (rawText.includes('entrada') || rawText.includes('saida') || rawText.includes('receita') || rawText.includes('despesa') || rawText.includes('extrato')) {
        result.caixa.push({
          descricao: String(getVal('descricao', 'item', 'historico') || 'Lançamento de Caixa'),
          tipo: (rawText.includes('saida') || rawText.includes('despesa')) ? 'Saída' : 'Entrada',
          valor: parseNumeroBR(getVal('valor', 'quantia'), 0),
          categoria: String(getVal('categoria') || 'Geral'),
          data: String(getVal('data') || new Date().toISOString().split('T')[0])
        })
      } else {
        const { custo, semCusto, tipoSemCusto } = parseCustoBR(getVal('custo', 'valor', 'preco'))
        result.demandas.push({
          item: String(getVal('item', 'nome', 'descricao') || 'Demanda Importada'),
          comissao: String(getVal('comissao') || 'Estrutura'),
          quantidade: parseInt(getVal('quantidade', 'qtd') || 1, 10) || 1,
          detalhamento: String(getVal('detalhamento', 'especificacao') || ''),
          custo,
          semCusto,
          tipoSemCusto,
          prioridade: 'Inegociável',
          status: 'Pendente'
        })
      }
    })

    setMappedData(result)
  }

  const handleConfirmImport = async () => {
    setIsProcessing(true)
    setErrorMessage('')
    setUndoSuccessMessage('')
    try {
      const res = await importBatch(mappedData)
      setActiveLoteId(res.loteId)
      setHasRecentLote(true)
      setImportSummary({ total: res.total, counts: res.counts })
    } catch (err) {
      setErrorMessage('Erro ao persistir importação no sistema: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUndoImport = (targetLote) => {
    const lote = targetLote || activeLoteId || localStorage.getItem('reuni_last_import_lote')
    if (!lote) return
    if (!window.confirm('Tem certeza que deseja desfazer e excluir todos os itens adicionados por esta importação? Essa ação removerá os dados do banco.')) return

    setIsProcessing(true)
    try {
      const ok = undoImportBatch(lote)
      if (ok) {
        setImportSummary(null)
        setParsedResult(null)
        setFileName('')
        setActiveLoteId(null)
        setHasRecentLote(false)
        setUndoSuccessMessage('Itens da planilha excluídos com sucesso do banco!')
        setTimeout(() => setUndoSuccessMessage(''), 5000)
      } else {
        setErrorMessage('Nenhum item do lote encontrado para exclusão.')
      }
    } catch (err) {
      setErrorMessage('Erro ao excluir importação: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importador Inteligente de Planilhas (CSV / Excel)">
      <div className="space-y-5">
        
        {/* Banner Explicativo */}
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-primary shrink-0 animate-pulse" />
            <span>
              <strong>Organização Automática de Dados:</strong> Suporte completo a planilhas <strong>.xlsx, .xls e .csv</strong>. O sistema reconhece abas oficiais ou distribui os dados por colunas entre <strong>Demandas, Arrecadação, Bazar, Caixa e Inventário</strong>.
            </span>
          </div>
        </div>

        {/* Escolha do Módulo Alvo */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Modo de Organização *
          </label>
          <select
            value={targetModule}
            onChange={(e) => {
              setTargetModule(e.target.value)
              if (parsedResult && parsedResult.rows) {
                organizeRowsIntoModules(parsedResult.rows, parsedResult.headers, e.target.value)
              }
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="auto">✨ Auto-Organizar por Abas ou Colunas Oficiais</option>
            <option value="demandas">📌 Importar tudo para: Planejamento de Demandas</option>
            <option value="arrecadacao">💰 Importar tudo para: Arrecadação Estratégica</option>
            <option value="bazar">🛍️ Importar tudo para: Curadoria do Bazar</option>
            <option value="inventario">📦 Importar tudo para: Inventário de Materiais</option>
            <option value="caixa">💸 Importar tudo para: Lançamentos no Caixa</option>
            <option value="keep">📝 Importar tudo para: Anotações & Keep</option>
          </select>
        </div>

        {/* Upload Box */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Selecione o Arquivo (.XLSX, .XLS, .CSV ou Google Planilhas) *
          </label>

          <label className="flex flex-col items-center justify-center gap-2 p-7 border-2 border-dashed border-border rounded-2xl bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all text-xs text-muted-foreground font-medium text-center group">
            <FileSpreadsheet className="w-9 h-9 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-bold text-foreground">
              {fileName ? `Arquivo Selecionado: ${fileName}` : 'Clique para selecionar a planilha (.XLSX / .XLS / .CSV)'}
            </span>
            <span className="text-[10px] opacity-70">
              {parsedResult ? `${(mappedData.demandas.length + mappedData.caixa.length + mappedData.arrecadacoes.length + mappedData.bazar.length + mappedData.inventario.length + mappedData.keep.length)} itens identificados` : 'Compatível com Excel 2016-2026, LibreOffice Calc e Google Planilhas'}
            </span>
            <input type="file" accept=".xlsx, .xls, .csv, .txt, .tsv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resumo da Auto-Organização */}
        {parsedResult && !importSummary && (
          <div className="space-y-3 pt-2 animate-in fade-in duration-200">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Preview da Organização por Módulos:
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-border bg-card text-center">
                <span className="text-xs text-muted-foreground block font-medium">Demandas</span>
                <span className="text-lg font-extrabold text-primary">{mappedData.demandas.length}</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card text-center">
                <span className="text-xs text-muted-foreground block font-medium">Arrecadações</span>
                <span className="text-lg font-extrabold text-primary">{mappedData.arrecadacoes.length}</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card text-center">
                <span className="text-xs text-muted-foreground block font-medium">Bazar</span>
                <span className="text-lg font-extrabold text-primary">{mappedData.bazar.length}</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card text-center">
                <span className="text-xs text-muted-foreground block font-medium">Lançamentos Caixa</span>
                <span className="text-lg font-extrabold text-primary">{mappedData.caixa.length}</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card text-center">
                <span className="text-xs text-muted-foreground block font-medium">Inventário</span>
                <span className="text-lg font-extrabold text-primary">{mappedData.inventario.length}</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card text-center">
                <span className="text-xs text-muted-foreground block font-medium">Anotações</span>
                <span className="text-lg font-extrabold text-primary">{mappedData.keep.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Mensagem de Sucesso com Ação de Desfazer */}
        {importSummary && (
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" /> Importação Concluída com Sucesso!
            </div>
            <p className="text-xs text-emerald-400">
              Foram adicionados <strong>{importSummary.total} itens</strong> e persistidos de forma atômica no servidor e no banco de dados.
            </p>
            <div className="pt-2 flex items-center justify-between border-t border-emerald-500/20">
              <span className="text-[11px] text-muted-foreground">Importou por engano ou deseja remover?</span>
              <button
                type="button"
                onClick={() => handleUndoImport(activeLoteId)}
                className="px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              >
                Desfazer / Excluir Esta Importação
              </button>
            </div>
          </div>
        )}

        {/* Mensagem de Desfeito com Sucesso */}
        {undoSuccessMessage && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{undoSuccessMessage}</span>
          </div>
        )}

        {/* Banner de Desfazer Lote Recente */}
        {!importSummary && hasRecentLote && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs flex items-center justify-between gap-2">
            <span>Há itens de uma planilha importada recentemente no sistema.</span>
            <button
              type="button"
              onClick={() => handleUndoImport(null)}
              className="px-3 py-1 font-bold text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors cursor-pointer"
            >
              Excluir Última Planilha Importada
            </button>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
          >
            {importSummary ? 'Fechar' : 'Cancelar'}
          </button>

          {!importSummary && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isProcessing || !parsedResult || (mappedData.demandas.length + mappedData.caixa.length + mappedData.arrecadacoes.length + mappedData.bazar.length + mappedData.inventario.length + mappedData.keep.length) === 0}
              className="px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              {isProcessing ? 'Processando e Gravando...' : 'Importar e Salvar Planilha'}
            </button>
          )}
        </div>

      </div>
    </Modal>
  )
}
