'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  DollarSign, TrendingUp, Clock, AlertCircle,
  TrendingDown, ArrowUpRight, ArrowDownRight, CalendarRange,
} from 'lucide-react'

interface MesReceita {
  mes: string
  recebido: number
  pendente: number
  qtd: number
}

interface Despesa {
  id: string
  descricao: string
  valor: number
  categoria: string
  data: string
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const fmtMes = (s: string) => {
  const [ano, mes] = s.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(mes) - 1]} ${ano}`
}

const CATEGORIA_STYLE: Record<string, string> = {
  aluguel:      'bg-slate-100 text-slate-600',
  produto:      'bg-blue-50 text-blue-600',
  marketing:    'bg-violet-50 text-violet-600',
  equipamento:  'bg-amber-50 text-amber-600',
  transporte:   'bg-orange-50 text-orange-600',
  outros:       'bg-slate-100 text-slate-500',
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function inicioMesAtual() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export default function FinanceiroPage() {
  const [dataInicio, setDataInicio] = useState(toInputDate(inicioMesAtual()))
  const [dataFim,    setDataFim]    = useState(toInputDate(new Date()))
  const [meses,      setMeses]      = useState<MesReceita[]>([])
  const [despesas,   setDespesas]   = useState<Despesa[]>([])
  const [loading,    setLoading]    = useState(true)
  const [empresaId,  setEmpresaId]  = useState<string | null>(null)

  // Busca empresaId uma vez
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return
      const meta = user.user_metadata ?? {}
      const { data } = await supabase.rpc('bootstrap_empresa', {
        p_nome: meta.name ?? '', p_email: meta.email_contato ?? '',
      })
      if (data) setEmpresaId(data)
    }
    init()
  }, [])

  const load = useCallback(async () => {
    if (!empresaId) return
    setLoading(true)
    const supabase = createClient()
    const inicio = `${dataInicio}T00:00:00`
    const fim    = `${dataFim}T23:59:59`

    const [osRes, despesasRes] = await Promise.all([
      supabase
        .from('ordens_servico')
        .select('valor_total, data_agendamento, status_pagamento')
        .eq('empresa_id', empresaId)
        .eq('status', 'concluido')
        .gte('data_agendamento', inicio)
        .lte('data_agendamento', fim)
        .order('data_agendamento', { ascending: false }),

      supabase
        .from('lancamentos_financeiros')
        .select('id, descricao, valor, categoria, created_at')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'despesa')
        .gte('created_at', inicio)
        .lte('created_at', fim)
        .order('created_at', { ascending: false }),
    ])

    // Agrupar OS por mês
    const agrupado: Record<string, MesReceita> = {}
    for (const os of osRes.data ?? []) {
      const d = new Date(os.data_agendamento)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!agrupado[key]) agrupado[key] = { mes: key, recebido: 0, pendente: 0, qtd: 0 }
      if (os.status_pagamento === 'pago') {
        agrupado[key].recebido += os.valor_total ?? 0
      } else {
        agrupado[key].pendente += os.valor_total ?? 0
      }
      agrupado[key].qtd++
    }

    setMeses(Object.values(agrupado))
    setDespesas(
      (despesasRes.data ?? []).map(d => ({
        id: d.id, descricao: d.descricao, valor: d.valor,
        categoria: d.categoria, data: d.created_at,
      }))
    )
    setLoading(false)
  }, [empresaId, dataInicio, dataFim])

  useEffect(() => { load() }, [load])

  const recebidoTotal  = meses.reduce((s, m) => s + m.recebido, 0)
  const pendenteTotal  = meses.reduce((s, m) => s + m.pendente, 0)
  const totalDespesas  = despesas.reduce((s, d) => s + d.valor, 0)
  const lucroLiquido   = recebidoTotal - totalDespesas
  const totalOs        = meses.reduce((s, m) => s + m.qtd, 0)
  const ticketMedio    = totalOs > 0 ? (recebidoTotal + pendenteTotal) / totalOs : 0
  const totalGeral     = meses.reduce((s, m) => s + m.recebido + m.pendente, 0)

  const statCards = [
    { label: 'Recebido',       value: fmt(recebidoTotal), icon: ArrowUpRight,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pendente',       value: fmt(pendenteTotal), icon: Clock,          color: 'text-amber-600',   bg: 'bg-amber-50'   },
    { label: 'Despesas',       value: fmt(totalDespesas), icon: ArrowDownRight, color: 'text-red-600',     bg: 'bg-red-50'     },
    { label: 'Lucro líquido',  value: fmt(lucroLiquido),  icon: lucroLiquido >= 0 ? TrendingUp : TrendingDown,
      color: lucroLiquido >= 0 ? 'text-blue-600' : 'text-red-600', bg: lucroLiquido >= 0 ? 'bg-blue-50' : 'bg-red-50' },
    { label: 'Ticket médio',   value: fmt(ticketMedio),   icon: DollarSign,     color: 'text-violet-600',  bg: 'bg-violet-50'  },
    { label: 'OS no período',  value: totalOs,             icon: AlertCircle,    color: 'text-slate-600',   bg: 'bg-slate-100'  },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">

      {/* ── Título + filtro de período ─────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500 text-sm mt-1">Resumo do período selecionado</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
          <CalendarRange className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="date"
            value={dataInicio}
            max={dataFim}
            onChange={e => setDataInicio(e.target.value)}
            className="text-sm text-slate-700 font-medium bg-transparent outline-none"
          />
          <span className="text-slate-300 text-sm">–</span>
          <input
            type="date"
            value={dataFim}
            min={dataInicio}
            max={toInputDate(new Date())}
            onChange={e => setDataFim(e.target.value)}
            className="text-sm text-slate-700 font-medium bg-transparent outline-none"
          />
        </div>
      </div>

      {/* ── Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <span className={cn('text-2xl font-bold', loading ? 'text-slate-200' : 'text-slate-900')}>
                {loading ? '—' : value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Despesas do período ───────────────────────── */}
      {(loading || despesas.length > 0) && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Despesas do período
          </p>
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {despesas.map(d => (
                <div key={d.id}
                  className="flex items-center gap-4 bg-white rounded-xl px-4 py-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{d.descricao || d.categoria}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(d.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                      CATEGORIA_STYLE[d.categoria] ?? 'bg-slate-100 text-slate-500',
                    )}>
                      {d.categoria}
                    </span>
                    <span className="text-sm font-bold text-red-600">− {fmt(d.valor)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Histórico por mês ─────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Por mês</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : meses.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Nenhuma OS concluída neste período</p>
          ) : (
            <div className="space-y-4">
              {meses.map(m => {
                const total = m.recebido + m.pendente
                const pctRec = totalGeral > 0 ? (m.recebido / totalGeral) * 100 : 0
                const pctPen = totalGeral > 0 ? (m.pendente / totalGeral) * 100 : 0
                return (
                  <div key={m.mes} className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 w-16 shrink-0">{fmtMes(m.mes)}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: `${pctRec}%` }} />
                      <div className="h-full bg-amber-300" style={{ width: `${pctPen}%` }} />
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold text-slate-900">{fmt(total)}</span>
                      <span className="text-xs text-slate-400 ml-2">{m.qtd} OS</span>
                    </div>
                  </div>
                )
              })}
              <div className="flex gap-4 pt-1">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />Recebido
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />Pendente
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
