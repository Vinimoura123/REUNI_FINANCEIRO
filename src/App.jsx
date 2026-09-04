import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Wallet, ArrowRightLeft, HandCoins, Building2, ShoppingBag, StickyNote, Sun, Moon, RotateCcw, CheckCircle2, Trash2 } from 'lucide-react'
import { FinanceProvider, useFinance } from './context/FinanceContext'
import { cn } from './lib/utils'

// Pages
import Dashboard from './pages/Dashboard'
import Demandas from './pages/Demandas'
import Arrecadacao from './pages/Arrecadacao'
import Bazar from './pages/Bazar'
import Informacoes from './pages/Informacoes'
import Caixa from './pages/Caixa'

function Sidebar() {
  const location = useLocation()
  const { theme, toggleTheme, resetToDefault, clearAllData, lastSaved } = useFinance()
  
  const navItems = [
    { name: 'Visão Geral', path: '/', icon: LayoutDashboard },
    { name: 'Planejamento de Demandas', path: '/demandas', icon: Building2 },
    { name: 'Arrecadação Estratégica', path: '/arrecadacao', icon: HandCoins },
    { name: 'Curadoria do Bazar', path: '/bazar', icon: ShoppingBag },
    { name: 'Administração de Informações', path: '/informacoes', icon: StickyNote },
    { name: 'Gestão de Caixa', path: '/caixa', icon: ArrowRightLeft },
  ]

  return (
    <aside className="w-72 border-r border-border bg-card h-screen sticky top-0 flex flex-col glass-panel z-20 shadow-sm">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-xl shadow-md">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">REUNI Financeiro</h1>
            <p className="text-xs text-muted-foreground mt-1">Gestão de Viabilidade & Caixa</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Módulos Principais
        </div>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold translate-x-1" 
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border/50 space-y-3">
        {/* Persistence Status Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold block truncate">Salvamento Automático</span>
            <span className="text-[10px] opacity-80 block truncate">
              {lastSaved ? `Atualizado às ${lastSaved}` : 'Persistência no navegador'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
            title="Alternar Tema Claro/Escuro"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (confirm('Deseja ZERAR todos os dados salvos? Esta ação apagará todas as demandas, arrecadações, acervo do bazar e movimentações.')) {
                  clearAllData()
                }
              }}
              className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-secondary transition-colors"
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
              className="p-2 text-muted-foreground hover:text-amber-500 rounded-lg hover:bg-secondary transition-colors"
              title="Restaurar dados padrão de exemplo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground block mb-0.5">Bíblia REUNI 2026</span>
          Capítulo 6 - Diretrizes e sustentabilidade da Comissão Financeira.
        </div>
      </div>
    </aside>
  )
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased">
      <Sidebar />
      <main className="flex-1 p-8 md:p-10 overflow-y-auto max-w-7xl mx-auto">
        {children}
      </main>
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
            <Route path="/informacoes" element={<Informacoes />} />
            <Route path="/caixa" element={<Caixa />} />
          </Routes>
        </Layout>
      </Router>
    </FinanceProvider>
  )
}
