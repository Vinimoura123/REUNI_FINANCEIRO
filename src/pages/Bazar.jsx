import React, { useState } from 'react'
import { 
  Plus, 
  ShoppingBag, 
  BookOpen, 
  Shirt, 
  Gamepad2, 
  Package, 
  Trash2, 
  CheckCircle2, 
  DollarSign, 
  Info, 
  FileText, 
  Eye, 
  Tag, 
  Clock, 
  Check,
  Edit3 
} from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import AddBazarItemModal from '../components/AddBazarItemModal'
import VenderBazarItemModal from '../components/VenderBazarItemModal'
import ViewComprovanteModal from '../components/ViewComprovanteModal'

export default function Bazar() {
  const { 
    bazarItems, 
    updateBazarItemStatus, 
    deleteBazarItem 
  } = useFinance()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState(null)
  const [itemForSale, setItemForSale] = useState(null)
  const [viewComprovante, setViewComprovante] = useState(null)

  const [selectedCategoria, setSelectedCategoria] = useState('Todos')
  const [selectedStatus, setSelectedStatus] = useState('Todos')

  const categorias = ['Todos', 'Livros', 'Brinquedos', 'Roupas', 'Objetos Ademais']
  const statusOptions = ['Todos', 'Em Avaliação', 'Aprovado para Venda', 'Vendido']

  // Filters
  const itensFiltrados = bazarItems.filter(item => {
    const matchCat = selectedCategoria === 'Todos' || item.categoria === selectedCategoria
    const matchStat = selectedStatus === 'Todos' || item.status === selectedStatus
    return matchCat && matchStat
  })

  // Metrics
  const totalItens = bazarItems.length
  const totalAvaliacao = bazarItems.filter(i => i.status === 'Em Avaliação').length
  const totalAprovados = bazarItems.filter(i => i.status === 'Aprovado para Venda').length
  const totalVendidos = bazarItems.filter(i => i.status === 'Vendido').length

  const valorAcervoEstimado = bazarItems
    .filter(i => i.status === 'Aprovado para Venda' || i.status === 'Em Avaliação')
    .reduce((sum, i) => sum + Number(i.precoAvaliado), 0)

  const valorTotalArrecadado = bazarItems
    .filter(i => i.status === 'Vendido')
    .reduce((sum, i) => sum + Number(i.precoVendido || i.precoAvaliado), 0)

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Livros': return BookOpen
      case 'Brinquedos': return Gamepad2
      case 'Roupas': return Shirt
      default: return Package
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Aprovado para Venda':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'Vendido':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'Em Avaliação':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      default:
        return 'bg-secondary text-muted-foreground border-border'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary" />
            Curadoria do Bazar Solidário
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de acervo doado: Livros, Brinquedos, Roupas e Objetos Ademais com comprovantes de transação.
          </p>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-sm font-semibold transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Objeto no Bazar
        </button>
      </div>

      {/* Chapter 6 Directives Banner */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 text-primary flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sm block mb-0.5">Diretrizes da Curadoria do Bazar REUNI:</span>
          • <strong>Triagem Obrigatória:</strong> Todo objeto doado passa pelo status <em>Em Avaliação</em> antes de ir ao balcão de vendas.<br/>
          • <strong>Categorização Precisa:</strong> Separação em <em>Livros, Brinquedos, Roupas e Objetos Ademais</em>.<br/>
          • <strong>Comprovante Obrigatório:</strong> Toda venda realizada gera receita direta no Caixa com anexo do comprovante de PIX/recibo.
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card glass-panel flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total em Acervo</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{totalItens} <span className="text-xs font-normal text-muted-foreground">itens</span></span>
            <span className="text-xs text-amber-500 font-semibold">{totalAvaliacao} em triagem</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card glass-panel flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aprovados p/ Venda</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-500">{totalAprovados} <span className="text-xs font-normal text-muted-foreground">prontos</span></span>
            <span className="text-xs text-emerald-400 font-medium">Disponíveis</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card glass-panel flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acervo Estimado (R$)</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">R$ {valorAcervoEstimado.toFixed(2)}</span>
            <span className="text-[10px] text-muted-foreground">Preço de tabela</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 glass-panel flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Arrecadado com Vendas</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-500">R$ {valorTotalArrecadado.toFixed(2)}</span>
            <span className="text-xs text-emerald-500 font-bold">{totalVendidos} vendidos</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          {categorias.map(cat => {
            const Icon = getCategoryIcon(cat)
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoria(cat)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategoria === cat
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat}
              </button>
            )
          })}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
          >
            {statusOptions.map(st => (
              <option key={st} value={st}>{st === 'Todos' ? 'Todos os Status' : st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {itensFiltrados.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
            Nenhum objeto encontrado nesta categoria ou status de curadoria.
          </div>
        ) : (
          itensFiltrados.map((item) => {
            const IconComponent = getCategoryIcon(item.categoria)
            const isVendido = item.status === 'Vendido'

            return (
              <div 
                key={item.id} 
                className="p-5 rounded-2xl border border-border bg-card glass-panel flex flex-col justify-between hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Top Bar: Category & Status */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary text-foreground border border-border">
                      <IconComponent className="w-3 h-3 text-primary" />
                      {item.categoria}
                    </span>

                    <div className="flex items-center gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>

                      <button
                        onClick={() => {
                          setItemToEdit(item)
                          setIsAddModalOpen(true)
                        }}
                        className="p-1 text-muted-foreground hover:text-primary rounded-lg transition-colors ml-1"
                        title="Editar objeto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteBazarItem(item.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                        title="Excluir do acervo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Photo or Image Fallback */}
                  {item.fotoUrl ? (
                    <div className="mb-3 rounded-xl overflow-hidden border border-border/60 max-h-48 bg-black/20 flex items-center justify-center">
                      <img src={item.fotoUrl} alt={item.nome} className="w-full h-40 object-cover" />
                    </div>
                  ) : null}

                  {/* Title & Traceability Metadata */}
                  <h3 className="font-bold text-base text-foreground leading-snug">{item.nome}</h3>
                  <div className="text-xs text-muted-foreground mt-1.5 space-y-1 bg-secondary/20 p-2.5 rounded-xl border border-border/50">
                    <p>🎁 Doador: <strong className="text-foreground font-medium">{item.doador || 'Anônimo'}</strong></p>
                    <p>📅 Recebido em: <span className="text-foreground font-medium">{item.dataHoraRecebimento || item.dataHora || 'Data não informada'}</span></p>
                    <p>🏷️ Estado: <span className="inline-block px-1.5 py-0.5 rounded bg-secondary text-foreground text-[10px] font-semibold">{item.estado}</span></p>
                    
                    {isVendido && (
                      <div className="pt-1.5 mt-1.5 border-t border-border/40 space-y-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <p>👤 Vendedor (Balcão): <strong>{item.vendedor || 'Não informado'}</strong></p>
                        <p>🛒 Comprador: <strong>{item.comprador || 'Não informado'}</strong></p>
                        <p>🕒 Data da Venda: <strong>{item.dataHoraVenda || item.dataHora || 'Não informada'}</strong></p>
                      </div>
                    )}
                  </div>

                  {item.observacao && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed italic bg-secondary/30 p-2 rounded-lg">
                      "{item.observacao}"
                    </p>
                  )}
                </div>

                {/* Bottom Section: Pricing & Actions */}
                <div className="mt-5 pt-3 border-t border-border/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium">
                      {isVendido ? 'Vendido Por' : 'Preço Avaliado'}
                    </span>
                    <span className={`text-base font-extrabold ${isVendido ? 'text-emerald-500' : 'text-foreground'}`}>
                      R$ {Number(isVendido ? (item.precoVendido || item.precoAvaliado) : item.precoAvaliado).toFixed(2)}
                    </span>
                  </div>

                  {/* Action Buttons based on status */}
                  <div className="space-y-2">
                    {item.status === 'Em Avaliação' && (
                      <button
                        onClick={() => updateBazarItemStatus(item.id, 'Aprovado para Venda')}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aprovar Curadoria p/ Venda
                      </button>
                    )}

                    {item.status === 'Aprovado para Venda' && (
                      <button
                        onClick={() => setItemForSale(item)}
                        className="w-full py-2 px-3 bg-primary hover:opacity-90 text-primary-foreground text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Registrar Venda (PIX / Recibo)
                      </button>
                    )}

                    {isVendido && (
                      <div className="flex items-center gap-2">
                        {item.comprovanteUrl ? (
                          <button
                            onClick={() => setViewComprovante({
                              url: item.comprovanteUrl,
                              titulo: `Comprovante de Venda - ${item.nome}`,
                              detalhe: `Comprador: ${item.comprador || 'Não informado'} | Valor: R$ ${Number(item.precoVendido || item.precoAvaliado).toFixed(2)}`
                            })}
                            className="flex-1 py-2 px-3 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-border"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            Ver Comprovante PIX
                          </button>
                        ) : (
                          <span className="w-full text-center text-xs text-muted-foreground py-1 font-medium italic">
                            Venda concluída (sem anexo)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modals */}
      <AddBazarItemModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false)
          setItemToEdit(null)
        }} 
        itemToEdit={itemToEdit}
      />

      <VenderBazarItemModal 
        isOpen={!!itemForSale} 
        onClose={() => setItemForSale(null)} 
        item={itemForSale} 
      />

      <ViewComprovanteModal 
        isOpen={!!viewComprovante} 
        onClose={() => setViewComprovante(null)} 
        comprovanteUrl={viewComprovante?.url}
        titulo={viewComprovante?.titulo}
        detalhe={viewComprovante?.detalhe}
      />
    </div>
  )
}
