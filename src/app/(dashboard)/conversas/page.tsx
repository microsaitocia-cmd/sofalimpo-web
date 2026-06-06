'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Bot, User, Send, Phone, RefreshCw, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Conversa {
  id: string
  client_phone: string
  client_name: string | null
  status: string // open | human_takeover | closed | scheduled
  last_message_at: string
  last_message_preview: string | null
  unread_count: number
}

interface Mensagem {
  id: string
  role: string // user | assistant
  content: string
  responded_by: string | null
  created_at: string
}

const statusColor: Record<string, string> = {
  open:            'bg-green-100 text-green-700',
  human_takeover:  'bg-blue-100 text-blue-700',
  scheduled:       'bg-violet-100 text-violet-700',
  closed:          'bg-slate-100 text-slate-500',
}
const statusLabel: Record<string, string> = {
  open:           'IA respondendo',
  human_takeover: 'Você respondendo',
  scheduled:      'Agendado',
  closed:         'Encerrado',
}

function Avatar({ nome, size = 'md' }: { nome: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (nome || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const colors = ['bg-rose-400', 'bg-blue-400', 'bg-emerald-400', 'bg-violet-400', 'bg-orange-400', 'bg-pink-400']
  const color = colors[(nome?.charCodeAt(0) ?? 0) % colors.length]
  const sz = size === 'lg' ? 'w-10 h-10 text-sm' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={cn('rounded-full flex items-center justify-center shrink-0 font-semibold text-white', color, sz)}>
      {initials}
    </div>
  )
}

function fmtTime(d: string) {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function ConversasPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [selecionada, setSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function carregarConversas(uid: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('whatsapp_conversations')
      .select('id, client_phone, client_name, status, last_message_at, last_message_preview, unread_count')
      .eq('user_id', uid)
      .order('last_message_at', { ascending: false })
    setConversas(data ?? [])
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return
      setUserId(user.id)
      await carregarConversas(user.id)
      setLoading(false)
    }
    init()
  }, [])

  // Realtime: atualiza lista de conversas
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase
      .channel('conversas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations', filter: `user_id=eq.${userId}` },
        () => carregarConversas(userId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Carrega mensagens da conversa selecionada
  useEffect(() => {
    if (!selecionada) return
    setLoadingMsgs(true)
    const supabase = createClient()

    // Marca como lida
    supabase.from('whatsapp_conversations').update({ unread_count: 0 }).eq('id', selecionada.id).then(() => {
      if (userId) carregarConversas(userId)
    })

    supabase.from('whatsapp_messages')
      .select('id, role, content, responded_by, created_at')
      .eq('conversation_id', selecionada.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMensagens(data ?? [])
        setLoadingMsgs(false)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })

    // Realtime mensagens
    const sub = supabase
      .channel(`msgs-${selecionada.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `conversation_id=eq.${selecionada.id}` },
        payload => {
          setMensagens(prev => [...prev, payload.new as Mensagem])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [selecionada?.id])

  async function toggleTakeover() {
    if (!selecionada) return
    const supabase = createClient()
    const novoStatus = selecionada.status === 'human_takeover' ? 'open' : 'human_takeover'
    await supabase.from('whatsapp_conversations').update({ status: novoStatus, unread_count: 0 }).eq('id', selecionada.id)
    setSelecionada(prev => prev ? { ...prev, status: novoStatus } : null)
    if (userId) carregarConversas(userId)
  }

  async function enviar() {
    if (!texto.trim() || !selecionada || enviando) return
    setEnviando(true)
    const msg = texto.trim()
    setTexto('')
    const supabase = createClient()
    try {
      await supabase.functions.invoke('send-whatsapp-message', {
        body: { conversation_id: selecionada.id, text: msg }
      })
    } catch {
      // fallback: salva local
      await supabase.from('whatsapp_messages').insert({
        conversation_id: selecionada.id, role: 'assistant',
        content: msg, responded_by: 'human',
      })
    }
    setEnviando(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const isHuman = selecionada?.status === 'human_takeover'

  const filtradas = filtro === 'todas'
    ? conversas
    : filtro === 'ia' ? conversas.filter(c => c.status === 'open')
    : filtro === 'humano' ? conversas.filter(c => c.status === 'human_takeover')
    : conversas.filter(c => c.status === 'closed')

  const tabs = [
    { key: 'todas',  label: 'Todas' },
    { key: 'ia',     label: 'IA ativa' },
    { key: 'humano', label: 'Você' },
    { key: 'closed', label: 'Encerradas' },
  ]

  const totalNaoLidas = conversas.reduce((s, c) => s + (c.unread_count ?? 0), 0)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Lista */}
      <div className={`${selecionada ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 shrink-0 border-r border-slate-100 flex-col bg-white`}>
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Inbox WhatsApp</h2>
            <div className="flex items-center gap-2">
              {totalNaoLidas > 0 && (
                <span className="text-xs bg-[#25D366] text-white rounded-full px-2 py-0.5 font-medium">
                  {totalNaoLidas}
                </span>
              )}
              <button onClick={() => userId && carregarConversas(userId)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setFiltro(t.key)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  filtro === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-px p-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Nenhuma conversa</div>
          ) : filtradas.map(c => (
            <button key={c.id} onClick={() => setSelecionada(c)}
              className={cn('w-full flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50',
                selecionada?.id === c.id && 'bg-slate-50')}>
              <div className="relative">
                <Avatar nome={c.client_name || c.client_phone} />
                {(c.unread_count ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#25D366] rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                    {c.unread_count > 9 ? '9+' : c.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className={cn('text-sm truncate', c.unread_count > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-900')}>
                    {c.client_name || c.client_phone}
                  </p>
                  <span className={cn('text-xs shrink-0', c.unread_count > 0 ? 'text-[#25D366] font-medium' : 'text-slate-400')}>
                    {fmtTime(c.last_message_at)}
                  </span>
                </div>
                <p className="text-slate-400 text-xs truncate">{c.last_message_preview || 'Sem mensagens'}</p>
                <div className="mt-1">
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', statusColor[c.status] ?? 'bg-slate-100 text-slate-500')}>
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      {selecionada ? (
        <div className="flex-1 flex flex-col min-w-0 w-full">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center gap-3 sm:gap-4 bg-white">
            <button onClick={() => setSelecionada(null)} className="sm:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <Avatar nome={selecionada.client_name || selecionada.client_phone} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{selecionada.client_name || selecionada.client_phone}</h3>
                <span className="text-xs bg-[#25D366]/10 text-[#25D366] font-medium px-2 py-0.5 rounded-full">WhatsApp</span>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" />{selecionada.client_phone}
              </span>
            </div>
            {/* Toggle IA / Você */}
            <button onClick={toggleTakeover}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                isHuman ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-green-100 text-green-700 hover:bg-green-200')}>
              {isHuman ? <><User className="w-3.5 h-3.5" />Passar para IA</> : <><Bot className="w-3.5 h-3.5" />Assumir</>}
            </button>
          </div>

          {/* Banner status */}
          <div className={cn('px-5 py-2 flex items-center gap-2 text-xs font-medium text-white',
            isHuman ? 'bg-blue-500' : 'bg-[#25D366]')}>
            {isHuman ? <><User className="w-3.5 h-3.5" />Você está respondendo</> : <><Bot className="w-3.5 h-3.5" />IA respondendo automaticamente</>}
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2 bg-[#f5f3ef]">
            {loadingMsgs ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={cn('h-10 rounded-2xl bg-white/60 animate-pulse w-2/3', i % 2 === 0 ? '' : 'ml-auto')} />
                ))}
              </div>
            ) : mensagens.map(m => {
              const saida = m.role === 'assistant'
              return (
                <div key={m.id} className={cn('flex', saida ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                    saida ? 'bg-[#DCF8C6] text-slate-800 rounded-br-sm shadow-sm' : 'bg-white text-slate-800 shadow-sm rounded-bl-sm')}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {saida && m.responded_by && (
                        <span className="text-[9px] text-slate-400">{m.responded_by === 'ai' ? 'IA' : 'Você'}</span>
                      )}
                      <span className="text-[10px] text-slate-400">{fmtTime(m.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {isHuman ? (
            <div className="px-5 py-4 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2.5 border border-slate-200 focus-within:border-blue-400 transition-colors">
                <input value={texto} onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), enviar())}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none" />
                <button onClick={enviar} disabled={!texto.trim() || enviando}
                  className="w-8 h-8 bg-[#25D366] rounded-xl flex items-center justify-center disabled:opacity-30 hover:bg-[#22c35e] transition-colors shrink-0">
                  {enviando ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3 border-t border-slate-100 bg-white">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
                <Bot className="w-3.5 h-3.5" />
                <span>IA está respondendo. Clique em &quot;Assumir&quot; para responder você mesmo.</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#f5f3ef]">
          <div className="text-center">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Selecione uma conversa</p>
            <p className="text-slate-400 text-xs mt-1">para ver as mensagens</p>
          </div>
        </div>
      )}
    </div>
  )
}
