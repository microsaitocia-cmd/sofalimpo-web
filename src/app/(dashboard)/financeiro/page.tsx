'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, CheckCircle } from 'lucide-react'

interface Receita {
  mes: string
  total: number
  qtd: number
}

export default function FinanceiroPage() {
  const [meses, setMeses] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const meta = (await supabase.auth.getUser()).data.user?.user_metadata ?? {}
      const { data: empresaId } = await supabase.rpc('bootstrap_empresa', { p_nome: meta.name ?? '', p_email: meta.email_contato ?? '' })
      if (!empresaId) return

      const { data } = await supabase
        .from('ordens_servico')
        .select('preco_total, created_at')
        .eq('empresa_id', empresaId)
        .eq('status', 'concluida')
        .order('created_at', { ascending: false })

      const agrupado: Record<string, Receita> = {}
      for (const os of data ?? []) {
        const d = new Date(os.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!agrupado[key]) agrupado[key] = { mes: key, total: 0, qtd: 0 }
        agrupado[key].total += os.preco_total ?? 0
        agrupado[key].qtd++
      }

      setMeses(Object.values(agrupado).slice(0, 6))
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const fmtMes = (s: string) => {
    const [ano, mes] = s.split('-')
    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return `${nomes[parseInt(mes) - 1]} ${ano}`
  }

  const totalGeral = meses.reduce((s, m) => s + m.total, 0)
  const mesAtual = meses[0]
  const ticketMedio = mesAtual ? mesAtual.total / mesAtual.qtd : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
        <p className="text-slate-500 text-sm mt-1">Receitas por OS concluídas</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Receita este mês', value: fmt(mesAtual?.total ?? 0), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Ticket médio', value: fmt(ticketMedio), icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'OS concluídas', value: mesAtual?.qtd ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-slate-900">
                {loading ? <span className="text-slate-200">—</span> : value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">Histórico mensal</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : meses.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Nenhuma OS concluída ainda</p>
          ) : (
            <div className="space-y-3">
              {meses.map(m => {
                const pct = totalGeral > 0 ? (m.total / totalGeral) * 100 : 0
                return (
                  <div key={m.mes} className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 w-16 shrink-0">{fmtMes(m.mes)}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold text-slate-900">{fmt(m.total)}</span>
                      <span className="text-xs text-slate-400 ml-2">{m.qtd} OS</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
