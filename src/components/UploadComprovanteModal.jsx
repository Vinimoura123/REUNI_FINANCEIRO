import React, { useState } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { Upload, X, CheckCircle2, FileText, Plus } from 'lucide-react'

export default function UploadComprovanteModal({ isOpen, onClose }) {
  const { transacoes, addTransacao, attachComprovanteToTransacao } = useFinance()

  const [modo, setModo] = useState('existente') // 'existente' | 'novo'
  const [transacaoId, setTransacaoId] = useState('')
  
  // Novo Lançamento com comprovante
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('Entrada')
  const [categoria, setCategoria] = useState('Rifa')
  
  const [comprovanteUrl, setComprovanteUrl] = useState('')

  const handleImageUpload = (e) => {
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
    if (!comprovanteUrl) return

    if (modo === 'existente') {
      if (!transacaoId) return
      attachComprovanteToTransacao(transacaoId, comprovanteUrl)
    } else {
      if (!descricao || !valor) return
      addTransacao({
        descricao,
        valor: parseFloat(valor),
        tipo,
        categoria,
        comprovanteUrl
      })
    }

    // Reset
    setModo('existente')
    setTransacaoId('')
    setDescricao('')
    setValor('')
    setTipo('Entrada')
    setCategoria('Rifa')
    setComprovanteUrl('')

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Central de Uploads: Anexar Comprovante">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Mode */}
        <div className="grid grid-cols-2 p-1 bg-secondary/60 rounded-xl gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setModo('existente')}
            className={`py-2 rounded-lg transition-all ${
              modo === 'existente' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Vincular a Lançamento Existente
          </button>
          <button
            type="button"
            onClick={() => setModo('novo')}
            className={`py-2 rounded-lg transition-all ${
              modo === 'novo' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Novo Lançamento com Anexo
          </button>
        </div>

        {modo === 'existente' ? (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Selecione o Lançamento do Caixa *
            </label>
            <select
              value={transacaoId}
              onChange={(e) => setTransacaoId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">-- Escolha a movimentação --</option>
              {transacoes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.data} - {t.tipo === 'Entrada' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)} | {t.descricao} ({t.categoria})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Descrição da Venda / Despesa *
              </label>
              <input
                type="text"
                placeholder="Ex: Venda de Rifa Kindle PIX / Compra de Banners"
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Tipo *
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="Entrada">Entrada (Receita)</option>
                  <option value="Saída">Saída (Despesa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Categoria *
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="Rifa">Rifa</option>
                  <option value="Bazar">Bazar</option>
                  <option value="Doação">Doação</option>
                  <option value="Parceria">Parceria</option>
                  <option value="Comunicação">Comunicação</option>
                  <option value="Estrutura">Estrutura</option>
                  <option value="Recreação">Recreação</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Upload Box */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Selecione o Comprovante (Imagem / Print PIX / Recibo) *
          </label>

          {comprovanteUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3">
              <img src={comprovanteUrl} alt="Comprovante" className="w-20 h-20 object-cover rounded-xl border border-emerald-500/20" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-emerald-400 block truncate flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Comprovante Carregado
                </span>
                <span className="text-[10px] text-muted-foreground block">Pronto para salvar no histórico</span>
              </div>
              <button
                type="button"
                onClick={() => setComprovanteUrl('')}
                className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-secondary transition-colors"
                title="Remover Comprovante"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-2xl bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all text-xs text-muted-foreground font-medium text-center">
              <Upload className="w-7 h-7 text-primary" />
              <span>Clique aqui ou arraste para enviar foto ou print do PIX</span>
              <span className="text-[10px] opacity-70">Suporta JPG, PNG, WEBP e capturas de tela do celular</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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
            disabled={!comprovanteUrl}
            className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Salvar Comprovante
          </button>
        </div>
      </form>
    </Modal>
  )
}
