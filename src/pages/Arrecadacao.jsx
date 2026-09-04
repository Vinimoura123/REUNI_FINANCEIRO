import React, { useState } from 'react'
import { Plus, HandCoins, Trash2, CheckCircle2, TrendingUp, DollarSign, Info, Edit3 } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import AddArrecadacaoModal from '../components/AddArrecadacaoModal'
import AddValorModal from '../components/AddValorModal'

export default function Arrecadacao() {
  const { arrecadacoes, deleteArrecadacao } = useFinance()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [arrecadacaoToEdit, setArrecadacaoToEdit] = useState(null)
  const [selectedItemForValor, setSelectedItemForValor] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('Todos')

  const tiposUnicos = ['Todos', ...new Set(arrecadacoes.map(a => a.tipo))]

  const arrecadacoesFiltradas = arrecadacoes.filter(a => {
    return selectedFilter === 'Todos' || a.tipo === selectedFilter
  })

  const totalCaptação = arrecadacoes.reduce((sum, a) => sum + Number(a.atual), 0)
  const totalMeta = arrecadacoes.reduce((sum, a) => sum + Number(a.meta), 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Arrecadação Estratégica</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Captação de capital prévio: Rifas (máx R$7), Doações, Parcerias & Editais (Capítulo 6.4)
          </p>
        </div>
        <button 
          onClick={() => {
            setArrecadacaoToEdit(null)
            setIsAddModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-sm font-semibold transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Ação de Captação
        </button>
      </div>

      {/* Directives Banner from Chapter 6.4 */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 text-primary flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sm block mb-0.5">Regras de Ouro do Capítulo 6.4 da Bíblia REUNI:</span>
          • <strong>Rifas recomendadas:</strong> Kindle e Kit Calouro BI (maior apelo histórico).<br/>
          • <strong>Precificação ideal:</strong> Máximo de R$ 7,00 por bilhete (acima de R$ 10,00 reduz drasticamente a adesão).<br/>
          • <strong>Limite por ciclo:</strong> Preferencialmente até 3 rifas simultâneas para evitar esgotar o público.
        </div>
      </div>

      {/* Filter Tabs & Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {tiposUnicos.map(tipo => (
            <button
              key={tipo}
              onClick={() => setSelectedFilter(tipo)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedFilter === tipo
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
              }`}
            >
              {tipo === 'Todos' ? 'Todas as Frentes' : tipo}
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          Total Arrecadado nas Ações: <strong className="text-foreground text-sm">R$ {totalCaptação.toFixed(2)}</strong> / R$ {totalMeta.toFixed(2)}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {arrecadacoesFiltradas.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground text-sm border border-dashed rounded-2xl">
            Nenhuma ação de arrecadação cadastrada nesta categoria.
          </div>
        ) : (
          arrecadacoesFiltradas.map((item) => {
            const percent = item.meta > 0 ? Math.min(100, (item.atual / item.meta) * 100) : 0
            const isCompleted = item.atual >= item.meta || item.status === 'Concluído'

            return (
              <div 
                key={item.id} 
                className="p-6 rounded-2xl border border-border bg-card glass-panel flex flex-col justify-between hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Top Badge & Actions */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                      {item.tipo}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isCompleted
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {isCompleted ? 'Concluído' : item.status}
                      </span>
                      <button
                        onClick={() => {
                          setArrecadacaoToEdit(item)
                          setIsAddModalOpen(true)
                        }}
                        className="p-1 text-muted-foreground hover:text-primary rounded-lg transition-colors ml-1"
                        title="Editar Ação"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteArrecadacao(item.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                        title="Excluir Ação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-base text-foreground leading-snug">{item.nome}</h3>
                  {item.observacao && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {item.observacao}
                    </p>
                  )}
                </div>

                {/* Progress & Values */}
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-end text-xs">
                    <span className="text-muted-foreground font-medium">Arrecadado</span>
                    <span className="font-bold text-foreground">
                      R$ {Number(item.atual).toFixed(2)} <span className="text-muted-foreground font-normal">/ R$ {Number(item.meta).toFixed(2)}</span>
                    </span>
                  </div>

                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden p-0.5 border border-border/40">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-green-500' : 'bg-primary'
                      }`} 
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setSelectedItemForValor(item)}
                    className="w-full py-2 px-3 mt-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-border/50"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-green-500" />
                    + Registrar Entrada (PIX / Venda)
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modals */}
      <AddArrecadacaoModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false)
          setArrecadacaoToEdit(null)
        }} 
        arrecadacaoToEdit={arrecadacaoToEdit}
      />
      <AddValorModal 
        isOpen={!!selectedItemForValor} 
        onClose={() => setSelectedItemForValor(null)} 
        item={selectedItemForValor} 
      />
    </div>
  )
}
