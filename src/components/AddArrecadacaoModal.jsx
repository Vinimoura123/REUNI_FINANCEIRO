import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'

export default function AddArrecadacaoModal({ isOpen, onClose, arrecadacaoToEdit = null }) {
  const { addArrecadacao, updateArrecadacao } = useFinance()
  
  const [formData, setFormData] = useState({
    tipo: 'Rifa',
    nome: '',
    meta: '',
    atual: '0',
    status: 'Ativo',
    observacao: ''
  })

  useEffect(() => {
    if (arrecadacaoToEdit) {
      setFormData({
        tipo: arrecadacaoToEdit.tipo || 'Rifa',
        nome: arrecadacaoToEdit.nome || '',
        meta: arrecadacaoToEdit.meta || '',
        atual: arrecadacaoToEdit.atual || '0',
        status: arrecadacaoToEdit.status || 'Ativo',
        observacao: arrecadacaoToEdit.observacao || ''
      })
    } else {
      setFormData({
        tipo: 'Rifa',
        nome: '',
        meta: '',
        atual: '0',
        status: 'Ativo',
        observacao: ''
      })
    }
  }, [arrecadacaoToEdit, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.nome || !formData.meta) return

    const payload = {
      ...formData,
      meta: parseFloat(formData.meta),
      atual: parseFloat(formData.atual) || 0
    }

    if (arrecadacaoToEdit) {
      updateArrecadacao(arrecadacaoToEdit.id, payload)
    } else {
      addArrecadacao(payload)
    }

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={arrecadacaoToEdit ? "Editar Ação de Arrecadação" : "Nova Ação de Arrecadação"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Captação (Capítulo 6.4)</label>
          <select 
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="Rifa">Rifa (Recomendado máx R$7/rifa)</option>
            <option value="Doação">Doação / Contribuição Solidária</option>
            <option value="Parceria">Parceria / Apoio Privado ou EJ</option>
            <option value="Edital">Edital Institucional UFBA/Extensão</option>
            <option value="Festa/Evento">Festa / Evento Beneficente</option>
            <option value="Outros">Outras Fontes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nome / Identificação da Ação</label>
          <input 
            type="text" 
            placeholder="Ex: Rifa de Kindle, Parceria Loja X..."
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Meta de Captação (R$)</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              placeholder="1000,00"
              required
              value={formData.meta}
              onChange={(e) => setFormData({ ...formData, meta: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Valor Já Arrecadado (R$)</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              placeholder="0,00"
              value={formData.atual}
              onChange={(e) => setFormData({ ...formData, atual: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Observações Estratégicas</label>
          <textarea 
            rows="2"
            placeholder="Ex: Prêmio doado por patrocinador, meta inicial..."
            value={formData.observacao}
            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none resize-none"
          ></textarea>
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
            Salvar Ação
          </button>
        </div>
      </form>
    </Modal>
  )
}
