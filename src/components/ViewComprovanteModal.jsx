import React, { useState } from 'react'
import Modal from './Modal'
import { FileText, Download, CheckCircle2, Trash2 } from 'lucide-react'
import { withAccessToken } from '../lib/auth'
import { useFinance } from '../context/FinanceContext'

// colecao/recordId são opcionais — só quando informados o botão de
// excluir aparece (precisa saber qual registro tem esse comprovanteUrl
// pra limpar o campo depois de apagar o arquivo).
export default function ViewComprovanteModal({ isOpen, onClose, comprovanteUrl, titulo, detalhe, colecao, recordId }) {
  const { deleteDocument, updateTransacao, updateBazarItem, updateDemanda } = useFinance()
  const [excluindo, setExcluindo] = useState(false)

  if (!comprovanteUrl) return null

  const ehImagemOuArquivoServido =
    comprovanteUrl.startsWith('data:image') ||
    comprovanteUrl.startsWith('http') ||
    comprovanteUrl.startsWith('blob:') ||
    comprovanteUrl.startsWith('/api/documents/')

  const handleExcluir = async () => {
    if (!colecao || !recordId) return
    if (!confirm('Excluir este comprovante? Essa ação não pode ser desfeita.')) return

    setExcluindo(true)
    await deleteDocument(comprovanteUrl) // no-op se for data: URI (nada pra apagar no servidor)

    const atualizarCampo = { comprovanteUrl: '' }
    if (colecao === 'transacoes') updateTransacao(recordId, atualizarCampo)
    else if (colecao === 'bazarItems') updateBazarItem(recordId, atualizarCampo)
    else if (colecao === 'demandas') updateDemanda(recordId, atualizarCampo)

    setExcluindo(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo || "Comprovante de Pagamento / Recibo"}>
      <div className="space-y-4">
        {detalhe && (
          <div className="p-3 bg-secondary/50 rounded-xl text-xs text-muted-foreground flex items-center justify-between">
            <span>{detalhe}</span>
            <span className="flex items-center gap-1 text-emerald-500 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
            </span>
          </div>
        )}

        <div className="border border-border/80 rounded-2xl bg-black/40 overflow-hidden flex items-center justify-center min-h-[250px] max-h-[450px] p-2">
          {ehImagemOuArquivoServido ? (
            <img
              src={withAccessToken(comprovanteUrl)}
              alt="Comprovante Anexado"
              className="max-h-[400px] w-auto object-contain rounded-xl shadow-lg"
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <FileText className="w-12 h-12 mx-auto text-primary opacity-60" />
              <p className="text-sm font-semibold">Documento Anexado em formato de Texto/Link</p>
              <p className="text-xs break-all opacity-80">{comprovanteUrl}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-2">
          <div className="flex items-center gap-2">
            <a
              href={withAccessToken(comprovanteUrl)}
              download="comprovante_reuni.png"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-colors"
            >
              <Download className="w-4 h-4 text-primary" />
              Baixar
            </a>

            {colecao && recordId && (
              <button
                onClick={handleExcluir}
                disabled={excluindo}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  )
}
