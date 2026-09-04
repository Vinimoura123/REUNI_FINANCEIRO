import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { Upload, Image as ImageIcon, X, Calendar, Clock, User } from 'lucide-react'

export default function AddBazarItemModal({ isOpen, onClose, itemToEdit = null }) {
  const { addBazarItem, updateBazarItem } = useFinance()

  const now = new Date()
  const defaultDataHora = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('Livros')
  const [doador, setDoador] = useState('')
  const [estado, setEstado] = useState('Seminovo')
  const [precoAvaliado, setPrecoAvaliado] = useState('')
  const [dataHoraRecebimento, setDataHoraRecebimento] = useState(defaultDataHora)
  const [observacao, setObservacao] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')

  useEffect(() => {
    if (itemToEdit) {
      setNome(itemToEdit.nome || '')
      setCategoria(itemToEdit.categoria || 'Livros')
      setDoador(itemToEdit.doador || '')
      setEstado(itemToEdit.estado || 'Seminovo')
      setPrecoAvaliado(itemToEdit.precoAvaliado || '')
      setDataHoraRecebimento(itemToEdit.dataHoraRecebimento || itemToEdit.dataHora || defaultDataHora)
      setObservacao(itemToEdit.observacao || '')
      setFotoUrl(itemToEdit.fotoUrl || '')
    } else {
      setNome('')
      setCategoria('Livros')
      setDoador('')
      setEstado('Seminovo')
      setPrecoAvaliado('')
      setDataHoraRecebimento(defaultDataHora)
      setObservacao('')
      setFotoUrl('')
    }
  }, [itemToEdit, isOpen])

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 600
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
        setFotoUrl(compressedBase64)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nome || !precoAvaliado) return

    const payload = {
      nome,
      categoria,
      doador: doador || 'Anônimo / Doação Geral',
      estado,
      precoAvaliado: parseFloat(precoAvaliado),
      dataHoraRecebimento: dataHoraRecebimento || defaultDataHora,
      observacao,
      fotoUrl
    }

    if (itemToEdit) {
      updateBazarItem(itemToEdit.id, payload)
    } else {
      addBazarItem({
        ...payload,
        status: 'Em Avaliação'
      })
    }

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={itemToEdit ? "Editar Objeto do Bazar" : "Cadastrar Objeto com Rastreabilidade de Doador"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do Item */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Nome do Objeto *
          </label>
          <input
            type="text"
            placeholder="Ex: Livro Algoritmos Cormen 3ª Edição / Coleção de Gibis"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Categoria & Doador */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Categoria *
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Livros">📚 Livros</option>
              <option value="Brinquedos">🧸 Brinquedos</option>
              <option value="Roupas">👕 Roupas</option>
              <option value="Objetos Ademais">🎁 Objetos Ademais (Outros/Decoração)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Nome do Doador / Origem *
            </label>
            <input
              type="text"
              placeholder="Ex: Prof. Ricardo / Calouro BI"
              required
              value={doador}
              onChange={(e) => setDoador(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Estado, Preço Avaliado & Data/Hora de Doação */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Estado *
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Novo">Novo</option>
              <option value="Seminovo">Seminovo</option>
              <option value="Usado em bom estado">Usado bom estado</option>
              <option value="Com marcas de uso">Com marcas</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Valor Sugerido (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.50"
              placeholder="Ex: 25.00"
              required
              value={precoAvaliado}
              onChange={(e) => setPrecoAvaliado(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Data e Horário *
            </label>
            <input
              type="text"
              placeholder="03/09/2026 23:00"
              required
              value={dataHoraRecebimento}
              onChange={(e) => setDataHoraRecebimento(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Foto do Objeto Upload */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Foto do Objeto (Opcional)
          </label>
          
          {fotoUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary/30 p-2 flex items-center gap-3">
              <img src={fotoUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-border" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-foreground block truncate">Foto Anexada</span>
                <span className="text-[10px] text-emerald-500 font-medium block">Otimizada para salvamento</span>
              </div>
              <button
                type="button"
                onClick={() => setFotoUrl('')}
                className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-secondary transition-colors"
                title="Remover Imagem"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-3.5 border border-dashed border-border rounded-2xl bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all text-xs text-muted-foreground font-medium">
              <Upload className="w-4 h-4 text-primary" />
              <span>Clique para carregar foto do objeto</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Observações da Curadoria (Opcional)
          </label>
          <textarea
            rows="2"
            placeholder="Detalhes adicionais, edição do livro ou avarias..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
          />
        </div>

        {/* Buttons */}
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
            className="px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-colors shadow-sm"
          >
            Encaminhar para Curadoria Datada
          </button>
        </div>
      </form>
    </Modal>
  )
}
