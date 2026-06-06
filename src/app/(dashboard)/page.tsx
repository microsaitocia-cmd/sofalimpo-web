'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Users, ClipboardList, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react'

interface Stats {
  totalClientes: number
  ordensHoje: number
  receitaMes: number
  conversasNovas: number
  ordensEmAberto: number
  ticketMedio: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalClientes: 0, ordensHoje: 0, receitaMes: 0,
    conversasNovas: 0, ordensEmAberto: 0, ticketMedio: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      const meta = user.user_metadata ?? {}
      const nome = meta.name ?? 'Minha Empresa'
      const email = meta.email_contato ?? ''
      const { data: empresaId } = await supabase.rpc('bootstrap_empresa', { p_nome: nome, p_email: email })
      if (!empresaId) return

      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
      const fimHoje   = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

      const [clientes, ordensHoje, receitaMes, conversas, emAberto] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId).eq('ativo', true),
        supabase.from('ordens_servico').select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .gte('data_agendamento', inicioHoje)
          .lte('data_agendamento', fimHoje),
        supabase.from('ordens_servico').select('valor_total')
          .eq('empresa_id', empresaId)
          .eq('status', 'concluido')
          .gte('data_agendamento', inicioMes),
        supabase.from('whatsapp_conversations').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gt('unread_count', 0),
        supabase.from('ordens_servico').select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .in('status', ['agendado', 'em-andamento']),
      ])

      const receita = (receitaMes.data ?? []).reduce((s: number, r: { valor_total: number }) => s + (r.valor_total ?? 0), 0)
      const qtdOs = (receitaMes.data ?? []).length

      setStats({
        totalClientes: clientes.count ?? 0,
        ordensHoje: ordensHoje.count ?? 0,
        receitaMes: receita,
        conversasNovas: conversas.count ?? 0,
        ordensEmAberto: emAberto.count ?? 0,
        ticketMedio: qtdOs > 0 ? receita / qtdOs : 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

  const cards = [
    { title: 'Receita do mês', value: fmt(stats.receitaMes), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Ordens hoje', value: stats.ordensHoje, icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Clientes', value: stats.totalClientes, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Ticket médio', value: fmt(stats.ticketMedio), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Em aberto', value: stats.ordensEmAberto, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'WhatsApp novos', value: stats.conversasNovas, icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50', badge: stats.conversasNovas > 0 },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {cards.map(({ title, value, icon: Icon, color, bg, badge }) => (
          <Card key={title} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {loading ? <span className="text-slate-200 animate-pulse">—</span> : value}
                </span>
                {badge && <Badge className="bg-green-100 text-green-700 text-xs mb-0.5">novo</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
