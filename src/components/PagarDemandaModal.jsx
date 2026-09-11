import React, { useState } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { Upload, CheckCircle2 } from 'lucide-react'

// Passo intermediário entre "marcar como Pago" e o gate real — deixa
// anexar um comprovante opcional, que o servidor manda pro
// extrator-comprovante (Gemini) automaticamente antes de avaliar.
export default function PagarDemandaModal({ isOpen, onClose, demanda }) {
  const { pagarDemanda } = useFinance()
  const [arquivo, setArquivo] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (!demanda) return null

  const handleConfirmar = () => {
    setEnviando(true)
    pagarDemanda(demanda.id, arquivo)
    setArquivo(null)
    setEnviando(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Marcar como Pago: ${demanda.item}`}>
      <div className="space-y-4">
        <div className="p-3 bg-secondary/50 rounded-xl text-xs text-muted-foreground">
          Custo lançado: <strong className="text-foreground">R$ {Number(demanda.custo).toFixed(2)}</strong> ({demanda.comissao})
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Comprovante (opcional)</label>
          <p className="text-xs text-muted-foreground mb-2">
            Se anexar, o valor do comprovante é conferido automaticamente contra o custo lançado antes de aprovar o lançamento. Sem comprovante, vai direto para revisão humana.
          </p>
          {arquivo ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{arquivo.name}</span>
              <button type="button" onClick={() => setArquivo(null)} className="ml-auto text-muted-foreground hover:text-foreground">Remover</button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors text-xs text-muted-foreground">
              <Upload className="w-4 h-4" />
              Escolher arquivo (foto/print do comprovante)
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={enviando}
            className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-lg transition-opacity"
          >
            {enviando ? 'Processando...' : arquivo ? 'Confirmar com comprovante' : 'Confirmar sem comprovante'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
