import React, { useState } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { Upload, X, DollarSign, CheckCircle2, User, Clock, Calendar } from 'lucide-react'

export default function VenderBazarItemModal({ isOpen, onClose, item }) {
  const { venderBazarItem } = useFinance()

  const now = new Date()
  const defaultDataHora = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  const [valorVenda, setValorVenda] = useState(item?.precoAvaliado || '')
  const [vendedorBalcao, setVendedorBalcao] = useState('')
  const [comprador, setComprador] = useState('')
  const [dataHoraVenda, setDataHoraVenda] = useState(defaultDataHora)
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
    const valorFinal = parseFloat(valorVenda) || item.precoAvaliado
    if (valorFinal <= 0) return

    venderBazarItem(
      item.id, 
      valorFinal, 
      comprador || 'Comprador não informado', 
      comprovanteUrl,
      vendedorBalcao || 'Atendimento Balcão Bazar',
      dataHoraVenda || defaultDataHora
    )

    setValorVenda('')
    setVendedorBalcao('')
    setComprador('')
    setDataHoraVenda(defaultDataHora)
    setComprovanteUrl('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Venda Datada do Bazar: ${item.nome}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Item Info Box */}
        <div className="p-3 bg-secondary/50 rounded-xl text-xs space-y-1">
          <p className="text-foreground font-semibold">Objeto: {item.nome}</p>
          <p className="text-muted-foreground">Doador: <strong className="text-foreground">{item.doador || 'Anônimo'}</strong> | Categoria: <strong>{item.categoria}</strong></p>
          <p className="text-muted-foreground">Valor Avaliado na Curadoria: <strong className="text-emerald-500">R$ {item.precoAvaliado.toFixed(2)}</strong></p>
        </div>

        {/* Valor de Venda */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Valor Final de Venda (R$) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder={item.precoAvaliado ? item.precoAvaliado.toFixed(2) : "0.00"}
            required
            value={valorVenda}
            onChange={(e) => setValorVenda(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Vendedor no Balcão & Comprador */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Vendedor no Balcão / Voluntário *
            </label>
            <input
              type="text"
              placeholder="Ex: Ana Clara (Comissão Bazar)"
              required
              value={vendedorBalcao}
              onChange={(e) => setVendedorBalcao(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Nome do Comprador (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Gabriel M. (Calouro BI)"
              value={comprador}
              onChange={(e) => setComprador(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Data e Horário da Venda */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Data e Horário Exato da Venda *
          </label>
          <input
            type="text"
            placeholder="Ex: 03/09/2026 23:00"
            required
            value={dataHoraVenda}
            onChange={(e) => setDataHoraVenda(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Comprovante PIX Upload */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Comprovante de Pagamento / PIX
          </label>

          {comprovanteUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-emerald-500/10 p-2 flex items-center gap-3">
              <img src={comprovanteUrl} alt="Comprovante" className="w-16 h-16 object-cover rounded-xl border border-emerald-500/20" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-emerald-400 block truncate flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Comprovante Anexado
                </span>
                <span className="text-[10px] text-muted-foreground block">Salvo com registro de vendedor e data/hora</span>
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
              <span>Anexar foto ou comprovante do PIX</span>
              <input type="file" accept="image/*" onChange={handleComprovanteUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Action Buttons */}
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
            className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <DollarSign className="w-4 h-4" />
            Confirmar Venda Datada
          </button>
        </div>
      </form>
    </Modal>
  )
}
