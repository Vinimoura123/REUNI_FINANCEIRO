import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Wallet, ArrowRightLeft, HandCoins, Building2, 
  ShoppingBag, StickyNote, Sun, Moon, RotateCcw, CheckCircle2, 
  Trash2, Menu, X, PanelLeftClose, PanelLeftOpen, ChevronRight, Layers, Boxes, FileSpreadsheet, Download
} from 'lucide-react'
import { FinanceProvider, useFinance } from './context/FinanceContext'
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

const NAV_ITEMS = [
  { name: 'Visão Geral', path: '/', icon: LayoutDashboard },
  { name: 'Planejamento de Demandas', path: '/demandas', icon: Building2 },
  { name: 'Arrecadação Estratégica', path: '/arrecadacao', icon: HandCoins },
  { name: 'Curadoria do Bazar', path: '/bazar', icon: ShoppingBag },
  { name: 'Inventário de Materiais', path: '/inventario', icon: Boxes },
  { name: 'Administração de Informações', path: '/informacoes', icon: StickyNote },
  { name: 'Gestão de Caixa', path: '/caixa', icon: ArrowRightLeft },
]

function SidebarContent({ isCollapsed, toggleCollapse, closeMobile, navItems, onOpenImport }) {
  const location = useLocation()
  const financeData = useFinance()
  const { theme, toggleTheme, resetToDefault, clearAllData, lastSaved } = financeData

  const handleExportExcel = () => {
    if (closeMobile) closeMobile()
    exportToExcel(financeData)
  }

  return (
    <div className="flex flex-col h-full bg-card glass-panel select-none overflow-hidden">
      {/* Header da Sidebar */}
      <div className={cn(
        "border-b border-border/50 flex items-center transition-all duration-300 shrink-0",
        isCollapsed ? "justify-center px-2 py-4" : "justify-between px-5 py-4"
      )}>
        {isCollapsed ? (
          <button
            onClick={toggleCollapse}
            className="p-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
            title="Expandir Menu"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              <div className="p-2.5 bg-primary text-primary-foreground rounded-xl shadow-md shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-foreground tracking-tight leading-none truncate">REUNI Financeiro</h1>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">Gestão de Viabilidade</p>
              </div>
            </div>

            {/* Botão para recolher no Desktop */}
            <button
              onClick={toggleCollapse}
              className="hidden md:flex p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Recolher Menu"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>

            {/* Botão fechar no Mobile */}
            <button
              onClick={closeMobile}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Fechar Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Navegação de Módulos */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Módulos Principais
          </div>
        )}

        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMobile}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3.5 transition-all duration-200 group relative",
                isCollapsed 
                  ? "justify-center w-11 h-11 mx-auto rounded-xl" 
                  : "px-3 py-3 rounded-xl text-sm font-medium",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md font-semibold" + (!isCollapsed ? " translate-x-0.5" : "")
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 shrink-0 transition-transform group-hover:scale-110", 
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              
              {!isCollapsed && (
                <span className="truncate">{item.name}</span>
              )}

              {/* Tooltip no desktop quando recolhido */}
              {isCollapsed && (
                <span className="absolute left-full ml-3 px-3 py-1.5 bg-popover text-popover-foreground text-xs font-semibold rounded-xl shadow-xl border border-border/80 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 translate-x-1 group-hover:translate-x-0">
                  {item.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé da Sidebar */}
      <div className={cn("p-4 border-t border-border/50 space-y-2.5 shrink-0", isCollapsed ? "p-2 space-y-2" : "")}>
        {/* Status de Salvamento */}
        {!isCollapsed && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold block truncate">Salvamento Automático</span>
              <span className="text-[10px] opacity-80 block truncate">
                {lastSaved ? `Atualizado às ${lastSaved}` : 'Persistência ativa'}
              </span>
            </div>
          </div>
        )}

        {/* Botão de Exportação para Excel (.xlsx) */}
        {!isCollapsed ? (
          <button
            onClick={handleExportExcel}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
            title="Exportar Relatório Geral em Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Relatório Excel (.xlsx)</span>
          </button>
        ) : (
          <button
            onClick={handleExportExcel}
            className="w-11 h-11 mx-auto flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-semibold transition-all shadow-xs"
            title="Importar Planilha CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar Planilha CSV / Excel</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (closeMobile) closeMobile()
              onOpenImport()
            }}
            className="w-11 h-11 mx-auto flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-semibold transition-colors"
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

  // Fechar menu mobile ao mudar de rota
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // Obter nome da página ativa
  const currentNavItem = NAV_ITEMS.find(item => item.path === location.pathname) || NAV_ITEMS[0]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased relative">
      
      {/* Header Superior Mobile (Celulares e Tablets Pequenos) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-md border-b border-border shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-xs shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground leading-none truncate">REUNI Financeiro</h2>
            <p className="text-[11px] text-primary font-semibold mt-0.5 truncate">
              {currentNavItem.name}
            </p>
          </div>
        </div>

        {/* Ações Rápidas do Header Mobile */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors"
            title="Importar CSV/Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors"
            title="Tema"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 ml-1"
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
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity animate-in fade-in duration-200"
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
          navItems={NAV_ITEMS}
          onOpenImport={() => setIsImportModalOpen(true)}
        />
      </div>

      {/* Sidebar Desktop (Recolhível w-72 / w-20) */}
      <aside className={cn(
        "hidden md:block sticky top-0 h-screen border-r border-border z-20 transition-all duration-300 shrink-0",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <SidebarContent 
          isCollapsed={isCollapsed} 
          toggleCollapse={() => setIsCollapsed(!isCollapsed)} 
          closeMobile={() => {}}
          navItems={NAV_ITEMS}
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
  )
}

