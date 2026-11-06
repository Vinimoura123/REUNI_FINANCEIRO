import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Wallet, ArrowRightLeft, HandCoins, Building2, 
  ShoppingBag, StickyNote, Sun, Moon, RotateCcw, CheckCircle2, RefreshCw, AlertTriangle,
  Trash2, Menu, X, PanelLeftClose, PanelLeftOpen, ChevronRight, Layers, Boxes, FileSpreadsheet, Download
} from 'lucide-react'
import { FinanceProvider, useFinance } from './context/FinanceContext'
import AuthGate from './components/AuthGate'
import { cn } from './lib/utils'
import { exportToExcel } from './utils/excelExporter'

// Pages
import Dashboard from './pages/Dashboard'
import Demandas from './pages/Demandas'
import Arrecadacao from './pages/Arrecadacao'
import Bazar from './pages/Bazar'
import Informacoes from './pages/Informacoes'
import Caixa from './pages/Caixa'
import Inventario from './pages/Inventario'

// Modals
import ImportPlanilhaModal from './components/ImportPlanilhaModal'

const NAV_SECTIONS = [
  {
    category: 'Caixa',
    color: '#1B5EA8',
    items: [
      { num: '01', name: 'Visão geral', path: '/', icon: LayoutDashboard },
      { num: '02', name: 'Gestão de caixa', path: '/caixa', icon: ArrowRightLeft },
      { num: '03', name: 'Demandas por subcomissão', path: '/demandas', icon: Building2 },
    ]
  },
  {
    category: 'Entrada',
    color: '#1E7A4B',
    items: [
      { num: '04', name: 'Arrecadação estratégica', path: '/arrecadacao', icon: HandCoins },
      { num: '05', name: 'Curadoria do bazar', path: '/bazar', icon: ShoppingBag },
    ]
  },
  {
    category: 'Registro',
    color: '#E8A400',
    items: [
      { num: '06', name: 'Inventário & Patrimônio', path: '/inventario', icon: Boxes },
      { num: '07', name: 'Prestação & Informações', path: '/informacoes', icon: StickyNote },
    ]
  }
]

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items)

