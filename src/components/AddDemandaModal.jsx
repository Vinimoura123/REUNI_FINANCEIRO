import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'

export default function AddDemandaModal({ isOpen, onClose, demandaToEdit = null }) {
  const { addDemanda, updateDemanda } = useFinance()
  
  const [formData, setFormData] = useState({
    comissao: 'Comunicação',
    item: '',
    custo: '',
    prioridade: 'Inegociável',
    status: 'Pendente',
    prazoData: '',
    prazoHora: ''
  })

  useEffect(() => {
    if (demandaToEdit) {
      setFormData({
        comissao: demandaToEdit.comissao || 'Comunicação',
        item: demandaToEdit.item || '',
        custo: demandaToEdit.custo || '',
        prioridade: demandaToEdit.prioridade || 'Inegociável',
        status: demandaToEdit.status || 'Pendente',
        prazoData: demandaToEdit.prazoData || '',
        prazoHora: demandaToEdit.prazoHora || ''
      })
    } else {
      setFormData({
        comissao: 'Comunicação',
        item: '',
        custo: '',
        prioridade: 'Inegociável',
        status: 'Pendente',
        prazoData: '',
        prazoHora: ''
      })
    }
  }, [demandaToEdit, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.item || !formData.custo) return

    const payload = {
      ...formData,
      custo: parseFloat(formData.custo)
    }

    if (demandaToEdit) {
      updateDemanda(demandaToEdit.id, payload)
    } else {
      addDemanda(payload)
    }

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={demandaToEdit ? "Editar Demanda de Comissão" : "Cadastrar Nova Demanda de Comissão"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Subcomissão Responsável</label>
          <select 
            value={formData.comissao}
            onChange={(e) => setFormData({ ...formData, comissao: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="Comunicação">Comunicação</option>
            <option value="Estrutura">Estrutura</option>
            <option value="Programação">Programação</option>
            <option value="Recreação">Recreação</option>
            <option value="Alimentação">Alimentação</option>
            <option value="Acolhimento">Acolhimento</option>
            <option value="Geral/Coordenação">Geral / Coordenação</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descrição do Item / Gasto</label>
          <input 
            type="text" 
            placeholder="Ex: Impressão de crachás, Aluguel de gerador..."
            required
            value={formData.item}
            onChange={(e) => setFormData({ ...formData, item: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Custo Estimado (R$)</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              placeholder="0,00"
              required
              value={formData.custo}
              onChange={(e) => setFormData({ ...formData, custo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nível de Prioridade</label>
            <select 
              value={formData.prioridade}
              onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Inegociável">Inegociável (Essencial)</option>
              <option value="Adaptável">Adaptável (Secundário)</option>
              <option value="Desejável">Desejável (Se houver folga)</option>
            </select>
          </div>
        </div>

        {/* Prazo e Horário Limite (Opcionais) */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/30 rounded-xl border border-border">
          <div>
            <label className="block text-xs font-semibold mb-1 text-muted-foreground uppercase">
              📅 Prazo Limite (Opcional)
            </label>
            <input 
              type="date"
              value={formData.prazoData}
              onChange={(e) => setFormData({ ...formData, prazoData: e.target.value })}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-muted-foreground uppercase">
              ⏰ Horário Limite
            </label>
            <input 
              type="time"
              value={formData.prazoHora}
              onChange={(e) => setFormData({ ...formData, prazoHora: e.target.value })}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status Inicial</label>
          <select 
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Pago">Pago (Lança no Caixa)</option>
          </select>
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
            Salvar Demanda
          </button>
        </div>
      </form>
    </Modal>
  )
}
