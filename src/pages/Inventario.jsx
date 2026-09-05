import React, { useState } from 'react'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Boxes, 
  Archive, 
  ShieldCheck, 
  MapPin, 
  User, 
  Sparkles, 
  PiggyBank 
} from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import AddInventarioItemModal from '../components/AddInventarioItemModal'
import { COMISSOES } from '../constants/comissoes'

function StatCard({ title, value, icon: Icon, subtitle, type = 'normal' }) {
  const colorStyles = {
    normal: 'border-border bg-card text-foreground',
    positive: 'border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400',
    accent: 'border-primary/30 bg-primary/5 text-primary',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400'
  }

  return (
    <div className={`p-5 rounded-2xl border glass-panel shadow-xs transition-all duration-200 hover:shadow-md ${colorStyles[type]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <div className="p-2 rounded-xl bg-secondary/80">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
      </div>
      <div className="text-2xl font-extrabold tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1.5 font-medium">{subtitle}</p>
      )}
    </div>
  )
}

export default function Inventario() {
  const { inventarioItems, deleteInventarioItem } = useFinance()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedComissao, setSelectedComissao] = useState('Todas')
  const [selectedEstado, setSelectedEstado] = useState('Todos')

  // Filter items
  const itemsFiltrados = inventarioItems.filter(item => {
    const matchesSearch = 
      (item.item || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.localArmazenamento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.responsavelGuarda || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.observacoes || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesComissao = selectedComissao === 'Todas' || item.comissao === selectedComissao
    const matchesEstado = selectedEstado === 'Todos' || (item.estadoConservacao || '').includes(selectedEstado)

    return matchesSearch && matchesComissao && matchesEstado
  })

  // Calculated Metrics
  const totalUnidades = inventarioItems.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0)
  const totalEconomiaEstimada = inventarioItems.reduce((sum, item) => sum + (Number(item.valorEstimadoEconomizado) || 0), 0)
  const itensProntosParaUso = inventarioItems.filter(i => (i.estadoConservacao || '').includes('Excelente') || i.status === 'Disponível para Uso').length

  const exportarCSV = () => {
    const headers = ['ID', 'Item/Material', 'Comissão', 'Quantidade', 'Unidade', 'Estado', 'Local Armazenamento', 'Responsável', 'Economia (R$)', 'Status', 'Data Cadastro']
    const rows = inventarioItems.map(i => [
      i.id, 
      `"${i.item}"`, 
      i.comissao, 
      i.quantidade, 
      i.unidade, 
      `"${i.estadoConservacao}"`, 
      `"${i.localArmazenamento}"`, 
      `"${i.responsavelGuarda}"`, 
      i.valorEstimadoEconomizado, 
      `"${i.status}"`,
      i.dataCadastro
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `REUNI_Inventario_Patrimonio_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Boxes className="w-8 h-8 text-primary" />
            Inventário & Patrimônio Acumulado
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de materiais e acervo reaproveitados de edições anteriores (Capítulo 6 - Bíblia REUNI)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={exportarCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-secondary text-foreground hover:bg-secondary/80 rounded-xl text-xs font-semibold transition-all border border-border"
          >
            <Download className="w-4 h-4 text-primary" />
            Exportar CSV
          </button>

          <button 
            onClick={() => {
              setItemToEdit(null)
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Item no Acervo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Itens Catalogados" 
          value={inventarioItems.length} 
          icon={Archive} 
          subtitle="Tipos de materiais mapeados"
          type="accent"
        />
        <StatCard 
          title="Unidades em Acervo" 
          value={totalUnidades} 
          icon={Boxes} 
          subtitle="Quantidade total de peças físicas"
        />
        <StatCard 
          title="Economia com Reuso" 
          value={`R$ ${totalEconomiaEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={PiggyBank} 
          subtitle="Valor poupado ao não comprar este ano"
          type="positive"
        />
        <StatCard 
          title="Prontos para Uso" 
          value={`${itensProntosParaUso} de ${inventarioItems.length}`} 
          icon={CheckCircle2} 
          subtitle="Materiais em excelente estado"
          type="amber"
        />
      </div>

      {/* Banner de Sustentabilidade */}
      <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 shrink-0" />
          <span>
            <strong>Sustentabilidade & Economia do Evento:</strong> Todos os materiais catalogados nesta aba foram conservados das edições anteriores e <u>NÃO precisam ser comprados este ano</u>, garantindo folga no orçamento.
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card glass-panel flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Buscar por material, guarda ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Dropdowns */}
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
            <option value="Todas">Todas as Comissões</option>
            {COMISSOES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select 
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="px-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="Todos">Todos os Estados</option>
            <option value="Excelente">Excelente (Pronto)</option>
            <option value="Bom Estado">Bom Estado</option>
            <option value="Necessita">Necessita Reparo</option>
            <option value="Desgastado">Desgastado</option>
          </select>
        </div>
      </div>

      {/* Table & Cards */}
      <div className="rounded-2xl border border-border bg-card glass-panel overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-secondary/60 text-muted-foreground border-b border-border font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Item / Material</th>
                <th className="px-6 py-4">Comissão</th>
                <th className="px-6 py-4">Qtd / Unidade</th>
                <th className="px-6 py-4">Conservação</th>
                <th className="px-6 py-4">Local & Guarda</th>
                <th className="px-6 py-4">Economia Est.</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-muted-foreground text-sm">
                    Nenhum item de inventário encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itemsFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">
                      {item.item}
                      {item.observacoes && (
                        <span className="block text-xs font-normal text-muted-foreground mt-0.5 truncate max-w-xs">
                          {item.observacoes}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-muted-foreground">
                      {item.comissao}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-foreground">
                      {item.quantidade} <span className="text-xs font-medium text-muted-foreground">{item.unidade || 'unid.'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                        (item.estadoConservacao || '').includes('Excelente')
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : (item.estadoConservacao || '').includes('Bom')
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {item.estadoConservacao}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs space-y-0.5">
                      {item.localArmazenamento && (
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <MapPin className="w-3 h-3 text-primary shrink-0" /> {item.localArmazenamento}
                        </span>
                      )}
                      {item.responsavelGuarda && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" /> {item.responsavelGuarda}
                        </span>
                      )}
                      {!item.localArmazenamento && !item.responsavelGuarda && (
                        <span className="text-muted-foreground italic">Não especificado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-500">
                      R$ {Number(item.valorEstimadoEconomizado || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary text-foreground border border-border/80">
                        {item.status || 'Disponível para Uso'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setItemToEdit(item)
                            setIsModalOpen(true)
                          }}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                          title="Editar Item"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteInventarioItem(item.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-lg transition-colors"
                          title="Excluir Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddInventarioItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setItemToEdit(null)
        }}
        itemToEdit={itemToEdit}
      />
    </div>
  )
}
