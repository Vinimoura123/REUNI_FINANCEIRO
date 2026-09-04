import React, { useState } from 'react'
import { Pin, Trash2, Palette, CheckSquare, Square, Edit3, Clock, Calendar } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'

const COLOR_STYLES = {
  default: { backgroundColor: 'var(--card)', borderColor: 'var(--border)' },
  amber: { backgroundColor: 'rgba(245, 158, 11, 0.18)', borderColor: 'rgba(245, 158, 11, 0.45)' },
  green: { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.45)' },
  blue: { backgroundColor: 'rgba(14, 165, 233, 0.18)', borderColor: 'rgba(14, 165, 233, 0.45)' },
  purple: { backgroundColor: 'rgba(168, 85, 247, 0.18)', borderColor: 'rgba(168, 85, 247, 0.45)' },
  pink: { backgroundColor: 'rgba(236, 72, 153, 0.18)', borderColor: 'rgba(236, 72, 153, 0.45)' }
}

const COLOR_OPTIONS = [
  { id: 'default', label: 'Padrão', bg: 'bg-slate-400' },
  { id: 'amber', label: 'Amarelo', bg: 'bg-amber-500' },
  { id: 'green', label: 'Verde', bg: 'bg-emerald-500' },
  { id: 'blue', label: 'Azul', bg: 'bg-sky-500' },
  { id: 'purple', label: 'Roxo', bg: 'bg-purple-500' },
  { id: 'pink', label: 'Rosa', bg: 'bg-pink-500' }
]

export default function KeepNoteCard({ note, onEdit }) {
  const { togglePinKeepNote, deleteKeepNote, updateKeepNote, toggleChecklistItem } = useFinance()
  const [showPalette, setShowPalette] = useState(false)

  const isChecklist = note.tipo === 'checklist' && Array.isArray(note.checklistItems)
  const currentStyle = COLOR_STYLES[note.cor] || COLOR_STYLES.default

  const getDeadlineStatus = (prazoData, prazoHora) => {
    if (!prazoData) return null
    const deadlineStr = prazoHora ? `${prazoData}T${prazoHora}` : `${prazoData}T23:59:59`
    const deadlineDate = new Date(deadlineStr)
    const now = new Date()
    const isOverdue = deadlineDate < now

    const parts = prazoData.split('-')
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : prazoData
    const formattedTime = prazoHora ? ` às ${prazoHora}` : ''

    return {
      isOverdue,
      label: `${formattedDate}${formattedTime}`,
      badgeClass: isOverdue 
        ? 'bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30' 
        : 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30'
    }
  }

  const deadline = getDeadlineStatus(note.prazoData, note.prazoHora)

  return (
    <div 
      style={currentStyle}
      className="group relative p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
    >
      {/* Top Header (Title + Pin Button) */}
      <div>
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-bold text-base leading-snug tracking-tight text-foreground pr-7">
            {note.titulo || "Nota sem título"}
          </h3>

          <button
            type="button"
            onClick={() => togglePinKeepNote(note.id)}
            className={`p-1.5 rounded-lg transition-colors absolute top-3.5 right-3 ${
              note.isPinned 
                ? 'text-amber-500 bg-amber-500/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title={note.isPinned ? "Desfixar nota" : "Fixar nota no topo"}
          >
            <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Optional Deadline Badge */}
        {deadline && (
          <div className="mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${deadline.badgeClass}`}>
              <Clock className="w-3 h-3" />
              {deadline.isOverdue ? 'Atrasado: ' : 'Prazo: '}{deadline.label}
            </span>
          </div>
        )}

        {/* Optional Attached Image */}
        {note.imagemUrl && (
          <div className="mb-3 rounded-xl overflow-hidden border border-border/50 max-h-48 bg-black/20 flex items-center justify-center">
            <img src={note.imagemUrl} alt="Anexo" className="w-full h-40 object-cover" />
          </div>
        )}

        {/* Content Body */}
        {isChecklist ? (
          <div className="space-y-1.5 my-2">
            {note.checklistItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => toggleChecklistItem(note.id, item.id)}
                className="flex items-center gap-2.5 text-xs font-medium cursor-pointer py-1 px-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                {item.completed ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={item.completed ? 'line-through text-muted-foreground opacity-70' : 'text-foreground'}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          note.conteudo && (
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line my-2">
              {note.conteudo}
            </p>
          )
        )}
      </div>

      {/* Tags & Footer Toolbar */}
      <div className="mt-4 pt-2">
        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/10 dark:bg-white/10 text-foreground border border-border/40">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Toolbar Buttons */}
        <div className="flex items-center justify-between text-muted-foreground border-t border-border/40 pt-2 text-xs">
          <span className="text-[10px] font-medium">{note.dataCriacao || 'Recente'}</span>

          <div className="flex items-center gap-1">
            {/* Color Palette Picker Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowPalette(!showPalette)
                }}
                className="p-1.5 hover:text-foreground rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-primary"
                title="Mudar cor do card"
              >
                <Palette className="w-4 h-4" />
              </button>

              {showPalette && (
                <div className="absolute bottom-8 right-0 p-2 bg-card border border-border rounded-xl shadow-xl flex gap-1.5 z-40 animate-in zoom-in-95 duration-150">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        updateKeepNote(note.id, { cor: c.id })
                        setShowPalette(false)
                      }}
                      className={`w-5 h-5 rounded-full ${c.bg} hover:scale-125 transition-transform border border-white/30 shadow-xs ${
                        note.cor === c.id ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => onEdit(note)}
              className="p-1.5 hover:text-foreground rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Editar nota"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => deleteKeepNote(note.id)}
              className="p-1.5 hover:text-red-500 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Excluir nota"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