function SidebarContent({ isCollapsed, toggleCollapse, closeMobile, onOpenImport }) {
  const location = useLocation()
  const financeData = useFinance()
  const { theme, toggleTheme, resetToDefault, clearAllData, lastSaved, syncStatus, pendingOpsCount, forceSyncNow } = financeData

  const handleExportExcel = () => {
    if (closeMobile) closeMobile()
    exportToExcel(financeData)
  }

  return (
    <div className="flex flex-col h-full bg-[#1A1714] text-[#FBF9F4] select-none overflow-hidden font-sans border-r border-[#302A24]">
      {/* Header da Sidebar com as 4 Listras de Marca REUNI */}
      <div className={cn(
        "border-b border-[#302A24] flex items-center transition-all duration-300 shrink-0",
        isCollapsed ? "justify-center px-2 py-4" : "justify-between px-5 py-4"
      )}>
        {isCollapsed ? (
          <button
            onClick={toggleCollapse}
            className="p-2.5 bg-[#1B5EA8] text-white hover:bg-[#123F73] rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
            title="Expandir Menu"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        ) : (
          <>
            <div className="flex flex-col min-w-0">
              {/* Barra das 4 Cores REUNI */}
              <div className="brand-stripe-bar mb-2">
                <span className="w-4 h-1.5 rounded-xs inline-block"></span>
                <span className="w-4 h-1.5 rounded-xs inline-block"></span>
                <span className="w-4 h-1.5 rounded-xs inline-block"></span>
                <span className="w-4 h-1.5 rounded-xs inline-block"></span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-[#FBF9F4]">REUNI</h1>
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#9A9284] mt-1">Financeiro · UFBA 2026</p>
            </div>

            {/* Botão para recolher no Desktop */}
            <button
              onClick={toggleCollapse}
              className="hidden md:flex p-2 rounded-lg text-[#9A9284] hover:text-[#FBF9F4] hover:bg-[#302A24] transition-colors"
              title="Recolher Menu"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>

            {/* Botão fechar no Mobile */}
            <button
              onClick={closeMobile}
              className="md:hidden p-2 rounded-lg text-[#9A9284] hover:text-[#FBF9F4] hover:bg-[#302A24] transition-colors"
              title="Fechar Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Navegação por Subcomissões e Seções */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((sec) => (
          <div key={sec.category} className="space-y-1">
            {!isCollapsed && (
              <div className="flex items-center gap-2 px-3 py-1 text-[9.5px] font-extrabold tracking-widest uppercase text-[#9A9284]">
                <span className="w-2 h-2 rounded-xs" style={{ background: sec.color }} />
                <span>{sec.category}</span>
                <span className="flex-1 h-px bg-[#302A24] ml-1" />
              </div>
            )}

            {sec.items.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobile}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center gap-2.5 transition-all duration-200 group relative",
                    isCollapsed 
                      ? "justify-center w-11 h-11 mx-auto rounded-xl" 
                      : "px-3 py-2.5 rounded-lg text-xs font-bold border-l-3",
                    isActive 
                      ? "bg-[#2A241F] text-[#FBF9F4] shadow-xs" 
                      : "text-[#C9C1B2] hover:bg-[#24201C] hover:text-[#FBF9F4]"
                  )}
                  style={{ borderLeftColor: isActive ? sec.color : 'transparent' }}
                >
                  {!isCollapsed && (
                    <span className="text-[10px] font-extrabold tabular-nums opacity-50 text-[#9A9284]">
                      {item.num}
                    </span>
                  )}

                  <item.icon className={cn(
                    "w-4 h-4 shrink-0 transition-transform group-hover:scale-110", 
                    isActive ? "text-[#FBF9F4]" : "text-[#9A9284] group-hover:text-[#FBF9F4]"
                  )} />
                  
                  {!isCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}

                  {/* Tooltip no desktop quando recolhido */}
                  {isCollapsed && (
                    <span className="absolute left-full ml-3 px-3 py-1.5 bg-[#1A1714] text-[#FBF9F4] text-xs font-semibold rounded-lg shadow-xl border border-[#302A24] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                      {item.num} · {item.name}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Rodapé da Sidebar */}
      <div className={cn("p-4 border-t border-[#302A24] space-y-2.5 shrink-0 bg-[#141210]", isCollapsed ? "p-2 space-y-2" : "")}>
        {/* Status Real de Sincronização com a Nuvem + Botão de Reconciliação Manual */}
        {!isCollapsed && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 border rounded-lg text-xs transition-colors",
            syncStatus === 'synced'
              ? "bg-[#1E7A4B]/10 border-[#1E7A4B]/30 text-[#1E7A4B]"
              : syncStatus === 'auth_error'
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          )}>
            {syncStatus === 'synced' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7A4B] shrink-0" />
            ) : syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
            ) : (
              <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0", syncStatus === 'auth_error' ? "text-red-400" : "text-amber-400")} />
            )}
            <div className="flex-1 min-w-0">
              <span className={cn(
                "font-semibold block truncate",
                syncStatus === 'synced'
                  ? "text-emerald-400"
                  : syncStatus === 'auth_error'
                    ? "text-red-400"
                    : "text-amber-300"
              )}>
                {syncStatus === 'synced'
                  ? 'Sincronizado 24/7'
                  : syncStatus === 'syncing'
                    ? 'Sincronizando nuvem...'
                    : syncStatus === 'auth_error'
                      ? 'Token inválido (401)'
                      : pendingOpsCount > 0
                        ? `Envio pendente (${pendingOpsCount})`
                        : 'Modo local · Reconectando'}
              </span>
              <span className={cn(
                "text-[10px] opacity-80 block truncate",
                syncStatus === 'synced'
                  ? "text-emerald-500/80"
                  : syncStatus === 'auth_error'
                    ? "text-red-400/80"
                    : "text-amber-400/80"
              )}>
                {syncStatus === 'auth_error'
                  ? 'Refaça login para sincronizar'
                  : lastSaved
                    ? `Confirmado · ${lastSaved}`
                    : 'Aguardando confirmação do servidor'}
              </span>
            </div>
            <button
              type="button"
              onClick={forceSyncNow}
              className="p-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
              title="Forçar sincronização imediata com o servidor"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 opacity-80 hover:opacity-100", syncStatus === 'syncing' ? "animate-spin" : "")} />
            </button>
          </div>
        )}

        {/* Botão de Exportação para Excel (.xlsx) */}
        {!isCollapsed ? (
          <button
            onClick={handleExportExcel}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#1B5EA8] hover:bg-[#123F73] text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            title="Exportar Relatório Geral em Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Relatório .xlsx</span>
          </button>
        ) : (
          <button
            onClick={handleExportExcel}
            className="w-11 h-11 mx-auto flex items-center justify-center bg-[#1B5EA8] hover:bg-[#123F73] text-white rounded-lg text-xs font-bold transition-colors"
            title="Exportar Relatório Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Botão de Importação de Planilha CSV / Excel */}
        {!isCollapsed ? (
          <button
            onClick={() => {
              if (closeMobile) closeMobile()
              onOpenImport()
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#24201C] hover:bg-[#302A24] text-[#C9C1B2] border border-[#302A24] rounded-lg text-xs font-semibold transition-all"
            title="Importar Planilha CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#E8A400]" />
            <span>Importar Planilha</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (closeMobile) closeMobile()
              onOpenImport()
            }}
            className="w-11 h-11 mx-auto flex items-center justify-center bg-[#24201C] hover:bg-[#302A24] text-[#E8A400] border border-[#302A24] rounded-lg text-xs font-semibold transition-colors"
            title="Importar Planilha CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        )}

        {/* Botões de Ação Rápida */}
        <div className={cn("flex items-center justify-between pt-1", isCollapsed ? "flex-col gap-2" : "")}>
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors",
              isCollapsed ? "w-11 h-11 justify-center rounded-xl" : "px-3 py-2"
            )}
            title="Alternar Tema Claro/Escuro"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            {!isCollapsed && <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>}
          </button>

          <div className={cn("flex items-center gap-1", isCollapsed ? "flex-col gap-2" : "")}>
            <button
              onClick={() => {
                if (confirm('Deseja ZERAR todos os dados salvos? Esta ação apagará todas as demandas, arrecadações, acervo do bazar e movimentações.')) {
                  clearAllData()
                }
              }}
              className={cn(
                "p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-secondary transition-colors",
                isCollapsed ? "w-11 h-11 flex items-center justify-center rounded-xl" : ""
              )}
              title="Zerar todos os dados salvos"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (confirm('Deseja restaurar os dados de exemplo padrão do Capítulo 6 da REUNI?')) {
                  resetToDefault()
                }
              }}
              className={cn(
                "p-2 text-muted-foreground hover:text-amber-500 rounded-lg hover:bg-secondary transition-colors",
                isCollapsed ? "w-11 h-11 flex items-center justify-center rounded-xl" : ""
              )}
              title="Restaurar dados padrão de exemplo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground block mb-0.5">Bíblia REUNI 2026</span>
            Capítulo 6 - Diretrizes e sustentabilidade da Comissão Financeira.
          </div>
        )}
      </div>
    </div>
  )
}

