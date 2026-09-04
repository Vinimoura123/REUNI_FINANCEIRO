import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'

export default function AddTransacaoModal({ isOpen, onClose, transacaoToEdit = null }) {
  const { addTransacao, updateTransacao } = useFinance()

  const [formData, setFormData] = useState({
    descricao: '',
    tipo: 'Entrada',
    valor: '',
    categoria: 'Geral',
    data: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (transacaoToEdit) {
      setFormData({
        descricao: transacaoToEdit.descricao || '',
        tipo: transacaoToEdit.tipo || 'Entrada',
        valor: transacaoToEdit.valor || '',
        categoria: transacaoToEdit.categoria || 'Geral',
        data: transacaoToEdit.data || new Date().toISOString().split('T')[0]
      })
    } else {
      setFormData({
        descricao: '',
        tipo: 'Entrada',
        valor: '',
        categoria: 'Geral',
        data: new Date().toISOString().split('T')[0]
      })
    }
  }, [transacaoToEdit, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.descricao || !formData.valor) return

    const payload = {
      ...formData,
      valor: parseFloat(formData.valor)
    }

    if (transacaoToEdit) {
      updateTransacao(transacaoToEdit.id, payload)
    } else {
      addTransacao(payload)
    }

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={transacaoToEdit ? "Editar Lançamento no Caixa" : "Registrar Lançamento no Caixa"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Movimentação</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'Entrada' })}
              className={`py-2 px-4 rounded-lg border text-sm font-semibold transition-all ${
                formData.tipo === 'Entrada'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-background text-foreground border-border hover:bg-secondary'
              }`}
            >
              + Entrada (Receita)
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'Saída' })}
              className={`py-2 px-4 rounded-lg border text-sm font-semibold transition-all ${
                formData.tipo === 'Saída'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-background text-foreground border-border hover:bg-secondary'
              }`}
            >
              - Saída (Despesa)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descrição do Lançamento</label>
          <input 
            type="text" 
            placeholder="Ex: Venda de rifa presencial, Pagamento gráfico..."
            required
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              placeholder="0,00"
              required
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <select 
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Geral">Geral</option>
              <option value="Rifa">Rifa</option>
              <option value="Doação">Doação</option>
              <option value="Parceria">Parceria</option>
              <option value="Comunicação">Comunicação</option>
              <option value="Estrutura">Estrutura</option>
              <option value="Recreação">Recreação</option>
              <option value="Programação">Programação</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input 
            type="date" 
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
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
            type="submit"
            className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition-opacity"
          >
            Confirmar Lançamento
          </button>
        </div>
      </form>
    </Modal>
  )
}
