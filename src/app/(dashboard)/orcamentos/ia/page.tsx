'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Sparkles, Send, ArrowLeft, AlertTriangle, User } from 'lucide-react'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

interface ItemIA {
  id: string
  nome: string
  condicao: string
  quantidade: number
  preco: number
}

interface OrcamentoIA {
  itens: ItemIA[]
  total: number
  resumo: string
  observacoes: string
  nao_encontrados: string[]
  cliente_id: string | null
}

interface Msg {
  tipo: 'ia' | 'usuario' | 'orcamento' | 'erro'
  texto?: string
  orcamento?: OrcamentoIA
  clienteNome?: string
}

interface CatalogoItem {
  id: string
  nome: string
  preco: number
  condicoes: { nome: string; preco: number }[]
}

interface Cliente {
  id: string
  nome: string
  fone?: string
}

export default function OrcamentoIaPage() {
  const router = useRouter()
  const [msgs, setMsgs] = useState<Msg[]>([{
    tipo: 'ia',
    texto: 'Olá! Descreva o serviço que você quer orçar e eu monto tudo para você.\n\nEx: "Limpar sofá de 3 lugares, muito sujo, e 1 colchão queen com odor"',
  }])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return
      const meta = user.user_metadata ?? {}
      const { data: empresaId } = await supabase.rpc('bootstrap_empresa', {
        p_nome: meta.name ?? '', p_email: meta.email_contato ?? '',
      })
      if (!empresaId) return
      const [cat, cli] = await Promise.all([
        supabase.from('catalogo_servicos').select('id,nome,preco,condicoes').eq('empresa_id', empresaId).eq('ativo', true),
        supabase.from('clientes').select('id,nome,fone').eq('empresa_id', empresaId).eq('ativo', true),
      ])
      setCatalogo(cat.data ?? [])
      setClientes(cli.data ?? [])
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, carregando])

  async function enviar() {
    const texto = input.trim()
    if (!texto || carregando) return
    if (catalogo.length === 0) {
      alert('Catálogo ainda carregando, aguarde um momento.')
      return
    }

    setMsgs(prev => [...prev, { tipo: 'usuario', texto }])
    setInput('')
    setCarregando(true)

    try {
      const res = await fetch('/api/orcamento-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: texto, catalogo, clientes }),
      })

      if (!res.ok) {
        let errMsg = `Erro ${res.status}`
        try {
          const err = await res.json()
          errMsg = err.error ?? errMsg
        } catch { /* resposta não era JSON */ }
        throw new Error(errMsg)
      }

      const orcamento: OrcamentoIA = await res.json()
      const clienteNome = orcamento.cliente_id
        ? clientes.find(c => c.id === orcamento.cliente_id)?.nome
        : undefined

      setMsgs(prev => [...prev, { tipo: 'orcamento', orcamento, clienteNome }])
    } catch (e: unknown) {
      setMsgs(prev => [...prev, { tipo: 'erro', texto: `Erro ao gerar orçamento: ${e instanceof Error ? e.message : e}` }])
    } finally {
      setCarregando(false)
    }
  }

  function usarOrcamento(orc: OrcamentoIA, clienteNome?: string) {
    const params = new URLSearchParams({
      ia: JSON.stringify({ itens: orc.itens, obs: orc.observacoes, clienteNome: clienteNome ?? '' }),
    })
    router.push(`/ordens?${params}`)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">

      {/* ── Header ────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">Orçamento com IA</p>
          <p className="text-xs text-slate-400">Powered by Groq · llama-3.3-70b</p>
        </div>
      </div>

      {/* ── Mensagens ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
        {msgs.map((msg, i) => {
          if (msg.tipo === 'usuario') return (
            <div key={i} className="flex justify-end">
              <div className="max-w-[78%] bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
                {msg.texto}
              </div>
            </div>
          )

          if (msg.tipo === 'ia' || msg.tipo === 'erro') return (
            <div key={i} className="flex justify-start">
              <div className={cn(
                'max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm',
                msg.tipo === 'erro' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-white text-slate-800',
              )}>
                {msg.texto}
              </div>
            </div>
          )

          if (msg.tipo === 'orcamento' && msg.orcamento) {
            const orc = msg.orcamento
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[90%] bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Header gradiente */}
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                    <Sparkles className="w-4 h-4 text-white shrink-0" />
                    <p className="text-white font-bold text-sm">{orc.resumo}</p>
                  </div>

                  {/* Itens */}
                  <div className="px-4 py-3 space-y-2">
                    {orc.itens.map((item, j) => (
                      <div key={j} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.quantidade}x {item.nome}</p>
                          <p className="text-xs text-slate-400">{item.condicao}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-700 shrink-0">{fmt(item.preco * item.quantidade)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="px-4 pb-3 flex items-center justify-between border-t border-slate-100 pt-2">
                    <p className="text-sm font-bold text-slate-800">Total</p>
                    <p className="text-lg font-extrabold text-indigo-600">{fmt(orc.total)}</p>
                  </div>

                  {/* Obs */}
                  {orc.observacoes && (
                    <p className="px-4 pb-2 text-xs text-slate-400">{orc.observacoes}</p>
                  )}

                  {/* Cliente identificado */}
                  {msg.clienteNome && (
                    <div className="mx-4 mb-3 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <p className="text-xs font-semibold text-indigo-700">Cliente identificado: {msg.clienteNome}</p>
                    </div>
                  )}

                  {/* Não encontrados */}
                  {orc.nao_encontrados.length > 0 && (
                    <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <p className="text-xs font-bold text-amber-700">Não encontrado no catálogo:</p>
                      </div>
                      {orc.nao_encontrados.map((item, j) => (
                        <p key={j} className="text-xs text-amber-700">• {item}</p>
                      ))}
                    </div>
                  )}

                  {/* Botão */}
                  <div className="px-4 pb-4">
                    <button onClick={() => usarOrcamento(orc, msg.clienteNome)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                      Usar este orçamento →
                    </button>
                  </div>
                </div>
              </div>
            )
          }
          return null
        })}

        {/* Digitando... */}
        {carregando && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <p className="text-sm text-slate-400">Gerando orçamento…</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ─────────────────────────────────────── */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 shrink-0">
        <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Descreva o serviço…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder-slate-400 leading-relaxed max-h-32"
            style={{ height: 'auto' }}
          />
          <button onClick={enviar} disabled={!input.trim() || carregando}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-xs text-slate-300 text-center mt-2">Enter para enviar · Shift+Enter para nova linha</p>
      </div>

    </div>
  )
}