const MOBILE_QUICK_NAV = [
  { name: 'Geral', path: '/', icon: LayoutDashboard },
  { name: 'Demandas', path: '/demandas', icon: Building2 },
  { name: 'Caixa', path: '/caixa', icon: ArrowRightLeft },
  { name: 'Inventário', path: '/inventario', icon: Boxes },
]

function Layout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const location = useLocation()
  const { theme, toggleTheme } = useFinance()
  const hoveredElementRef = useRef(null)

  // Controle global de barras de rolagem (horizontal e vertical) pelas setas do teclado
  useEffect(() => {
    const handleMouseOver = (e) => {
      hoveredElementRef.current = e.target
    }

    const isHorizontallyScrollable = (el) => {
      if (!el || el === document.body || el === document.documentElement) return false
      if (el.scrollWidth <= el.clientWidth + 1) return false
      const style = window.getComputedStyle(el)
      return style.overflowX === 'auto' || style.overflowX === 'scroll'
    }

    const isVerticallyScrollable = (el) => {
      if (!el || el === document.body || el === document.documentElement) return false
      if (el.scrollHeight <= el.clientHeight + 1) return false
      const style = window.getComputedStyle(el)
      return style.overflowY === 'auto' || style.overflowY === 'scroll'
    }

    const findScrollableAncestor = (startEl, checkFn) => {
      let el = startEl
      while (el && el !== document.body && el !== document.documentElement) {
        if (checkFn(el)) return el
        el = el.parentElement
      }
      return null
    }

    const findBestHorizontalTarget = () => {
      const fromActive = findScrollableAncestor(document.activeElement, isHorizontallyScrollable)
      if (fromActive) return fromActive

      const fromHover = findScrollableAncestor(hoveredElementRef.current, isHorizontallyScrollable)
      if (fromHover) return fromHover

      const candidates = Array.from(document.querySelectorAll('.overflow-x-auto, [style*="overflow-x"]'))
        .filter(el => isHorizontallyScrollable(el) && el.offsetParent !== null)

      if (candidates.length > 0) {
        candidates.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))
        return candidates[0]
      }

      if (document.scrollingElement && document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth + 1) {
        return document.scrollingElement
      }
      return null
    }

    const findBestVerticalTarget = () => {
      const fromHover = findScrollableAncestor(hoveredElementRef.current, isVerticallyScrollable)
      if (fromHover) return fromHover

      const fromActive = findScrollableAncestor(document.activeElement, isVerticallyScrollable)
      if (fromActive) return fromActive

      return document.scrollingElement || document.documentElement
    }

    const handleKeyDown = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return

      const active = document.activeElement
      if (active) {
        const tag = active.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          active.isContentEditable
        ) {
          return
        }
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const target = findBestHorizontalTarget()
        if (target) {
          e.preventDefault()
          const step = e.repeat ? 90 : 160
          const delta = e.key === 'ArrowRight' ? step : -step
          target.scrollBy({
            left: delta,
            behavior: e.repeat ? 'auto' : 'smooth'
          })
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const target = findBestVerticalTarget()
        if (target) {
          e.preventDefault()
          const step = e.repeat ? 80 : 140
          const delta = e.key === 'ArrowDown' ? step : -step
          target.scrollBy({
            top: delta,
            behavior: e.repeat ? 'auto' : 'smooth'
          })
        }
      }
    }

    window.addEventListener('mouseover', handleMouseOver, { passive: true })
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Fechar menu mobile ao mudar de rota
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // Obter nome da página ativa
  const currentNavItem = ALL_NAV_ITEMS.find(item => item.path === location.pathname) || ALL_NAV_ITEMS[0]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased relative font-sans">
      
      {/* Header Superior Mobile (Celulares e Tablets Pequenos) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#1A1714] text-[#FBF9F4] border-b border-[#302A24] shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="brand-stripe-bar flex gap-1">
            <span className="w-2.5 h-4 rounded-xs inline-block"></span>
            <span className="w-2.5 h-4 rounded-xs inline-block"></span>
            <span className="w-2.5 h-4 rounded-xs inline-block"></span>
            <span className="w-2.5 h-4 rounded-xs inline-block"></span>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-[#FBF9F4] leading-none truncate">REUNI 2026</h2>
            <p className="text-[10px] text-[#E8A400] font-bold mt-0.5 truncate">
              {currentNavItem.num} · {currentNavItem.name}
            </p>
          </div>
        </div>

        {/* Ações Rápidas do Header Mobile */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="p-2 bg-[#24201C] text-[#E8A400] hover:bg-[#302A24] rounded-lg transition-colors border border-[#302A24]"
            title="Importar CSV/Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-[#9A9284] hover:text-[#FBF9F4] rounded-lg hover:bg-[#302A24] transition-colors"
            title="Tema"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1B5EA8] text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 ml-1"
            aria-label="Abrir menu de módulos"
          >
            {isMobileOpen ? <X className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* Backdrop de Fundo Escuro para Mobile Drawer */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Mobile (Gaveta Deslizante) */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 md:hidden transition-transform duration-300 ease-out shadow-2xl",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent 
          isCollapsed={false} 
          toggleCollapse={() => {}} 
          closeMobile={() => setIsMobileOpen(false)}
          onOpenImport={() => setIsImportModalOpen(true)}
        />
      </div>

      {/* Sidebar Desktop (Recolhível w-72 / w-20) */}
      <aside className={cn(
        "hidden md:block sticky top-0 h-screen border-r border-[#302A24] z-20 transition-all duration-300 shrink-0",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <SidebarContent 
          isCollapsed={isCollapsed} 
          toggleCollapse={() => setIsCollapsed(!isCollapsed)} 
          closeMobile={() => {}}
          onOpenImport={() => setIsImportModalOpen(true)}
        />
      </aside>

      {/* Conteúdo Principal (Com padding inferior no Mobile para acomodar a Bottom Bar) */}
      <main className="flex-1 p-3 sm:p-6 md:p-10 min-w-0 overflow-y-auto max-w-7xl mx-auto w-full transition-all duration-300 pb-24 md:pb-10">
        {children}
      </main>

      {/* Barra de Navegação Inferior Nativa para Celulares (Bottom Navigation Bar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border px-2 py-2 flex items-center justify-around md:hidden shadow-lg">
        {MOBILE_QUICK_NAV.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all text-[10px] font-medium min-w-[64px]",
                isActive 
                  ? "text-primary font-bold bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary scale-110" : "text-muted-foreground")} />
              <span>{item.name}</span>
            </Link>
          )
        })}

        {/* Botão "Mais" que abre a gaveta com todos os módulos */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-all text-[10px] font-medium min-w-[64px]"
        >
          <Layers className="w-5 h-5 text-muted-foreground" />
          <span>Módulos</span>
        </button>
      </nav>

      {/* Modal de Importação de Planilha */}
      <ImportPlanilhaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

    </div>
  )
}

export default function App() {
  return (
    <AuthGate>
      <FinanceProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/demandas" element={<Demandas />} />
              <Route path="/arrecadacao" element={<Arrecadacao />} />
              <Route path="/bazar" element={<Bazar />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/informacoes" element={<Informacoes />} />
              <Route path="/caixa" element={<Caixa />} />
            </Routes>
          </Layout>
        </Router>
      </FinanceProvider>
    </AuthGate>
  )
}

