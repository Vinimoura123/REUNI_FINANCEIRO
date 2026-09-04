import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useFinance } from '../context/FinanceContext'
import { Plus, X, Upload, Palette, CheckSquare, FileText, Tag, Pin } from 'lucide-react'

const COLOR_OPTIONS = [
  { id: 'default', label: 'Neutro', bg: 'bg-slate-500/20' },
  { id: 'amber', label: 'Amarelo', bg: 'bg-amber-500' },
  { id: 'green', label: 'Verde', bg: 'bg-emerald-500' },
  { id: 'blue', label: 'Azul', bg: 'bg-sky-500' },
  { id: 'purple', label: 'Roxo', bg: 'bg-purple-500' },
  { id: 'pink', label: 'Rosa', bg: 'bg-pink-500' }
]

export default function AddKeepNoteModal({ isOpen, onClose, noteToEdit }) {
  const { addKeepNote, updateKeepNote } = useFinance()

  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [tipo, setTipo] = useState('texto') // 'texto' | 'checklist'
  const [cor, setCor] = useState('default')
  const [isPinned, setIsPinned] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  const [imagemUrl, setImagemUrl] = useState('')
  const [prazoData, setPrazoData] = useState('')
  const [prazoHora, setPrazoHora] = useState('')

  // Checklist items
  const [checklistItems, setChecklistItems] = useState([])
  const [newChecklistText, setNewChecklistText] = useState('')

  useEffect(() => {
    if (noteToEdit) {
      setTitulo(noteToEdit.titulo || '')
      setConteudo(noteToEdit.conteudo || '')
      setTipo(noteToEdit.tipo || 'texto')
      setCor(noteToEdit.cor || 'default')
      setIsPinned(noteToEdit.isPinned || false)
      setTagsInput(noteToEdit.tags ? noteToEdit.tags.join(', ') : '')
      setImagemUrl(noteToEdit.imagemUrl || '')
      setPrazoData(noteToEdit.prazoData || '')
      setPrazoHora(noteToEdit.prazoHora || '')
      setChecklistItems(noteToEdit.checklistItems || [])
    } else {
      setTitulo('')
      setConteudo('')
      setTipo('texto')
      setCor('default')
      setIsPinned(false)
      setTagsInput('')
      setImagemUrl('')
      setPrazoData('')
      setPrazoHora('')
      setChecklistItems([])
    }
  }, [noteToEdit, isOpen])

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return
    setChecklistItems(prev => [...prev, { id: Date.now().toString(), text: newChecklistText.trim(), completed: false }])
    setNewChecklistText('')
  }

  const handleRemoveChecklistItem = (id) => {
    setChecklistItems(prev => prev.filter(item => item.id !== id))
  }

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
        setImagemUrl(compressedBase64)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!titulo && !conteudo && checklistItems.length === 0) return

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(t => t.startsWith('#') ? t : `#${t}`)

    const noteData = {
      titulo,
      conteudo,
      tipo,
      cor,
      isPinned,
      tags: parsedTags,
      imagemUrl,
      prazoData,
      prazoHora,
      checklistItems: tipo === 'checklist' ? checklistItems : []
    }

    if (noteToEdit) {
      updateKeepNote(noteToEdit.id, noteData)
    } else {
      addKeepNote(noteData)
    }

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={noteToEdit ? "Editar Nota / Checklist" : "Criar Nova Nota (Estilo Keep)"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title & Pin Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Título da nota..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground font-bold text-base focus:ring-2 focus:ring-primary outline-none"
          />
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isPinned 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                : 'border-border text-muted-foreground hover:bg-secondary'
            }`}
            title={isPinned ? "Nota Fixada" : "Fixar nota no topo"}
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500' : ''}`} />
          </button>
        </div>

        {/* Tipo (Texto vs Checklist) */}
        <div className="grid grid-cols-2 p-1 bg-secondary/50 rounded-xl gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTipo('texto')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tipo === 'texto' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Nota de Texto
          </button>

          <button
            type="button"
            onClick={() => setTipo('checklist')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tipo === 'checklist' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Lista de Checagem (Checklist)
          </button>
        </div>

        {/* Body Content based on type */}
        {tipo === 'texto' ? (
          <div>
            <textarea
              rows="4"
              placeholder="Escreva suas anotações, pautas ou contatos aqui..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 bg-secondary/30 p-2 rounded-xl border border-border/50">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {
                      setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i))
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className={`flex-1 text-xs font-medium ${item.completed ? 'line-through opacity-60' : ''}`}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="p-1 text-muted-foreground hover:text-red-500 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Adicionar item à checklist..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddChecklistItem()
                  }
                }}
                className="flex-1 px-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl border border-border flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Prazo e Horário (Opcionais) */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/20 rounded-2xl border border-border/60">
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              📅 Prazo Limite (Opcional)
            </label>
            <input
              type="date"
              value={prazoData}
              onChange={(e) => setPrazoData(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              ⏰ Horário Limite
            </label>
            <input
              type="time"
              value={prazoHora}
              onChange={(e) => setPrazoHora(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Tags / Etiquetas Input */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Etiquetas / Tags (separadas por vírgula)
          </label>
          <input
            type="text"
            placeholder="Ex: #Reunião, #Financeiro, #Gincana"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Color Theme Selector */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Cor do Card
          </label>
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCor(c.id)}
                className={`w-7 h-7 rounded-full ${c.bg} transition-all border-2 ${
                  cor === c.id ? 'border-primary scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Image Attachment Upload */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Anexo de Imagem (Opcional)
          </label>

          {imagemUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary/30 p-2 flex items-center gap-3">
              <img src={imagemUrl} alt="Anexo" className="w-16 h-16 object-cover rounded-xl border border-border" />
              <span className="text-xs font-semibold flex-1">Imagem Anexada à Nota</span>
              <button
                type="button"
                onClick={() => setImagemUrl('')}
                className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-3.5 border border-dashed border-border rounded-2xl bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all text-xs text-muted-foreground font-medium">
              <Upload className="w-4 h-4 text-primary" />
              <span>Anexar imagem ou print</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Footer Buttons */}
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
            {noteToEdit ? "Salvar Alterações" : "Criar Nota"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
