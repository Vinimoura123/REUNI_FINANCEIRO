import React, { useState } from 'react'
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  Download, 
  Search, 
  Filter, 
  ShieldCheck, 
  Eye, 
  FileText, 
  Upload, 
  Image as ImageIcon, 
  Grid, 
  ListFilter,
  Edit3 
} from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import { withAccessToken } from '../lib/auth'
import AddTransacaoModal from '../components/AddTransacaoModal'
import UploadComprovanteModal from '../components/UploadComprovanteModal'
import ViewComprovanteModal from '../components/ViewComprovanteModal'

export default function Caixa() {
  const { transacoes, deleteTransacao, saldoAtual, totalArrecadado, totalGastos } = useFinance()

  const [activeTab, setActiveTab] = useState('extrato') // 'extrato' | 'galeria'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [transacaoToEdit, setTransacaoToEdit] = useState(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [galeriaFiltro, setGaleriaFiltro] = useState('Todos')

  const [viewComprovante, setViewComprovante] = useState(null)

  // Extrato filter
  const transacoesFiltradas = transacoes.filter(t => {
    const matchesSearch = t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = tipoFiltro === 'Todos' || t.tipo === tipoFiltro
    return matchesSearch && matchesTipo
  })

  // Galeria de Comprovantes items
  const transacoesComComprovante = transacoes.filter(t => t.comprovanteUrl)
  
  const galeriaFiltrada = transacoesComComprovante.filter(t => {
    if (galeriaFiltro === 'Todos') return true
    return t.categoria === galeriaFiltro
  })

  const exportarCSV = () => {
    const headers = ['ID', 'Data', 'Descrição', 'Tipo', 'Valor', 'Categoria']
    const rows = transacoes.map(t => [t.id, t.data, `"${t.descricao}"`, t.tipo, t.valor, t.categoria])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `REUNI_Caixa_Extrato_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Gestão de Caixa & Transparência</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Registro detalhado de entradas, saídas e comprovantes auditáveis (Capítulo 6.8 da Bíblia REUNI)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
          >
            <Upload className="w-4 h-4" />
            Upload de Comprovante
          </button>

          <button 
            onClick={exportarCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-secondary text-foreground hover:bg-secondary/80 rounded-xl text-xs font-semibold transition-all border border-border"
          >
            <Download className="w-4 h-4 text-primary" />
            Exportar CSV
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-xs font-semibold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl border border-border bg-card glass-panel">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Entradas Totais</span>
          <span className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1 block">
            + R$ {totalArrecadado.toFixed(2)}
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card glass-panel">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Saídas Totais</span>
          <span className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1 block">
            - R$ {totalGastos.toFixed(2)}
          </span>
        </div>

        <div className={`p-5 rounded-2xl border glass-panel ${
          saldoAtual >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
        }`}>
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Saldo Atual em Caixa</span>
          <span className={`text-2xl font-extrabold mt-1 block ${saldoAtual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            R$ {saldoAtual.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Directives Banner */}
      <div className="p-4 rounded-2xl border border-border bg-secondary/30 text-muted-foreground flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span><strong>Transparência & Memória:</strong> Toda movimentação é registrada com histórico auditável e comprovantes arquivados para a próxima edição da REUNI.</span>
        </div>
      </div>

      {/* Navigation Tabs (Extrato vs Galeria de Comprovantes) */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 bg-secondary/40 p-1 rounded-2xl border border-border">
          <button
            onClick={() => setActiveTab('extrato')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'extrato' 
                ? 'bg-primary text-primary-foreground shadow-xs' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            Extrato de Movimentações ({transacoes.length})
          </button>

          <button
            onClick={() => setActiveTab('galeria')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'galeria' 
                ? 'bg-primary text-primary-foreground shadow-xs' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Galeria de Comprovantes Anexados ({transacoesComComprovante.length})
          </button>
        </div>
      </div>

      {/* TAB 1: EXTRATO DE MOVIMENTAÇÕES */}
      {activeTab === 'extrato' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl border border-border bg-card glass-panel flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar por descrição ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <button
                onClick={() => setTipoFiltro('Todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  tipoFiltro === 'Todos' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTipoFiltro('Entrada')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  tipoFiltro === 'Entrada' ? 'bg-green-600 text-white' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Entradas
              </button>
              <button
                onClick={() => setTipoFiltro('Saída')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  tipoFiltro === 'Saída' ? 'bg-red-600 text-white' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Saídas
              </button>
            </div>
          </div>

          {/* Extrato Table */}
          <div className="rounded-2xl border border-border bg-card glass-panel overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-secondary/40 flex justify-between items-center">
              <h3 className="font-bold text-base">Extrato de Movimentações</h3>
              <span className="text-xs text-muted-foreground">{transacoesFiltradas.length} lançamentos</span>
            </div>

            <div className="divide-y divide-border/60">
              {transacoesFiltradas.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  Nenhuma movimentação encontrada para a busca.
                </div>
              ) : (
                transacoesFiltradas.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${
                        t.tipo === 'Entrada' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {t.tipo === 'Entrada' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-foreground flex items-center gap-2">
                          {t.descricao}
                          {t.comprovanteUrl && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold flex items-center gap-1 border border-emerald-500/20">
                              <FileText className="w-3 h-3" /> Comprovante
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.dataHora || t.data} • Categoria: <span className="font-semibold text-foreground">{t.categoria}</span>
                          {t.vendedor && <span className="ml-2 font-medium text-foreground">| Vendedor: <strong>{t.vendedor}</strong></span>}
                          {t.comprador && <span className="ml-2 font-medium text-foreground">| Comprador: <strong>{t.comprador}</strong></span>}
                          {t.doador && <span className="ml-2 font-medium text-foreground">| Doador: <strong>{t.doador}</strong></span>}
                          {t.qtdBilhetes && <span className="ml-2 font-medium text-foreground">| {t.qtdBilhetes} bilhete(s) ({t.numerosBilhetes || 'Sem nº'})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-base font-extrabold ${
                        t.tipo === 'Entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {t.tipo === 'Entrada' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                      </span>

                      {t.comprovanteUrl && (
                        <button
                          onClick={() => setViewComprovante({
                            url: t.comprovanteUrl,
                            id: t.id,
                            titulo: `Comprovante: ${t.descricao}`,
                            detalhe: `Data: ${t.data} | Categoria: ${t.categoria} | Valor: R$ ${Number(t.valor).toFixed(2)}`
                          })}
                          className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors border border-primary/20"
                          title="Visualizar Comprovante Anexado"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setTransacaoToEdit(t)
                          setIsModalOpen(true)
                        }}
                        className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-secondary transition-colors"
                        title="Editar Lançamento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteTransacao(t.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-secondary transition-colors"
                        title="Excluir Lançamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GALERIA AUDITÁVEL DE COMPROVANTES */}
      {activeTab === 'galeria' && (
        <div className="space-y-6">
          {/* Galeria Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['Todos', 'Rifa', 'Bazar', 'Doação', 'Parceria', 'Comunicação', 'Estrutura'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setGaleriaFiltro(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    galeriaFiltro === cat
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
                  }`}
                >
                  {cat === 'Todos' ? 'Todas as Categorias' : cat}
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground font-semibold shrink-0">
              {galeriaFiltrada.length} comprovantes exibidos
            </span>
          </div>

          {/* Grid de Cards de Comprovantes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galeriaFiltrada.length === 0 ? (
              <div className="col-span-full p-12 text-center text-muted-foreground text-sm border border-dashed border-border rounded-2xl space-y-3">
                <FileText className="w-10 h-10 mx-auto text-primary opacity-50" />
                <p className="font-semibold">Nenhum comprovante encontrado nesta categoria.</p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl transition-all shadow-xs"
                >
                  📤 Enviar Primeiro Comprovante
                </button>
              </div>
            ) : (
              galeriaFiltrada.map((item) => (
                <div key={item.id} className="p-5 rounded-2xl border border-border bg-card glass-panel flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    {/* Header Card */}
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                        {item.categoria}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">{item.data}</span>
                    </div>

                    {/* Image Preview */}
                    <div className="mb-3 rounded-xl overflow-hidden border border-border/80 bg-black/40 h-44 flex items-center justify-center relative group">
                      {item.comprovanteUrl.startsWith('data:image') || item.comprovanteUrl.startsWith('http') || item.comprovanteUrl.startsWith('blob:') || item.comprovanteUrl.startsWith('/api/documents/') ? (
                        <img src={withAccessToken(item.comprovanteUrl)} alt={item.descricao} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <FileText className="w-12 h-12 text-primary opacity-60" />
                      )}

                      <button
                        onClick={() => setViewComprovante({
                          url: item.comprovanteUrl,
                          id: item.id,
                          titulo: `Comprovante: ${item.descricao}`,
                          detalhe: `Data: ${item.data} | Categoria: ${item.categoria} | Valor: R$ ${Number(item.valor).toFixed(2)}`
                        })}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-xs backdrop-blur-xs"
                      >
                        <Eye className="w-5 h-5" /> Ampliar Comprovante
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-foreground line-clamp-1">{item.descricao}</h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-emerald-500">
                      R$ {Number(item.valor).toFixed(2)}
                    </span>

                    <button
                      onClick={() => setViewComprovante({
                        url: item.comprovanteUrl,
                        id: item.id,
                        titulo: `Comprovante: ${item.descricao}`,
                        detalhe: `Data: ${item.data} | Categoria: ${item.categoria} | Valor: R$ ${Number(item.valor).toFixed(2)}`
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-colors border border-border"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" /> Visualizar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddTransacaoModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          setTransacaoToEdit(null)
        }} 
        transacaoToEdit={transacaoToEdit}
      />
      <UploadComprovanteModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
      
      <ViewComprovanteModal
        isOpen={!!viewComprovante}
        onClose={() => setViewComprovante(null)}
        comprovanteUrl={viewComprovante?.url}
        titulo={viewComprovante?.titulo}
        detalhe={viewComprovante?.detalhe}
        colecao="transacoes"
        recordId={viewComprovante?.id}
      />
    </div>
  )
}
