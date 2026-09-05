import React, { useState } from 'react'
import { 
  StickyNote, 
  Plus, 
  Search, 
  Pin, 
  CheckSquare, 
  Tag, 
  FileText, 
  Info, 
  Upload, 
  Sparkles, 
  Filter 
} from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import KeepNoteCard from '../components/KeepNoteCard'
import AddKeepNoteModal from '../components/AddKeepNoteModal'

export default function Informacoes() {
  const { keepNotes } = useFinance()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('Todas')
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [noteToEdit, setNoteToEdit] = useState(null)

  // Extract all unique tags
  const allTags = ['Todas', ...new Set(keepNotes.flatMap(n => n.tags || []))]

  // Filter notes
  const filteredNotes = keepNotes.filter(note => {
    const matchesSearch = 
      (note.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.conteudo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.checklistItems || []).some(item => item.text.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesTag = selectedTag === 'Todas' || (note.tags && note.tags.includes(selectedTag))
    return matchesSearch && matchesTag
  })

  // Separate pinned and unpinned
  const pinnedNotes = filteredNotes.filter(n => n.isPinned)
  const otherNotes = filteredNotes.filter(n => !n.isPinned)

  const handleEditNote = (note) => {
    setNoteToEdit(note)
    setIsAddModalOpen(true)
  }

  const handleOpenNewNote = () => {
    setNoteToEdit(null)
    setIsAddModalOpen(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <StickyNote className="w-8 h-8 text-amber-500" />
            Administração de Informações
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Central de notas, atas de reuniões, listas de tarefas e avisos em tempo real (Estilo Google Keep).
          </p>
        </div>

        <button 
          onClick={handleOpenNewNote}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-sm font-semibold transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Anotação / Checklist
        </button>
      </div>


      {/* Search & Tag Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Pesquisar nas anotações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Tags list */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: PINNED NOTES */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Notas Fixadas ({pinnedNotes.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pinnedNotes.map(note => (
              <KeepNoteCard key={note.id} note={note} onEdit={handleEditNote} />
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: OTHER NOTES */}
      <div className="space-y-3 pt-2">
        {pinnedNotes.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Outras Notas ({otherNotes.length})</span>
          </div>
        )}

        {filteredNotes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm border border-dashed border-border rounded-2xl space-y-2">
            <StickyNote className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-foreground">Nenhuma informação encontrada.</p>
            <p className="text-xs">Clique no campo acima ou em "Nova Anotação" para registrar um aviso ou tarefa.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {otherNotes.map(note => (
              <KeepNoteCard key={note.id} note={note} onEdit={handleEditNote} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AddKeepNoteModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false)
          setNoteToEdit(null)
        }} 
        noteToEdit={noteToEdit} 
      />
    </div>
  )
}
