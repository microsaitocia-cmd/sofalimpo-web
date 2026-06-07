'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ClipboardList, Sparkles, PenLine, Clock, ChevronRight } from 'lucide-react'

interface OsHoje {
  id: string
  cliente_nome: string
  data_agendamento: string
  itens: { nome: string; quantidade: number }[]
  valor_total: number
  status: string
}

const STATUS_STYLE: Record<string, string> = {
  agendado:       'bg-blue-50 text-blue-700',
  'em-andamento': 'bg-amber-50 text-amber-700',
  concluido:      'bg-emerald-50 text-emerald-700',
  cancelado:      'bg-red-50 text-red-600',
  orcamento:      'bg-violet-50 text-violet-700',
}
const STATUS_LABEL: Record<string, string> = {
  agendado:       'Agendado',
  'em-andamento': 'Em andamento',
  concluido:      'Concluído',
  cancelado:      'Cancelado',
  orcamento:      'Orçamento',
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Olá'
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

      const { data } = await supabase
        .from('ordens_servico')
        .select('id,cliente_nome,data_agendamento,itens,valor_total,status')
        .eq('empresa_id', empresaId)
        .neq('status', 'cancelado')
        .neq('status', 'orcamento')
        .gte('data_agendamento', inicioHoje)
        .lte('data_agendamento', fimHoje)
        .order('data_agendamento', { ascending: true })

      setAgenda((data ?? []) as OsHoje[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">

      {/* ── Saudação ──────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {saudacao()}{nomeUsuario ? `, ${nomeUsuario}` : ''}
        </h1>
        <p className="text-slate-400 text-sm mt-0.5 capitalize">{fmtDataHoje()}</p>
      </div>

      {/* ── Ações rápidas ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {/* Novo orçamento */}
        <Link href="/orcamentos"
          className="flex flex-col bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
            <PenLine className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="font-bold text-slate-900 text-sm">Novo orçamento</p>
          <p className="text-xs text-slate-400 mt-0.5">Monte em 30 s</p>
        </Link>

        {/* Criar com IA */}
        <Link href="/orcamentos/ia"
          className="flex flex-col rounded-2xl p-4 shadow-md text-left transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <p className="font-bold text-white text-sm">Criar com IA</p>
          <p className="text-xs text-white/75 mt-0.5">Descreva o serviço</p>
        </Link>
      </div>

      {/* ── Agenda do dia ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agenda do dia</p>
        <Link href="/ordens" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          Ver tudo
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : agenda.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center bg-white rounded-2xl shadow-sm">
          <ClipboardList className="w-8 h-8 text-slate-200 mb-2" />
          <p className="text-slate-400 text-sm font-medium">Nenhum serviço hoje</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agenda.map(os => {
            const servicos = (os.itens ?? []).map((i: { nome: string }) => i.nome).join(' · ')
            return (
              <Link key={os.id} href="/ordens"
                className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group">
                {/* Hora */}
                <div className="w-14 shrink-0 pt-0.5">
                  <p className="text-base font-extrabold text-slate-900 leading-none">
                    {fmtHora(os.data_agendamento)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{(os.itens ?? []).length}h</p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{os.cliente_nome}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{servicos || '—'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      STATUS_STYLE[os.status] ?? 'bg-slate-100 text-slate-500',
                    )}>
                      {STATUS_LABEL[os.status] ?? os.status}
                    </span>
                    <span className="text-sm font-bold text-slate-700 ml-auto">
                      {fmt(os.valor_total)}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 mt-1" />
              </Link>
            )
          })}
        </div>
      )}

    </div>
  )
}
