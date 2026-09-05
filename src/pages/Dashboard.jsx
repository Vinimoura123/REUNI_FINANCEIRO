import React from 'react'
import { TrendingUp, TrendingDown, Target, Wallet, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'

function StatCard({ title, amount, icon: Icon, subtitle, type = 'normal' }) {
  const colorStyles = {
    normal: 'border-border bg-card text-foreground',
    positive: 'border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400',
    negative: 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400',
    accent: 'border-primary/30 bg-primary/5 text-primary'
  }

  return (
    <div className={`p-6 rounded-2xl border glass-panel shadow-xs transition-all duration-200 hover:shadow-md ${colorStyles[type]}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <div className="p-2.5 rounded-xl bg-secondary/80">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
      </div>
      <div className="text-3xl font-extrabold tracking-tight">
        R$ {Number(amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-2 font-medium">{subtitle}</p>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { 
    totalArrecadado, 
    totalGastos, 
    saldoAtual, 
    totalDemandasPrevistas, 
    metaArrecadacaoTotal,
    demandas,
    arrecadacoes,
    transacoes,
    updateDemandaStatus
  } = useFinance()

  const demandasInegociaveis = demandas.filter(d => d.prioridade === 'Inegociável')
  const percentualMetaArrecadacao = metaArrecadacaoTotal > 0 
    ? Math.min(100, (totalArrecadado / metaArrecadacaoTotal) * 100) 
    : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="pb-4 border-b border-border/60">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Visão Geral Financeira</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Painel de Atualizações, Garantidor Material & Planejamento da REUNI 2026 (UFBA)
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Saldo Atual em Caixa" 
          amount={saldoAtual} 
          icon={Wallet} 
          subtitle="Entradas liquidadas - Saídas realizadas"
          type={saldoAtual >= 0 ? 'positive' : 'negative'}
        />
        <StatCard 
          title="Total Arrecadado" 
          amount={totalArrecadado} 
          icon={ArrowUpRight} 
          subtitle={`Meta Total: R$ ${metaArrecadacaoTotal.toFixed(2)}`}
          type="accent"
        />
        <StatCard 
          title="Demandas Previstas" 
          amount={totalDemandasPrevistas} 
          icon={TrendingDown} 
          subtitle={`${demandas.length} demandas mapeadas`}
        />
        <StatCard 
          title="Total Pago" 
          amount={totalGastos} 
          icon={ArrowDownRight} 
          subtitle="Despesas já quitadas"
        />
      </div>

      {/* Progress & Quick Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Bar Card */}
        <div className="lg:col-span-2 p-7 rounded-2xl border border-border bg-card glass-panel flex flex-col justify-between space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">Progresso Global de Arrecadação</h3>
              <span className="text-sm font-bold text-primary">{percentualMetaArrecadacao.toFixed(1)}%</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Capital prévio necessário para cobrir todas as demandas operacionais antes do evento.
            </p>
            <div className="h-4 bg-secondary rounded-full overflow-hidden p-0.5 border border-border/50">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${percentualMetaArrecadacao}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60 text-center">
            <div>
              <span className="text-xs text-muted-foreground block">Arrecadado</span>
              <span className="text-base font-bold text-green-600 dark:text-green-400">R$ {totalArrecadado.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Custos Totais</span>
              <span className="text-base font-bold text-foreground">R$ {totalDemandasPrevistas.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Diferença</span>
              <span className={`text-base font-bold ${totalArrecadado >= totalDemandasPrevistas ? 'text-green-500' : 'text-amber-500'}`}>
                R$ {(totalArrecadado - totalDemandasPrevistas).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Priority Demands List */}
        <div className="p-6 rounded-2xl border border-border bg-card glass-panel flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-base">Demandas Inegociáveis</h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full">
              {demandasInegociaveis.length} Essenciais
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-72 pr-1">
            {demandasInegociaveis.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground py-8">
                Nenhuma demanda inegociável pendente.
              </div>
            ) : (
              demandasInegociaveis.map((demanda) => (
                <div key={demanda.id} className="p-3.5 rounded-xl border border-border/60 bg-secondary/30 flex items-center justify-between text-xs hover:bg-secondary/60 transition-colors">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground block">{demanda.item}</span>
                    <span className="text-muted-foreground block">{demanda.comissao}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold block text-foreground">R$ {Number(demanda.custo).toFixed(2)}</span>
                    <button
                      onClick={() => updateDemandaStatus(demanda.id, demanda.status === 'Pago' ? 'Pendente' : 'Pago')}
                      className={`text-[10px] font-semibold flex items-center gap-1 mt-1 ml-auto ${
                        demanda.status === 'Pago' ? 'text-green-500' : 'text-amber-500 hover:underline'
                      }`}
                    >
                      {demanda.status === 'Pago' ? (
                        <><CheckCircle2 className="w-3 h-3"/> Pago</>
                      ) : (
                        <><Clock className="w-3 h-3"/> Pagar</>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Cash Activity */}
      <div className="p-6 rounded-2xl border border-border bg-card glass-panel">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Últimas Movimentações Financeiras</h3>
          <span className="text-xs text-muted-foreground">{transacoes.length} lançamentos registrados</span>
        </div>

        <div className="divide-y divide-border/60">
          {transacoes.slice(0, 4).map((transacao) => (
            <div key={transacao.id} className="py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  transacao.tipo === 'Entrada' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {transacao.tipo === 'Entrada' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{transacao.descricao}</p>
                  <p className="text-xs text-muted-foreground">{transacao.data} • {transacao.categoria}</p>
                </div>
              </div>
              <div className={`font-bold ${transacao.tipo === 'Entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {transacao.tipo === 'Entrada' ? '+' : '-'} R$ {Number(transacao.valor).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

