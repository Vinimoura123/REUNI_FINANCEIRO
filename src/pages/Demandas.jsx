import React, { useState } from 'react'
import { Plus, Search, Trash2, CheckCircle, Clock, AlertCircle, Filter, Edit3, FileSpreadsheet, FileText, Maximize2, Tag } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import AddDemandaModal from '../components/AddDemandaModal'
import ImportPlanilhaModal from '../components/ImportPlanilhaModal'
import PagarDemandaModal from '../components/PagarDemandaModal'
import DetalhamentoModal from '../components/DetalhamentoModal'
import { COMISSOES } from '../constants/comissoes'

export default function Demandas() {
  const { demandas, deleteDemanda, updateDemandaStatus } = useFinance()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [demandaToEdit, setDemandaToEdit] = useState(null)
  const [demandaParaPagar, setDemandaParaPagar] = useState(null)
  const [demandaParaDetalhamento, setDemandaParaDetalhamento] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedComissao, setSelectedComissao] = useState('Todas')
  const [selectedPrioridade, setSelectedPrioridade] = useState('Todas')

  const comissoesUnicas = ['Todas', ...new Set([...COMISSOES, ...demandas.map(d => d.comissao)])]

  const demandasFiltradas = demandas.filter(d => {
    const termo = searchTerm.toLowerCase()
    const matchesSearch = (d.item || '').toLowerCase().includes(termo) || 
                          (d.comissao || '').toLowerCase().includes(termo) ||
                          (d.detalhamento || '').toLowerCase().includes(termo) ||
                          (d.tipoSemCusto || '').toLowerCase().includes(termo)
    const matchesComissao = selectedComissao === 'Todas' || d.comissao === selectedComissao
    const matchesPrioridade = selectedPrioridade === 'Todas' || d.prioridade === selectedPrioridade
    return matchesSearch && matchesComissao && matchesPrioridade
  })

  const totalFiltrado = demandasFiltradas.reduce((sum, d) => sum + (Number(d.custo) || 0), 0)
  const semCustoCount = demandasFiltradas.filter(d => d.semCusto || Number(d.custo) === 0).length

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Planejamento de Demandas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Levantamento de necessidades econômicas por comissão (Capítulo 6.2 - Bíblia REUNI)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-secondary text-foreground hover:bg-secondary/80 rounded-xl text-xs font-semibold transition-all border border-border"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Importar Planilha
          </button>
          <button 
            onClick={() => {
              setDemandaToEdit(null)
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Demanda
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card glass-panel flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Buscar item, comissão ou detalhamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select 
            value={selectedComissao}
            onChange={(e) => setSelectedComissao(e.target.value)}
            className="px-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            {comissoesUnicas.map(c => (
              <option key={c} value={c}>{c === 'Todas' ? 'Todas Comissões' : c}</option>
            ))}
          </select>

          <select 
            value={selectedPrioridade}
            onChange={(e) => setSelectedPrioridade(e.target.value)}
            className="px-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="Todas">Todas Prioridades</option>
            <option value="Inegociável">Inegociável</option>
            <option value="Adaptável">Adaptável</option>
            <option value="Desejável">Desejável</option>
          </select>
        </div>
      </div>

      {/* Stats Summary of Table */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground px-1">
        <span>
          Mostrando {demandasFiltradas.length} de {demandas.length} demandas
          {semCustoCount > 0 && ` (${semCustoCount} sem custo / a orçar)`}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-bold text-foreground text-sm">
            Subtotal Orçado: R$ {totalFiltrado.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card glass-panel overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-secondary/60 text-muted-foreground border-b border-border font-bold tracking-wider">
              <tr>
                <th className="px-5 py-4">Comissão</th>
                <th className="px-5 py-4">Nome do Item</th>
                <th className="px-5 py-4">Detalhamento</th>
                <th className="px-5 py-4">Custo Est.</th>
                <th className="px-5 py-4">Prioridade</th>
                <th className="px-5 py-4">Prazo Limite</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {demandasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-muted-foreground text-sm">
                    Nenhuma demanda encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                demandasFiltradas.map((d) => {
                  const hasDeadline = !!d.prazoData
                  let deadlineBadge = null
                  if (hasDeadline) {
                    const parts = d.prazoData.split('-')
                    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d.prazoData
                    const formattedTime = d.prazoHora ? ` às ${d.prazoHora}` : ''
                    const deadlineDate = new Date(d.prazoHora ? `${d.prazoData}T${d.prazoHora}` : `${d.prazoData}T23:59:59`)
                    const isOverdue = deadlineDate < new Date() && d.status !== 'Pago'
                    deadlineBadge = (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        isOverdue ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {isOverdue ? 'Atrasado: ' : ''}{formattedDate}{formattedTime}
                      </span>
                    )
                  }

                  const isSemCusto = d.semCusto || Number(d.custo) === 0
                  const rotuloSemCusto = d.tipoSemCusto || 'A Definir'

                  return (
                    <tr key={d.id} className="hover:bg-secondary/30 transition-colors">
                      {/* Comissão */}
                      <td className="px-5 py-3.5 font-semibold text-foreground whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-secondary/80 text-xs font-bold border border-border/60">
                          {d.comissao}
                        </span>
                      </td>

                      {/* Nome do Item */}
                      <td className="px-5 py-3.5 text-foreground font-bold">
                        <span className="block max-w-[220px] truncate" title={d.item}>
                          {d.item}
                        </span>
                      </td>

                      {/* Detalhamento com Botão para Pop-up Flutuante */}
                      <td className="px-5 py-3.5">
                        {d.detalhamento && d.detalhamento.trim() ? (
                          <button
                            type="button"
                            onClick={() => setDemandaParaDetalhamento(d)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-all group shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                            title="Abrir detalhamento completo na janela flutuante"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver Detalhes</span>
                            <Maximize2 className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDemandaToEdit(d)
                              setIsModalOpen(true)
                            }}
                            className="text-xs text-muted-foreground/60 hover:text-primary italic flex items-center gap-1 transition-colors"
                            title="Adicionar detalhamento a este item"
                          >
                            <span>+ Detalhar</span>
                          </button>
                        )}
                      </td>

                      {/* Custo Estimado / Sem Custo */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isSemCusto ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                            title={`Modalidade: ${rotuloSemCusto}`}
                          >
                            <Tag className="w-3 h-3" />
                            <span className="truncate max-w-[130px]">{rotuloSemCusto}</span>
                          </span>
                        ) : (
                          <span className="font-extrabold text-foreground text-sm">
                            R$ {Number(d.custo).toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Prioridade */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                          d.prioridade === 'Inegociável'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : d.prioridade === 'Adaptável'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {d.prioridade === 'Inegociável' && <AlertCircle className="w-3 h-3"/>}
                          {d.prioridade}
                        </span>
                      </td>

                      {/* Prazo */}
                      <td className="px-5 py-3.5 text-xs font-medium whitespace-nowrap">
                        {deadlineBadge || <span className="text-muted-foreground italic">Sem prazo</span>}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            const proximoStatus = d.status === 'Pago' ? 'Pendente' : d.status === 'Pendente' ? 'Aprovado' : 'Pago'
                            if (proximoStatus === 'Pago') {
                              setDemandaParaPagar(d)
                            } else {
                              updateDemandaStatus(d.id, proximoStatus)
                            }
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                            d.status === 'Pago'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : d.status === 'Aprovado'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                          }`}
                          title="Clique para alternar o status"
                        >
                          {d.status === 'Pago' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {d.status}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => {
                              setDemandaToEdit(d)
                              setIsModalOpen(true)
                            }}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                            title="Editar Demanda"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteDemanda(d.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                            title="Excluir Demanda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Adicionar/Editar */}
      <AddDemandaModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          setDemandaToEdit(null)
        }} 
        demandaToEdit={demandaToEdit}
      />

      {/* Modal Importar Planilha */}
      <ImportPlanilhaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultModule="demandas"
      />

      {/* Modal Pagar Demanda */}
      <PagarDemandaModal
        isOpen={!!demandaParaPagar}
        onClose={() => setDemandaParaPagar(null)}
        demanda={demandaParaPagar}
      />

      {/* Janelinha Pop-up Flutuante Quadrada Arredondada para Leitura de Detalhamento */}
      <DetalhamentoModal
        isOpen={Boolean(demandaParaDetalhamento)}
        onClose={() => setDemandaParaDetalhamento(null)}
        demanda={demandaParaDetalhamento}
      />
    </div>
  )
}
