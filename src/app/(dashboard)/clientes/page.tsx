'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, Plus, Star, Phone, MapPin, X, ClipboardList, CheckCircle, Clock, XCircle, UserCircle, History } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Cliente {
  id: string
  nome: string
  fone: string
  email: string
  bairro: string
  endereco: string
  cep: string
  total_servicos: number
  total_gasto: number
  favorito: boolean
  cor_avatar: string
  ultimo_servico: string | null
}

const CORES = ['#1E5EFF','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16']

function Avatar({ nome, cor, size = 'md' }: { nome: string; cor: string; size?: 'sm'|'md'|'lg' }) {
  const initials = nome.trim().split(' ').filter(Boolean).slice(0,2).map(p => p[0]).join('').toUpperCase() || '?'
  const sz = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={cn('rounded-full flex items-center justify-center shrink-0 font-bold text-white', sz)}
      style={{ backgroundColor: cor || '#1E5EFF' }}>
      {initials}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-slate-500 bg-slate-50 focus:bg-white transition-colors" />
    </div>
  )
}

interface OrdemHistorico {
  id: string
  data_agendamento: string
  itens: { nome: string; preco_unitario: number; quantidade: number }[]
  valor_total: number
  status: string
}

const STATUS_OS: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  orcamento:    { label: 'Orçamento',    icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50' },
  agendado:     { label: 'Agendado',     icon: Clock,         color: 'text-blue-600',   bg: 'bg-blue-50'   },
  'em-andamento': { label: 'Em andamento', icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-50'  },
  concluido:    { label: 'Concluído',    icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50'  },
  cancelado:    { label: 'Cancelado',    icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50'    },
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function ClienteDrawer({ cliente, onClose, onSave, onDelete, initialTab = 'dados' }: {
  cliente: Partial<Cliente> | null
  onClose: () => void
  onSave: (c: Partial<Cliente>) => Promise<void>
  onDelete?: () => Promise<void>
  initialTab?: 'dados' | 'historico'
}) {
  const [form, setForm] = useState<Partial<Cliente>>(cliente ?? { cor_avatar: CORES[0] })
  const [salvando, setSalvando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tab, setTab] = useState<'dados' | 'historico'>(initialTab)
  const [ordens, setOrdens] = useState<OrdemHistorico[]>([])
  const [loadingOrdens, setLoadingOrdens] = useState(false)
  const isNew = !cliente?.id

  const set = (k: keyof Cliente, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (tab !== 'historico' || !cliente?.id) return
    setLoadingOrdens(true)
    const supabase = createClient()
    supabase.from('ordens_servico')
      .select('id, data_agendamento, itens, valor_total, status')
      .eq('cliente_id', cliente.id)
      .order('data_agendamento', { ascending: false })
      .then(({ data }) => { setOrdens(data ?? []); setLoadingOrdens(false) })
  }, [tab, cliente?.id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome?.trim()) return
    setSalvando(true)
    await onSave(form)
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full sm:w-[420px] bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">{isNew ? 'Novo cliente' : form.nome}</h2>
            {!isNew && (
              <div className="flex items-center gap-3 mt-0.5">
                {(cliente?.total_servicos ?? 0) > 0 && (
                  <span className="text-xs text-slate-400">{cliente?.total_servicos} serviços · {fmt(cliente?.total_gasto ?? 0)}</span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Tabs — só para clientes existentes */}
        {!isNew && (
          <div className="flex border-b border-slate-100 px-6">
            {(['dados', 'historico'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors',
                  tab === t ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600')}>
                {t === 'dados' ? 'Dados' : 'Histórico'}
              </button>
            ))}
          </div>
        )}

        {/* Conteúdo */}
        {tab === 'dados' ? (
          <>
            <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="flex items-center gap-4 pb-2">
                <Avatar nome={form.nome || '?'} cor={form.cor_avatar || CORES[0]} size="lg" />
                <div className="flex gap-1.5 flex-wrap">
                  {CORES.map(c => (
                    <button key={c} type="button" onClick={() => set('cor_avatar', c)}
                      className={cn('w-6 h-6 rounded-full border-2 transition-all', form.cor_avatar === c ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Field label="Nome *" value={form.nome || ''} onChange={v => set('nome', v)} placeholder="Nome completo" />
              <Field label="Telefone" value={form.fone || ''} onChange={v => set('fone', v)} placeholder="(11) 99999-9999" />
              <Field label="E-mail" value={form.email || ''} onChange={v => set('email', v)} placeholder="cliente@email.com" type="email" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bairro" value={form.bairro || ''} onChange={v => set('bairro', v)} placeholder="Jardins" />
                <Field label="CEP" value={form.cep || ''} onChange={v => set('cep', v)} placeholder="00000-000" />
              </div>
              <Field label="Endereço" value={form.endereco || ''} onChange={v => set('endereco', v)} placeholder="Rua, número, complemento" />

              {!isNew && onDelete && (
                <div className="pt-2">
                  {!confirmDelete ? (
                    <button type="button" onClick={() => setConfirmDelete(true)} className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors">
                      Remover cliente
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-sm text-red-600 font-medium">Confirmar remoção?</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 px-3 py-1.5 rounded-lg hover:bg-white transition-colors">Cancelar</button>
                        <button type="button" onClick={onDelete} className="text-xs text-white bg-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">Remover</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={submit} disabled={!form.nome?.trim() || salvando}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-slate-800 transition-colors">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loadingOrdens ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : ordens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                  <ClipboardList className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium text-sm">Nenhum serviço ainda</p>
                <p className="text-slate-400 text-xs mt-1">Os serviços deste cliente aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ordens.map(o => {
                  const s = STATUS_OS[o.status] ?? STATUS_OS['agendado']
                  const Icon = s.icon
                  const data = new Date(o.data_agendamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  return (
                    <div key={o.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm text-slate-500">{data}</p>
                          <p className="font-semibold text-slate-900 text-sm mt-0.5">
                            {(o.itens || []).map(i => i.nome).join(' + ') || 'Serviço'}
                          </p>
                        </div>
                        <p className="font-bold text-slate-900">{fmt(o.valor_total)}</p>
                      </div>
                      <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', s.bg, s.color)}>
                        <Icon className="w-3 h-3" />
                        {s.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ClienteRow({ c, onToggleFav, onClick, onClickHistorico }: {
  c: Cliente
  onToggleFav: (c: Cliente, e: React.MouseEvent) => void
  onClick: () => void
  onClickHistorico: (e: React.MouseEvent) => void
}) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
      <Avatar nome={c.nome} cor={c.cor_avatar} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 text-sm truncate">{c.nome}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {c.fone && <span className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{c.fone}</span>}
          {c.bairro && <span className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{c.bairro}</span>}
        </div>
      </div>
      {/* Atalhos de ação */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onClick() }}
          title="Editar dados"
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors text-slate-500">
          <UserCircle className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onClickHistorico(e) }}
          title="Ver histórico"
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-600 flex items-center justify-center transition-colors text-slate-500">
          <History className="w-3.5 h-3.5" />
        </button>
      </div>
      {c.total_servicos > 0 && (
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-slate-700">{c.total_servicos} OS</p>
          <p className="text-xs text-slate-400">{(c.total_gasto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
        </div>
      )}
      <button onClick={e => onToggleFav(c, e)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors shrink-0">
        <Star className={cn('w-4 h-4', c.favorito ? 'fill-amber-400 text-amber-400' : 'text-slate-300 group-hover:text-slate-400')} />
      </button>
    </div>
  )
}

export default function ClientesPage() {
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<Partial<Cliente> | null | false>(false)
  const [selecionado, setSelecionado] = useState<Cliente | null>(null)
  const [drawerTab, setDrawerTab] = useState<'dados' | 'historico'>('dados')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function carregar(eId: string, query = '') {
    const supabase = createClient()
    let q = supabase.from('clientes').select('*').eq('empresa_id', eId).eq('ativo', true)
    if (query.trim()) q = q.or(`nome.ilike.%${query}%,fone.ilike.%${query}%,bairro.ilike.%${query}%`)
    const { data } = await q.order('nome')
    setClientes(data ?? [])
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const meta = (await supabase.auth.getUser()).data.user?.user_metadata ?? {}
      const { data: eId } = await supabase.rpc('bootstrap_empresa', { p_nome: meta.name ?? '', p_email: meta.email_contato ?? '' })
      if (!eId) return
      setEmpresaId(eId)
      await carregar(eId)
      setLoading(false)
    }
    init()
  }, [])

  function handleBusca(v: string) {
    setBusca(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { if (empresaId) carregar(empresaId, v) }, 300)
  }

  async function salvar(form: Partial<Cliente>) {
    if (!empresaId) return
    const supabase = createClient()
    if (!form.id) {
      await supabase.from('clientes').insert({ nome: form.nome, fone: form.fone, email: form.email, bairro: form.bairro, endereco: form.endereco, cep: form.cep, cor_avatar: form.cor_avatar, empresa_id: empresaId })
    } else {
      await supabase.from('clientes').update({ nome: form.nome, fone: form.fone, email: form.email, bairro: form.bairro, endereco: form.endereco, cep: form.cep, cor_avatar: form.cor_avatar }).eq('id', form.id)
    }
    await carregar(empresaId, busca)
    setDrawer(false); setSelecionado(null)
  }

  async function deletar() {
    if (!selecionado || !empresaId) return
    const supabase = createClient()
    await supabase.from('clientes').update({ ativo: false }).eq('id', selecionado.id)
    await carregar(empresaId, busca)
    setDrawer(false); setSelecionado(null)
  }

  async function toggleFavorito(c: Cliente, e: React.MouseEvent) {
    e.stopPropagation()
    const supabase = createClient()
    await supabase.from('clientes').update({ favorito: !c.favorito }).eq('id', c.id)
    setClientes(prev => prev.map(x => x.id === c.id ? { ...x, favorito: !x.favorito } : x))
  }

  const favoritos = clientes.filter(c => c.favorito)
  const outros = clientes.filter(c => !c.favorito)

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
            <p className="text-slate-400 text-sm mt-0.5">{loading ? '...' : `${clientes.length} cadastrados`}</p>
          </div>
          <button onClick={() => { setSelecionado(null); setDrawer({}) }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
            <Plus className="w-4 h-4" /> Novo cliente
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={busca} onChange={e => handleBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou bairro..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-colors" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-2 px-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium text-sm">Nenhum cliente encontrado</p>
            <p className="text-slate-400 text-xs mt-1">Cadastre o primeiro ou ajuste a busca</p>
          </div>
        ) : (
          <>
            {favoritos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">Favoritos</p>
                {favoritos.map(c => <ClienteRow key={c.id} c={c} onToggleFav={toggleFavorito} onClick={() => { setSelecionado(c); setDrawerTab('dados'); setDrawer(c) }} onClickHistorico={() => { setSelecionado(c); setDrawerTab('historico'); setDrawer(c) }} />)}
              </div>
            )}
            {outros.length > 0 && (
              <div>
                {favoritos.length > 0 && <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">Todos</p>}
                {outros.map(c => <ClienteRow key={c.id} c={c} onToggleFav={toggleFavorito} onClick={() => { setSelecionado(c); setDrawerTab('dados'); setDrawer(c) }} onClickHistorico={() => { setSelecionado(c); setDrawerTab('historico'); setDrawer(c) }} />)}
              </div>
            )}
          </>
        )}
      </div>

      {drawer !== false && (
        <ClienteDrawer
          cliente={drawer}
          onClose={() => { setDrawer(false); setSelecionado(null); setDrawerTab('dados') }}
          onSave={salvar}
          onDelete={selecionado ? deletar : undefined}
          initialTab={drawerTab}
        />
      )}
    </div>
  )
}
