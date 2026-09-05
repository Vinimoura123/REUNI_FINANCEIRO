import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { COMISSOES } from '../constants/comissoes'

export default function AddInventarioItemModal({ isOpen, onClose, itemToEdit = null }) {
  const { addInventarioItem, updateInventarioItem } = useFinance()

  const [formData, setFormData] = useState({
    item: '',
    comissao: COMISSOES[0],
    quantidade: '1',
    unidade: 'unidades',
    estadoConservacao: 'Excelente (Pronto)',
    localArmazenamento: '',
    responsavelGuarda: '',
    valorEstimadoEconomizado: '0',
    status: 'Disponível para Uso',
    observacoes: ''
  })

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        item: itemToEdit.item || '',
        comissao: itemToEdit.comissao || COMISSOES[0],
        quantidade: itemToEdit.quantidade !== undefined ? String(itemToEdit.quantidade) : '1',
        unidade: itemToEdit.unidade || 'unidades',
        estadoConservacao: itemToEdit.estadoConservacao || 'Excelente (Pronto)',
        localArmazenamento: itemToEdit.localArmazenamento || '',
        responsavelGuarda: itemToEdit.responsavelGuarda || '',
        valorEstimadoEconomizado: itemToEdit.valorEstimadoEconomizado !== undefined ? String(itemToEdit.valorEstimadoEconomizado) : '0',
        status: itemToEdit.status || 'Disponível para Uso',
        observacoes: itemToEdit.observacoes || ''
      })
    } else {
      setFormData({
        item: '',
        comissao: COMISSOES[0],
        quantidade: '1',
        unidade: 'unidades',
        estadoConservacao: 'Excelente (Pronto)',
        localArmazenamento: '',
        responsavelGuarda: '',
        valorEstimadoEconomizado: '0',
        status: 'Disponível para Uso',
        observacoes: ''
      })
    }
  }, [itemToEdit, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.item) return

    const payload = {
      ...formData,
      quantidade: parseInt(formData.quantidade, 10) || 1,
      valorEstimadoEconomizado: parseFloat(formData.valorEstimadoEconomizado) || 0
    }

    if (itemToEdit) {
      updateInventarioItem(itemToEdit.id, payload)
    } else {
      addInventarioItem(payload)
    }

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={itemToEdit ? "Editar Item do Inventário" : "Cadastrar Item no Inventário (Acervo Existent)"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Nome do Material / Equipamento *
          </label>
          <input 
            type="text" 
            placeholder="Ex: Banners de Sinalização, Porta Crachás, Caixas Térmicas..."
            required
            value={formData.item}
            onChange={(e) => setFormData({ ...formData, item: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Comissão Responsável *
            </label>
            <select 
              value={formData.comissao}
              onChange={(e) => setFormData({ ...formData, comissao: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              {COMISSOES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Estado de Conservação *
            </label>
            <select 
              value={formData.estadoConservacao}
              onChange={(e) => setFormData({ ...formData, estadoConservacao: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Excelente (Pronto)">Excelente (Pronto p/ Uso)</option>
              <option value="Bom Estado">Bom Estado</option>
              <option value="Necessita Reparo">Necessita de Reparo</option>
              <option value="Desgastado">Desgastado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Quantidade *
            </label>
            <input 
              type="number" 
              min="1"
              required
              value={formData.quantidade}
              onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Unidade de Medida
            </label>
            <input 
              type="text" 
              placeholder="Ex: unidades, caixas, metros, pacotes"
              value={formData.unidade}
              onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Local de Armazenamento
            </label>
            <input 
              type="text" 
              placeholder="Ex: Armário do CA, Sala da Diretoria, Caixa 02..."
              value={formData.localArmazenamento}
              onChange={(e) => setFormData({ ...formData, localArmazenamento: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Responsável pela Guarda
            </label>
            <input 
              type="text" 
              placeholder="Ex: Vinícius (Secretaria Geral)"
              value={formData.responsavelGuarda}
              onChange={(e) => setFormData({ ...formData, responsavelGuarda: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Economia Estimada (R$)
            </label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              placeholder="0,00 (Valor poupado ao reusar)"
              value={formData.valorEstimadoEconomizado}
              onChange={(e) => setFormData({ ...formData, valorEstimadoEconomizado: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Status Operacional
            </label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Disponível para Uso">Disponível para Uso</option>
              <option value="Em Manutenção">Em Manutenção / Reparo</option>
              <option value="Empréstimo Temporário">Empréstimo Temporário</option>
              <option value="Reservado Evento">Reservado para o Evento</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Observações / Detalhes do Acervo (Opcional)
          </label>
          <textarea
            rows="3"
            placeholder="Detalhes adicionais sobre o estado, instruções de uso ou origem do material..."
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-opacity shadow-sm"
          >
            {itemToEdit ? "Salvar Alterações" : "Cadastrar no Inventário"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
