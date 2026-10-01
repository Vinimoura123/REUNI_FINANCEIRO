import React, { useEffect } from 'react'
import { X, FileText, AlertCircle, Clock, CheckCircle, DollarSign, Tag } from 'lucide-react'

export default function DetalhamentoModal({ isOpen, onClose, demanda }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !demanda) return null

  const isSemCusto = demanda.semCusto || Number(demanda.custo) === 0
  const rotuloCusto = isSemCusto ? (demanda.tipoSemCusto || 'A Definir / Sob Cotação') : `R$ ${Number(demanda.custo).toFixed(2)}`

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[440px] aspect-square rounded-[32px] bg-card/95 dark:bg-[#181614]/95 border border-border/80 dark:border-white/10 shadow-2xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden glass-panel animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo / Header */}
        <div className="flex items-start justify-between gap-3 shrink-0 pb-3 border-b border-border/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                {demanda.comissao || 'Subcomissão'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary/90 text-foreground border border-border/80">
                Qtd: {demanda.quantidade !== undefined && demanda.quantidade !== null ? demanda.quantidade : 1}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                demanda.status === 'Pago' 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                  : demanda.status === 'Aprovado' 
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                  : 'bg-secondary text-muted-foreground border-border'
              }`}>
                {demanda.status || 'Pendente'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-foreground truncate" title={demanda.item}>
              {demanda.item}
            </h3>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors shrink-0"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo / Detalhamento com Scrollbar elegante */}
        <div className="flex-1 my-3 flex flex-col min-h-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 shrink-0">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Detalhamento & Especificações</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1.5 bg-secondary/30 dark:bg-black/25 border border-border/50 rounded-2xl p-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap select-text">
            {demanda.detalhamento && demanda.detalhamento.trim() ? (
              demanda.detalhamento
            ) : (
              <span className="text-muted-foreground italic text-xs">
                Nenhum detalhamento ou especificação técnica adicional cadastrado para este item.
              </span>
            )}
          </div>
        </div>

        {/* Rodapé com Atributos */}
        <div className="pt-3 border-t border-border/50 shrink-0 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Custo */}
            <span className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 ${
              isSemCusto 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            }`}>
              <DollarSign className="w-3.5 h-3.5" />
              <span>{rotuloCusto}</span>
            </span>

            {/* Prioridade */}
            <span className={`px-2.5 py-1 rounded-xl font-semibold border ${
              demanda.prioridade === 'Inegociável'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                : demanda.prioridade === 'Adaptável'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
            }`}>
              {demanda.prioridade}
            </span>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-semibold text-xs bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
