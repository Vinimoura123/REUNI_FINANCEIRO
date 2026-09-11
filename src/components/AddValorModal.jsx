import React, { useState } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { withAccessToken } from '../lib/auth'
import { Upload, X, CheckCircle2, User, Hash, Ticket, Calendar, Clock } from 'lucide-react'

export default function AddValorModal({ isOpen, onClose, item }) {
  const { updateArrecadacaoValor } = useFinance()

  const now = new Date()
  const defaultDataHora = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  const [valor, setValor] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [qtdBilhetes, setQtdBilhetes] = useState('')
  const [numerosBilhetes, setNumerosBilhetes] = useState('')
  const [comprador, setComprador] = useState('')
  const [dataHora, setDataHora] = useState(defaultDataHora)
  const [comprovanteUrl, setComprovanteUrl] = useState('')

  if (!item) return null

  const handleComprovanteUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 800
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75)
        setComprovanteUrl(compressedBase64)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!valor || parseFloat(valor) <= 0) return

    const dadosVenda = {
      vendedor: vendedor || 'Venda Direta / Balcão',
      qtdBilhetes: qtdBilhetes || '1',
      numerosBilhetes: numerosBilhetes || 'S/N',
      comprador: comprador || 'Não informado',
      dataHora: dataHora || defaultDataHora
    }

    const descricaoCalculada = `Venda ${item.nome} - ${dadosVenda.vendedor}`

    updateArrecadacaoValor(
      item.id, 
      parseFloat(valor), 
      descricaoCalculada,
      comprovanteUrl,
      dadosVenda
    )

    // Reset
    setValor('')
    setVendedor('')
    setQtdBilhetes('')
    setNumerosBilhetes('')
    setComprador('')
    setDataHora(defaultDataHora)
    setComprovanteUrl('')

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Venda Datada: ${item.nome}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Box */}
        <div className="p-3 bg-secondary/50 rounded-xl text-xs space-y-1">
          <p className="text-muted-foreground">Meta Total: <strong className="text-foreground">R$ {item.meta.toFixed(2)}</strong></p>
          <p className="text-muted-foreground">Arrecadado até agora: <strong className="text-foreground">R$ {item.atual.toFixed(2)}</strong></p>
          <p className="text-muted-foreground">Restante: <strong className="text-emerald-500">R$ {Math.max(0, item.meta - item.atual).toFixed(2)}</strong></p>
        </div>

        {/* Valor & Quantidade de Bilhetes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Valor Total da Venda (R$) *
            </label>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              placeholder="Ex: 35.00 (5 bilhetes a R$ 7)"
              required
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Qtd de Bilhetes Vendidos *
            </label>
            <input 
              type="number" 
              min="1"
              placeholder="Ex: 5"
              required
              value={qtdBilhetes}
              onChange={(e) => setQtdBilhetes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Vendedor & Números dos Bilhetes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Nome do Vendedor / Membro *
            </label>
            <input 
              type="text" 
              placeholder="Ex: Marcos Silva (Finanças)"
              required
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Números dos Bilhetes (Nº / Sequência)
            </label>
            <input 
              type="text" 
              placeholder="Ex: 001 a 005 / Nº 42"
              value={numerosBilhetes}
              onChange={(e) => setNumerosBilhetes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Comprador & Data/Hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Nome do Comprador (Opcional)
            </label>
            <input 
              type="text" 
              placeholder="Ex: Prof. Ricardo / Calouro BI"
              value={comprador}
              onChange={(e) => setComprador(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Data e Horário da Venda *
            </label>
            <input 
              type="text" 
              placeholder="Ex: 03/09/2026 23:00"
              required
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Upload do Comprovante PIX */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Comprovante PIX / Recibo (Opcional)
          </label>

          {comprovanteUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-emerald-500/10 p-2 flex items-center gap-3">
              <img src={withAccessToken(comprovanteUrl)} alt="Comprovante Rifa" className="w-14 h-14 object-cover rounded-xl border border-emerald-500/20" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-emerald-400 block truncate flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Comprovante PIX Anexado
                </span>
                <span className="text-[10px] text-muted-foreground block">Salvo com registro de vendedor e data</span>
              </div>
              <button
                type="button"
                onClick={() => setComprovanteUrl('')}
                className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-secondary transition-colors"
                title="Remover Comprovante"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-3.5 border border-dashed border-border rounded-2xl bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all text-xs text-muted-foreground font-medium">
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>Anexar foto ou print do comprovante do PIX</span>
              <input type="file" accept="image/*" onChange={handleComprovanteUpload} className="hidden" />
            </label>
          )}
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
            className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
          >
            Confirmar Venda Datada
          </button>
        </div>
      </form>
    </Modal>
  )
}
