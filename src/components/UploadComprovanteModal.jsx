import React, { useState } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { Upload, X, CheckCircle2, FileText, Loader2, HardDrive } from 'lucide-react'
import { COMISSOES } from '../constants/comissoes'

const CATEGORIAS_COMPROVANTE = [
  'Rifa',
  'Bazar',
  'Doação',
  'Parceria',
  ...COMISSOES
]

export default function UploadComprovanteModal({ isOpen, onClose }) {
  const { transacoes, addTransacao, attachComprovanteToTransacao, uploadDocument } = useFinance()

  const [modo, setModo] = useState('existente') // 'existente' | 'novo'
  const [transacaoId, setTransacaoId] = useState('')
  
  // Novo Lançamento com comprovante
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('Entrada')
  const [categoria, setCategoria] = useState('Rifa')
  
  const [comprovanteUrl, setComprovanteUrl] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setNomeArquivo(file.name)

    try {
      // Se for imagem, podemos otimizar ou subir direto; para PDF/outros enviamos direto
      const result = await uploadDocument(file)
      if (result && result.url) {
        setComprovanteUrl(result.url)
      }
    } catch (err) {
      alert(`Erro ao fazer upload do documento: ${err.message}`)
      setComprovanteUrl('')
    } finally {
      setIsUploading(false)
    }
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
    setNomeArquivo('')

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Central de Uploads: Anexar Comprovante / Nota Fiscal">
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
                  {CATEGORIAS_COMPROVANTE.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Upload Box */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Selecione o Comprovante (PDF / Imagem / Print PIX / Nota Fiscal) *
          </label>

          {isUploading ? (
            <div className="p-6 border-2 border-dashed border-primary/50 rounded-2xl bg-primary/5 flex flex-col items-center justify-center gap-2 text-xs text-primary font-semibold">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span>Enviando documento para o servidor...</span>
            </div>
          ) : comprovanteUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-emerald-400 block truncate flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{nomeArquivo || 'Comprovante Anexado'}</span>
                </span>
                <span className="text-[10px] text-muted-foreground block flex items-center gap-1 mt-0.5">
                  <HardDrive className="w-3 h-3 text-emerald-500" />
                  Salvo no Repositório do Servidor
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setComprovanteUrl('')
                  setNomeArquivo('')
                }}
                className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-secondary transition-colors"
                title="Remover Comprovante"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-2xl bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all text-xs text-muted-foreground font-medium text-center">
              <Upload className="w-7 h-7 text-primary" />
              <span>Clique aqui ou arraste para enviar PDF, Foto ou Nota Fiscal</span>
              <span className="text-[10px] opacity-70">Suporta PDF, JPG, PNG, WEBP e Documentos anexados</span>
              <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
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
            disabled={!comprovanteUrl || isUploading}
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

