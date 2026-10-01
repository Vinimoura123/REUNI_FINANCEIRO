import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { COMISSOES } from '../constants/comissoes'
import { DollarSign, FileText, HelpCircle, Check } from 'lucide-react'

const OPCOES_SEM_CUSTO = [
  'A Definir (Sob Cotação)',
  'Sem Rendimento / Sem Custo',
  'Voluntário / Parceria / Doação',
  'Aguardando Orçamento',
  'Outro (Personalizado)'
]

export default function AddDemandaModal({ isOpen, onClose, demandaToEdit = null }) {
  const { addDemanda, updateDemanda } = useFinance()
  
  const [formData, setFormData] = useState({
    comissao: COMISSOES[0],
    item: '',
    detalhamento: '',
    semCusto: false,
    tipoSemCusto: OPCOES_SEM_CUSTO[0],
    custoPersonalizado: '',
    custo: '',
    prioridade: 'Inegociável',
    status: 'Pendente',
    prazoData: '',
    prazoHora: ''
  })

  useEffect(() => {
    if (demandaToEdit) {
      const isSemCusto = Boolean(demandaToEdit.semCusto || (Number(demandaToEdit.custo) === 0 && demandaToEdit.tipoSemCusto))
      const isCustom = isSemCusto && demandaToEdit.tipoSemCusto && !OPCOES_SEM_CUSTO.slice(0, 4).includes(demandaToEdit.tipoSemCusto)
      
      setFormData({
        comissao: demandaToEdit.comissao || COMISSOES[0],
        item: demandaToEdit.item || '',
        detalhamento: demandaToEdit.detalhamento || '',
        semCusto: isSemCusto,
        tipoSemCusto: isCustom ? 'Outro (Personalizado)' : (demandaToEdit.tipoSemCusto || OPCOES_SEM_CUSTO[0]),
        custoPersonalizado: isCustom ? demandaToEdit.tipoSemCusto : '',
        custo: demandaToEdit.custo !== undefined && !isSemCusto ? demandaToEdit.custo : '',
        prioridade: demandaToEdit.prioridade || 'Inegociável',
        status: demandaToEdit.status || 'Pendente',
        prazoData: demandaToEdit.prazoData || '',
        prazoHora: demandaToEdit.prazoHora || ''
      })
    } else {
      setFormData({
        comissao: COMISSOES[0],
        item: '',
        detalhamento: '',
        semCusto: false,
        tipoSemCusto: OPCOES_SEM_CUSTO[0],
        custoPersonalizado: '',
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
    if (!formData.item.trim()) return
    if (!formData.semCusto && (formData.custo === '' || isNaN(formData.custo))) return

    const rotuloFinalSemCusto = formData.tipoSemCusto === 'Outro (Personalizado)'
      ? (formData.custoPersonalizado.trim() || 'A Definir')
      : formData.tipoSemCusto

    const payload = {
      ...formData,
      item: formData.item.trim(),
      detalhamento: formData.detalhamento.trim(),
      semCusto: formData.semCusto,
      tipoSemCusto: formData.semCusto ? rotuloFinalSemCusto : '',
      custo: formData.semCusto ? 0 : parseFloat(formData.custo)
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
        {/* Subcomissão */}
        <div>
          <label className="block text-sm font-medium mb-1">Subcomissão Responsável *</label>
          <select 
            value={formData.comissao}
            onChange={(e) => setFormData({ ...formData, comissao: e.target.value })}
            className="w-full px-3 py-2 border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            {COMISSOES.map((comissao) => (
              <option key={comissao} value={comissao}>
                {comissao}
              </option>
            ))}
          </select>
        </div>

        {/* Nome do Item */}
        <div>
          <label className="block text-sm font-medium mb-1">Nome do Item / Necessidade *</label>
          <input 
            type="text" 
            placeholder="Ex: Impressão de crachás, Aluguel de gerador, Kit primeiros socorros..."
            required
            value={formData.item}
            onChange={(e) => setFormData({ ...formData, item: e.target.value })}
            className="w-full px-3 py-2 border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Detalhamento Separado */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Detalhamento & Especificações Técnicas</label>
            <span className="text-[11px] text-muted-foreground font-normal">Disponível em pop-up na tabela</span>
          </div>
          <textarea 
            rows="3"
            placeholder="Descreva detalhes, quantidades, fornecedor pretendido, especificações técnicas, justificativa ou observações..."
            value={formData.detalhamento}
            onChange={(e) => setFormData({ ...formData, detalhamento: e.target.value })}
            className="w-full px-3 py-2 text-sm border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Seção de Custo / Opção Sem Custo */}
        <div className="p-3.5 bg-secondary/30 rounded-2xl border border-border/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span>Orçamento / Custo Estimado</span>
            </label>

            {/* Alternador / Checkbox para Item Sem Custo */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground">
              <input 
                type="checkbox"
                checked={formData.semCusto}
                onChange={(e) => setFormData({ ...formData, semCusto: e.target.checked })}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary focus:ring-offset-0 cursor-pointer"
              />
              <span className={formData.semCusto ? "text-amber-500 font-bold" : "text-muted-foreground"}>
                Sem valor fixo / Sem rendimento / A orçar
              </span>
            </label>
          </div>

          {!formData.semCusto ? (
            /* Input Custo Normal */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Valor Previsto (R$) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  required={!formData.semCusto}
                  value={formData.custo}
                  onChange={(e) => setFormData({ ...formData, custo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-background text-foreground font-semibold focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Informe o valor monetário estimado para compor o total das demandas da comissão.
              </p>
            </div>
          ) : (
            /* Opções Alternativas quando Não Tem Custo Definido */
            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
              <label className="block text-xs font-medium text-muted-foreground">
                Classificação da Demanda sem Valor Fixo:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select 
                  value={formData.tipoSemCusto}
                  onChange={(e) => setFormData({ ...formData, tipoSemCusto: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-background text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
                >
                  {OPCOES_SEM_CUSTO.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>

                {formData.tipoSemCusto === 'Outro (Personalizado)' && (
                  <input 
                    type="text"
                    placeholder="Digite a condição (ex: Patrocínio pendente)"
                    required
                    value={formData.custoPersonalizado}
                    onChange={(e) => setFormData({ ...formData, custoPersonalizado: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  />
                )}
              </div>
              <p className="text-[11px] text-amber-500/90 font-medium">
                💡 Este item será registrado com valor R$ 0,00 e exibirá o selo correspondente na tabela, sem distorcer o saldo financeiro.
              </p>
            </div>
          )}
        </div>

        {/* Prioridade e Prazos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nível de Prioridade</label>
            <select 
              value={formData.prioridade}
              onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Inegociável">Inegociável (Essencial)</option>
              <option value="Adaptável">Adaptável (Secundário)</option>
              <option value="Desejável">Desejável (Se houver folga)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status da Demanda</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Pendente">Pendente</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Pago">Pago (Lança no Caixa)</option>
            </select>
          </div>
        </div>

        {/* Prazo e Horário Limite (Opcionais) */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/20 rounded-xl border border-border">
          <div>
            <label className="block text-xs font-semibold mb-1 text-muted-foreground uppercase">
              📅 Prazo Limite (Opcional)
            </label>
            <input 
              type="date"
              value={formData.prazoData}
              onChange={(e) => setFormData({ ...formData, prazoData: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
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
              className="w-full px-3 py-1.5 text-xs border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-opacity shadow-sm"
          >
            Salvar Demanda
          </button>
        </div>
      </form>
    </Modal>
  )
}
