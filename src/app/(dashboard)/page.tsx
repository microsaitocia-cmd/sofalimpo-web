'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DollarSign, Users, ClipboardList, MessageSquare,
  TrendingUp, AlertTriangle, Plus, Sparkles,
  MapPin, Clock, ChevronRight,
} from 'lucide-react'

interface Stats {
  totalClientes: number
  ordensHoje: number
  receitaMes: number
  conversasNovas: number
  ordensEmAberto: number
  ticketMedio: number
}

interface OsHoje {
  id: string
  cliente_nome: string
  data_agendamento: string
  itens: { nome: string; quantidade: number }[]
  valor_total: number
  status: string
  status_pagamento: string
}

const STATUS_STYLE: Record<string, string> = {
  agendado:     'bg-blue-50 text-blue-700',
  'em-andamento': 'bg-amber-50 text-amber-700',
  concluido:    'bg-emerald-50 text-emerald-700',
  cancelado:    'bg-red-50 text-red-600',
  orcamento:    'bg-violet-50 text-violet-700',
}
const STATUS_LABEL: Record<string, string> = {
  agendado:     'Agendado',
  'em-andamento': 'Em andamento',
  concluido:    'Concluído',
  cancelado:    'Cancelado',
  orcamento:    'Orçamento',
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDataHoje() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function DashboardPage() {
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [stats, setStats] = useState<Stats>({
    totalClientes: 0, ordensHoje: 0, receitaMes: 0,
    conversasNovas: 0, ordensEmAberto: 0, ticketMedio: 0,
  })
  const [agenda, setAgenda] = useState<OsHoje[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      const meta = user.user_metadata ?? {}
      const nome = (meta.name as string) ?? ''
      setNomeUsuario(nome.split(' ')[0] ?? '')

      const { data: empresaId } = await supabase.rpc('bootstrap_empresa', {
        p_nome: nome, p_email: meta.email_contato ?? '',
      })
      if (!empresaId) return

      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
      const fimHoje   = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

      const [clientes, ordensHoje, receitaMes, conversas, emAberto, osHoje] = await Promise.all([
        supabase.from('clientes')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId).eq('ativo', true),

        supabase.from('ordens_servico')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .gte('data_agendamento', inicioHoje)
          .lte('data_agendamento', fimHoje),

        supabase.from('ordens_servico')
          .select('valor_total')
          .eq('empresa_id', empresaId)
          .eq('status_pagamento', 'pago')
          .gte('data_agendamento', inicioMes),

        supabase.from('whatsapp_conversations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gt('unread_count', 0),

        supabase.from('ordens_servico')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .in('status', ['agendado', 'em-andamento']),

        supabase.from('ordens_servico')
          .select('id,cliente_nome,data_agendamento,itens,valor_total,status,status_pagamento')
          .eq('empresa_id', empresaId)
          .neq('status', 'cancelado')
          .neq('status', 'orcamento')
          .gte('data_agendamento', inicioHoje)
          .lte('data_agendamento', fimHoje)
          .order('data_agendamento', { ascending: true }),
      ])

      const receita = (receitaMes.data ?? []).reduce(
        (s: number, r: { valor_total: number }) => s + (r.valor_total ?? 0), 0)
      const qtdOs = (receitaMes.data ?? []).length

      setStats({
        totalClientes:  clientes.count ?? 0,
        ordensHoje:     ordensHoje.count ?? 0,
        receitaMes:     receita,
        conversasNovas: conversas.count ?? 0,
        ordensEmAberto: emAberto.count ?? 0,
        ticketMedio:    qtdOs > 0 ? receita / qtdOs : 0,
      })
      setAgenda((osHoje.data ?? []) as OsHoje[])
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { title: 'Receita do mês',   value: fmt(stats.receitaMes),   icon: DollarSign,   color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { title: 'Ordens hoje',      value: stats.ordensHoje,         icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Clientes',         value: stats.totalClientes,      icon: Users,         color: 'text-emerald-600',bg: 'bg-emerald-50'},
    { title: 'Ticket médio',     value: fmt(stats.ticketMedio),   icon: TrendingUp,    color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Em aberto',        value: stats.ordensEmAberto,     icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { title: 'WhatsApp novos',   value: stats.conversasNovas,     icon: MessageSquare, color: 'text-green-600',  bg: 'bg-green-50', badge: stats.conversasNovas > 0 },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">

      {/* ── Saudação ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {saudacao()}{nomeUsuario ? `, ${nomeUsuario}` : ''}
          </h1>
          <p className="text-slate-400 text-sm mt-1 capitalize">{fmtDataHoje()}</p>
        </div>

        {/* Ações rápidas */}
        <div className="flex gap-2 shrink-0">
          <Link href="/ordens"
            className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Plus className="w-4 h-4" />Nova OS
          </Link>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            onClick={() => { /* Criar com IA — futura integração */ }}
          >
            <Sparkles className="w-4 h-4" />Criar com IA
          </button>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {statCards.map(({ title, value, icon: Icon, color, bg, badge }) => (
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

      {/* ── Agenda do dia ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agenda do dia</p>
          <Link href="/ordens" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            Ver tudo
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : agenda.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl shadow-sm">
            <ClipboardList className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-slate-400 text-sm font-medium">Nenhum serviço agendado para hoje</p>
          </div>
        ) : (
          <div className="space-y-2">
            {agenda.map(os => {
              const itensLabel = (os.itens ?? []).map((i: { nome: string }) => i.nome).join(' · ')
              return (
                <Link key={os.id} href="/ordens"
                  className="flex items-center gap-4 bg-white rounded-xl px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow group">
                  {/* Hora */}
                  <div className="w-14 shrink-0">
                    <p className="text-base font-bold text-slate-900 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {fmtHora(os.data_agendamento)}
                    </p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{os.cliente_nome}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{itensLabel || '—'}</p>
                  </div>

                  {/* Status + valor */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-slate-700">{fmt(os.valor_total)}</span>
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-full hidden sm:inline-block',
                      STATUS_STYLE[os.status] ?? 'bg-slate-100 text-slate-500',
                    )}>
                      {STATUS_LABEL[os.status] ?? os.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
