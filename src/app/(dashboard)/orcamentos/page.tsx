'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ClipboardList, Check, Copy, MessageSquare, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Ordem {
  id: string
  cliente_nome: string
  data_agendamento: string
  itens: { nome: string; preco_unitario: number; quantidade: number }[]
  valor_total: number
  status: string
  observacoes: string
  criado_em: string
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function OrcamentosPage() {
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [loading, setLoading] = useState(true)
  const [empresaId, setEmpresaId] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const meta = (await supabase.auth.getUser()).data.user?.user_metadata ?? {}
      const { data: eId } = await supabase.rpc('bootstrap_empresa', { p_nome: meta.name ?? '', p_email: meta.email_contato ?? '' })
      if (!eId) return
      setEmpresaId(eId)
      const { data } = await supabase
        .from('ordens_servico')
        .select('id, cliente_nome, data_agendamento, itens, valor_total, status, observacoes, criado_em')
        .eq('empresa_id', eId)
        .in('status', ['orcamento', 'rascunho'])
        .order('criado_em', { ascending: false })
      setOrdens(data ?? [])
      setLoading(false)
    }
    init()
  }, [])

  async function converter(id: string) {
    const supabase = createClient()
    await supabase.from('ordens_servico').update({ status: 'agendado' }).eq('id', id)
    setOrdens(prev => prev.filter(o => o.id !== id))
  }

  function copiarTexto(o: Ordem) {
    const hoje = new Date()
    const validade = new Date(hoje); validade.setDate(validade.getDate() + 7)
    const fmtFull = (d: Date) => `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`
    const texto = [
      'ORÇAMENTO',
      '─────────────────────',
      `Cliente:  ${o.cliente_nome}`,
      `Emissão:  ${fmtFull(hoje)}`,
      `Validade: ${fmtFull(validade)}`,
      '─────────────────────',
      ...(o.itens || []).map(i => `${i.nome} (${i.quantidade}x)  ${fmt(i.preco_unitario * i.quantidade)}`),
      '─────────────────────',
      `TOTAL:   ${fmt(o.valor_total)}`,
    ].join('\n')
    navigator.clipboard.writeText(texto)
    setCopiado(o.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  function enviarWhatsApp(o: Ordem) {
    const hoje = new Date()
    const validade = new Date(hoje); validade.setDate(validade.getDate() + 7)
    const texto = `Olá ${o.cliente_nome}! 😊\nSegue seu orçamento:\n\n`
      + (o.itens || []).map(i => `• ${i.nome}: ${fmt(i.preco_unitario * i.quantidade)}`).join('\n')
      + `\n\n*Total: ${fmt(o.valor_total)}*\nVálido até ${validade.toLocaleDateString('pt-BR')}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Orçamentos</h1>
        <p className="text-slate-400 text-sm mt-1">
          {loading ? '...' : `${ordens.length} orçamento${ordens.length !== 1 ? 's' : ''} pendente${ordens.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : ordens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-600">Nenhum orçamento pendente</p>
          <p className="text-slate-400 text-sm mt-1">Orçamentos criados no app mobile aparecem aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordens.map(o => (
            <div key={o.id} className="bg-white border-2 border-violet-100 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{o.cliente_nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Criado em {fmtData(o.criado_em)}
                  </p>
                </div>
                <p className="text-xl font-bold text-slate-900 shrink-0">{fmt(o.valor_total)}</p>
              </div>

              <div className="space-y-1 mb-4">
                {(o.itens || []).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.nome} {item.quantidade > 1 ? `×${item.quantidade}` : ''}</span>
                    <span className="text-slate-700 font-medium">{fmt(item.preco_unitario * item.quantidade)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => converter(o.id)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors">
                  <Check className="w-3.5 h-3.5" /> Converter em OS
                </button>
                <button onClick={() => copiarTexto(o)}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                    copiado === o.id ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                  {copiado === o.id ? <><Check className="w-3.5 h-3.5" />Copiado!</> : <><Copy className="w-3.5 h-3.5" />Copiar texto</>}
                </button>
                <button onClick={() => enviarWhatsApp(o)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366]/10 text-[#25D366] rounded-lg text-xs font-semibold hover:bg-[#25D366]/20 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" /> Enviar no WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
