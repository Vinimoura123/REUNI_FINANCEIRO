import React, { useState } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Layers, Sparkles, X } from 'lucide-react'

// Helper to parse CSV lines taking into account quotes and Portuguese delimiters (; or ,)
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')
  if (lines.length === 0) return []

  // Detect delimiter: semicolon or comma or tab
  const firstLine = lines[0]
  let delimiter = ','
  if (firstLine.includes(';')) delimiter = ';'
  else if (firstLine.includes('\t')) delimiter = '\t'

  const parseLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''))
    return result
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue

    const rowObj = {}
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] || ''
    })
    rows.push(rowObj)
  }

  return { headers, rows }
}

export default function ImportPlanilhaModal({ isOpen, onClose, defaultModule = 'auto' }) {
  const { 
    addDemanda, 
    addArrecadacao, 
    addBazarItem, 
    addTransacao, 
    addInventarioItem, 
    addKeepNote 
  } = useFinance()

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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setImportSummary(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const { headers, rows } = parseCSV(text)
        setParsedResult({ headers, rows })

        // Auto Organize Rows into Modules
        organizeRowsIntoModules(rows, headers, targetModule)
      } catch (err) {
        alert('Erro ao ler a planilha. Verifique se o arquivo está no formato CSV válido.')
      }
    }
    reader.readAsText(file, 'UTF-8')
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
            if (headerKey.includes(k)) return row[headerKey]
          }
        }
        return ''
      }

      // If user selected a specific target module
      if (selectedModule !== 'auto') {
        if (selectedModule === 'demandas') {
          result.demandas.push({
            item: getVal('item', 'descricao', 'nome', 'gasto') || 'Item de Demanda',
            comissao: getVal('comissao', 'setor', 'departamento') || 'Estrutura',
            custo: parseFloat(getVal('custo', 'valor', 'preco', 'orcamento').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
            prioridade: getVal('prioridade', 'nivel') || 'Inegociável',
            status: getVal('status', 'situacao') || 'Pendente',
            prazoData: getVal('prazo', 'data_limite') || ''
          })
        } else if (selectedModule === 'arrecadacao') {
          result.arrecadacoes.push({
            nome: getVal('nome', 'campanha', 'titulo', 'item') || 'Campanha de Arrecadação',
            tipo: getVal('tipo', 'categoria') || 'Rifa',
            meta: parseFloat(getVal('meta', 'valor', 'alvo').replace('R$', '').replace('.', '').replace(',', '.')) || 100,
            atual: parseFloat(getVal('atual', 'arrecadado', 'saldo').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
            status: getVal('status') || 'Em Andamento'
          })
        } else if (selectedModule === 'bazar') {
          result.bazar.push({
            nome: getVal('nome', 'item', 'peca', 'descricao') || 'Peça de Bazar',
            categoria: getVal('categoria', 'tipo') || 'Roupas',
            precoAvaliado: parseFloat(getVal('preco', 'valor', 'custo').replace('R$', '').replace('.', '').replace(',', '.')) || 10,
            doador: getVal('doador', 'origem') || 'Anônimo',
            tamanho: getVal('tamanho') || 'M',
            estado: getVal('estado', 'conservacao') || 'Excelente',
            status: getVal('status') || 'Em Avaliação'
          })
        } else if (selectedModule === 'caixa') {
          result.caixa.push({
            descricao: getVal('descricao', 'item', 'historico', 'nome') || 'Lançamento de Caixa',
            tipo: (getVal('tipo', 'movimentacao').toLowerCase().includes('saida') || getVal('tipo').toLowerCase().includes('despesa')) ? 'Saída' : 'Entrada',
            valor: parseFloat(getVal('valor', 'quantia', 'preco').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
            categoria: getVal('categoria', 'comissao') || 'Geral',
            data: getVal('data') || new Date().toISOString().split('T')[0]
          })
        } else if (selectedModule === 'inventario') {
          result.inventario.push({
            item: getVal('item', 'nome', 'material', 'equipamento') || 'Material de Inventário',
            comissao: getVal('comissao', 'setor') || 'Estrutura',
            quantidade: parseInt(getVal('quantidade', 'qtd', 'num'), 10) || 1,
            unidade: getVal('unidade', 'medida') || 'unidades',
            estadoConservacao: getVal('estado', 'conservacao') || 'Excelente (Pronto)',
            localArmazenamento: getVal('local', 'armazenamento', 'sala') || 'Armário Central',
            responsavelGuarda: getVal('responsavel', 'guarda') || 'Secretaria Geral',
            valorEstimadoEconomizado: parseFloat(getVal('economia', 'valor', 'custo').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
            status: getVal('status') || 'Disponível para Uso'
          })
        } else if (selectedModule === 'keep') {
          result.keep.push({
            titulo: getVal('titulo', 'nome', 'assunto') || 'Nota Importada',
            conteudo: getVal('conteudo', 'descricao', 'texto', 'nota') || '',
            tags: [getVal('tag', 'categoria') || '#Importado'],
            isPinned: false
          })
        }
        return
      }

      // AUTO-DETECTION HEURISTICS
      const rawText = JSON.stringify(row).toLowerCase()

      if (rawText.includes('inventario') || rawText.includes('patrimonio') || rawText.includes('armazenamento') || rawText.includes('guarda') || rawText.includes('reuso')) {
        result.inventario.push({
          item: getVal('item', 'nome', 'material', 'equipamento') || 'Material de Inventário',
          comissao: getVal('comissao', 'setor') || 'Estrutura',
          quantidade: parseInt(getVal('quantidade', 'qtd'), 10) || 1,
          unidade: getVal('unidade') || 'unidades',
          estadoConservacao: getVal('estado', 'conservacao') || 'Excelente (Pronto)',
          localArmazenamento: getVal('local', 'armazenamento') || 'Acervo REUNI',
          responsavelGuarda: getVal('responsavel', 'guarda') || 'Secretaria Geral',
          valorEstimadoEconomizado: parseFloat(getVal('economia', 'valor').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
          status: getVal('status') || 'Disponível para Uso'
        })
      } else if (rawText.includes('bazar') || rawText.includes('doador') || rawText.includes('tamanho')) {
        result.bazar.push({
          nome: getVal('nome', 'item', 'peca') || 'Peça de Bazar',
          categoria: getVal('categoria') || 'Roupas',
          precoAvaliado: parseFloat(getVal('preco', 'valor').replace('R$', '').replace('.', '').replace(',', '.')) || 10,
          doador: getVal('doador') || 'Anônimo',
          tamanho: getVal('tamanho') || 'M',
          estado: getVal('estado') || 'Excelente',
          status: getVal('status') || 'Em Avaliação'
        })
      } else if (rawText.includes('meta') || rawText.includes('arrecadado') || rawText.includes('campanha') || rawText.includes('rifa')) {
        result.arrecadacoes.push({
          nome: getVal('nome', 'campanha', 'item') || 'Campanha de Arrecadação',
          tipo: getVal('tipo') || 'Rifa',
          meta: parseFloat(getVal('meta', 'alvo').replace('R$', '').replace('.', '').replace(',', '.')) || 100,
          atual: parseFloat(getVal('atual', 'arrecadado').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
          status: getVal('status') || 'Em Andamento'
        })
      } else if (rawText.includes('demanda') || rawText.includes('custo') || rawText.includes('prioridade')) {
        result.demandas.push({
          item: getVal('item', 'descricao', 'nome') || 'Item de Demanda',
          comissao: getVal('comissao', 'setor') || 'Estrutura',
          custo: parseFloat(getVal('custo', 'valor').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
          prioridade: getVal('prioridade') || 'Inegociável',
          status: getVal('status') || 'Pendente',
          prazoData: getVal('prazo') || ''
        })
      } else if (rawText.includes('entrada') || rawText.includes('saida') || rawText.includes('receita') || rawText.includes('despesa') || rawText.includes('extrato')) {
        result.caixa.push({
          descricao: getVal('descricao', 'item', 'historico') || 'Lançamento de Caixa',
          tipo: rawText.includes('saida') || rawText.includes('despesa') ? 'Saída' : 'Entrada',
          valor: parseFloat(getVal('valor', 'quantia').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
          categoria: getVal('categoria') || 'Geral',
          data: getVal('data') || new Date().toISOString().split('T')[0]
        })
      } else {
        // Fallback default: Demanda
        result.demandas.push({
          item: getVal('item', 'nome', 'descricao') || 'Demanda Importada',
          comissao: getVal('comissao') || 'Estrutura',
          custo: parseFloat(getVal('custo', 'valor', 'preco').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
          prioridade: 'Inegociável',
          status: 'Pendente'
        })
      }
    })

    setMappedData(result)
  }

  const handleConfirmImport = () => {
    let totalImported = 0
    const counts = { demandas: 0, arrecadacoes: 0, bazar: 0, caixa: 0, inventario: 0, keep: 0 }

    // Execute Imports
    mappedData.demandas.forEach(item => { addDemanda(item); counts.demandas++ })
    mappedData.arrecadacoes.forEach(item => { addArrecadacao(item); counts.arrecadacoes++ })
    mappedData.bazar.forEach(item => { addBazarItem(item); counts.bazar++ })
    mappedData.caixa.forEach(item => { addTransacao(item); counts.caixa++ })
    mappedData.inventario.forEach(item => { addInventarioItem(item); counts.inventario++ })
    mappedData.keep.forEach(item => { addKeepNote(item); counts.keep++ })

    totalImported = Object.values(counts).reduce((a, b) => a + b, 0)

    setImportSummary({ total: totalImported, counts })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importador Inteligente de Planilhas (CSV / Excel)">
      <div className="space-y-5">
        
        {/* Banner Explicativo */}
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-primary shrink-0 animate-pulse" />
            <span>
              <strong>Organização Automática de Dados:</strong> O sistema analisa as colunas e distribui automaticamente os itens da sua planilha entre os módulos de <strong>Demandas, Arrecadação, Bazar, Caixa e Inventário</strong>.
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
              if (parsedResult) {
                organizeRowsIntoModules(parsedResult.rows, parsedResult.headers, e.target.value)
              }
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="auto">✨ Auto-Organizar por Colunas e Palavras-chave</option>
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
            Selecione o Arquivo (.CSV ou exportado do Excel / Google Sheets) *
          </label>

          <label className="flex flex-col items-center justify-center gap-2 p-7 border-2 border-dashed border-border rounded-2xl bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all text-xs text-muted-foreground font-medium text-center group">
            <FileSpreadsheet className="w-9 h-9 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-bold text-foreground">
              {fileName ? `Arquivo Selecionado: ${fileName}` : 'Clique para selecionar a planilha (.CSV / .TXT)'}
            </span>
            <span className="text-[10px] opacity-70">
              {parsedResult ? `${parsedResult.rows.length} linhas lidas da planilha` : 'Suporta arquivos salvos do Excel, LibreOffice e Google Planilhas'}
            </span>
            <input type="file" accept=".csv, .txt, .tsv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

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

        {/* Mensagem de Sucesso */}
        {importSummary && (
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 space-y-2 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" /> Importação Concluída com Sucesso!
            </div>
            <p className="text-xs text-emerald-400">
              Foram adicionados <strong>{importSummary.total} itens</strong> e organizados nos módulos correspondentes.
            </p>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
          >
            {importSummary ? 'Fechar' : 'Cancelar'}
          </button>

          {!importSummary && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parsedResult || parsedResult.rows.length === 0}
              className="px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Importar e Organizar Planilha
            </button>
          )}
        </div>

      </div>
    </Modal>
  )
}
