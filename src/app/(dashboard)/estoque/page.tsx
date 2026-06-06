'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, AlertTriangle, X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Produto {
  id: string
  nome: string
  marca: string
  categoria: string
  quantidade_atual: number
  quantidade_minima: number
  uso_por_mes: number
  preco_unit: number
  ativo: boolean
}

function status(p: Produto) {
  if (p.quantidade_atual <= 0) return 'esgotado'
  if (p.quantidade_atual < p.quantidade_minima) return 'baixo'
  return 'ok'
}

const statusMap = {
  esgotado: { label: 'Esgotado',      bg: 'bg-red-50',    text: 'text-red-600',    bar: 'bg-red-400' },
  baixo:    { label: 'Estoque baixo', bg: 'bg-amber-50',  text: 'text-amber-600',  bar: 'bg-amber-400' },
  ok:       { label: 'Em estoque',    bg: 'bg-emerald-50',text: 'text-emerald-600',bar: 'bg-emerald-500' },
}

function Field({ label, value, onChange, placeholder, type = 'text', className = '' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-slate-500 bg-slate-50 focus:bg-white transition-colors" />
    </div>
  )
}

function NumField({ label, value, onChange, suffix }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={0}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-slate-500 bg-slate-50 focus:bg-white transition-colors" />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>}
      </div>
    </div>
  )
}

function ProdutoDrawer({ produto, onClose, onSave, onDelete }: {
  produto: Partial<Produto> | null
  onClose: () => void
  onSave: (p: Partial<Produto>) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [form, setForm] = useState<Partial<Produto>>(produto ?? { quantidade_atual: 0, quantidade_minima: 1, uso_por_mes: 0, preco_unit: 0 })
  const [salvando, setSalvando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isNew = !produto?.id

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
      <div className="w-[440px] bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">{isNew ? 'Novo produto' : 'Editar produto'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{isNew ? 'Cadastrar no estoque' : form.nome}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Nome do produto *" value={form.nome || ''} onChange={v => setForm(f => ({...f, nome: v}))} placeholder="Ex.: Detergente neutro 5L" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca" value={form.marca || ''} onChange={v => setForm(f => ({...f, marca: v}))} placeholder="Ex.: CleanBR" />
            <Field label="Categoria" value={form.categoria || ''} onChange={v => setForm(f => ({...f, categoria: v}))} placeholder="Ex.: Detergente" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Qtde atual" value={form.quantidade_atual ?? 0} onChange={v => setForm(f => ({...f, quantidade_atual: v}))} />
            <NumField label="Qtde mínima" value={form.quantidade_minima ?? 1} onChange={v => setForm(f => ({...f, quantidade_minima: v}))} />
            <NumField label="Uso/mês" value={form.uso_por_mes ?? 0} onChange={v => setForm(f => ({...f, uso_por_mes: v}))} />
          </div>
          <NumField label="Preço unitário (R$)" value={form.preco_unit ?? 0} onChange={v => setForm(f => ({...f, preco_unit: v}))} suffix="R$" />

          {!isNew && onDelete && (
            <div className="pt-2">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-red-500 text-sm font-medium hover:text-red-600">
                  Remover produto
                </button>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-red-600 font-medium">Confirmar remoção?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 px-3 py-1.5 rounded-lg">Cancelar</button>
                    <button type="button" onClick={onDelete} className="text-xs text-white bg-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600">Remover</button>
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
      </div>
    </div>
  )
}

function ReporModal({ produto, onClose, onConfirm }: {
  produto: Produto; onClose: () => void; onConfirm: (qtd: number) => Promise<void>
}) {
  const [qtd, setQtd] = useState(1)
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    setSalvando(true)
    await onConfirm(qtd)
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
        <h3 className="font-semibold text-slate-900 mb-1">Repor estoque</h3>
        <p className="text-sm text-slate-500 mb-5">{produto.nome} · atual: <strong>{produto.quantidade_atual}</strong></p>
        <div className="flex items-center justify-center gap-5 mb-6">
          <button onClick={() => setQtd(q => Math.max(1, q - 1))}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <Minus className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-3xl font-bold text-slate-900 w-12 text-center">{qtd}</span>
          <button onClick={() => setQtd(q => q + 1)}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <Plus className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={salvando}
            className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors">
            {salvando ? '...' : 'Repor'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EstoquePage() {
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<Partial<Produto> | false>(false)
  const [selecionado, setSelecionado] = useState<Produto | null>(null)
  const [reporProduto, setReporProduto] = useState<Produto | null>(null)

  async function carregar(eId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('estoque_produtos').select('*').eq('empresa_id', eId).eq('ativo', true).order('nome')
    setProdutos(data ?? [])
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

  async function salvar(form: Partial<Produto>) {
    if (!empresaId) return
    const supabase = createClient()
    if (!form.id) {
      await supabase.from('estoque_produtos').insert({ ...form, empresa_id: empresaId, ativo: true })
    } else {
      const { id, ...rest } = form
      await supabase.from('estoque_produtos').update(rest).eq('id', id)
    }
    await carregar(empresaId)
    setDrawer(false); setSelecionado(null)
  }

  async function deletar() {
    if (!selecionado || !empresaId) return
    const supabase = createClient()
    await supabase.from('estoque_produtos').update({ ativo: false }).eq('id', selecionado.id)
    await carregar(empresaId)
    setDrawer(false); setSelecionado(null)
  }

  async function ajustar(id: string, delta: number) {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, quantidade_atual: Math.max(0, p.quantidade_atual + delta) } : p))
    const supabase = createClient()
    try {
      await supabase.rpc('ajustar_estoque', { p_id: id, p_delta: delta })
    } catch {
      if (empresaId) await carregar(empresaId)
    }
  }

  async function repor(qtd: number) {
    if (!reporProduto) return
    await ajustar(reporProduto.id, qtd)
    setReporProduto(null)
  }

  const filtrados = filtro === 'criticos'
    ? produtos.filter(p => status(p) !== 'ok')
    : filtro === 'em_estoque'
    ? produtos.filter(p => status(p) === 'ok')
    : produtos

  const emAlerta = produtos.filter(p => status(p) !== 'ok').length
  const esgotados = produtos.filter(p => status(p) === 'esgotado').length
  const custoMes = produtos.reduce((s, p) => s + p.preco_unit * p.uso_por_mes, 0)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Estoque de produtos</h1>
            <p className={cn('text-sm mt-0.5', emAlerta > 0 ? 'text-amber-600 font-medium' : 'text-slate-400')}>
              {emAlerta > 0 ? `${emAlerta} ${emAlerta === 1 ? 'item precisa' : 'itens precisam'} de reposição` : 'Tudo em ordem'}
            </p>
          </div>
          <button onClick={() => { setSelecionado(null); setDrawer({}) }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
            <Plus className="w-4 h-4" /> Novo produto
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-5">
        {/* Alert */}
        {emAlerta > 0 && (
          <div className="bg-white border border-red-200 rounded-2xl p-4 flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-600">
                Atenção: {esgotados > 0 ? `${esgotados} ${esgotados === 1 ? 'item esgotado' : 'itens esgotados'}` : ''}{esgotados > 0 && emAlerta - esgotados > 0 ? ', ' : ''}{emAlerta - esgotados > 0 ? `${emAlerta - esgotados} em nível crítico` : ''}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Pode atrapalhar serviços agendados. Use "+ Repor" para registrar a compra.</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: `${produtos.length}`, label: 'Itens', highlight: false },
            { value: `${emAlerta}`, label: 'Em alerta', highlight: emAlerta > 0 },
            { value: fmt(custoMes), label: 'Custo mês', highlight: false },
          ].map(s => (
            <div key={s.label} className={cn('rounded-2xl p-4 text-center', s.highlight ? 'bg-amber-50' : 'bg-white border border-slate-100')}>
              <p className={cn('text-2xl font-bold', s.highlight ? 'text-amber-600' : 'text-slate-900')}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {[
            { key: 'todos', label: `Todos · ${produtos.length}` },
            { key: 'criticos', label: `Críticos · ${emAlerta}` },
            { key: 'em_estoque', label: 'Em estoque' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={cn('px-4 py-1.5 rounded-full text-xs font-semibold transition-colors', filtro === f.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {filtro === 'todos' ? 'Nenhum produto cadastrado' : 'Nenhum produto neste filtro'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map(p => {
              const st = status(p)
              const sm = statusMap[st]
              const max = Math.max(p.quantidade_minima * 2, p.quantidade_atual, 1)
              const pct = Math.min((p.quantidade_atual / max) * 100, 100)

              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <span className="text-lg">🧴</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{p.nome}</p>
                      <p className="text-xs text-slate-400">{[p.marca, p.categoria].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', sm.bg, sm.text)}>{sm.label}</span>
                  </div>

                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-bold text-slate-900">{p.quantidade_atual} <span className="text-sm font-normal text-slate-400">un</span></span>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>Mínimo: {p.quantidade_minima}</span>
                      <span>Uso: {p.uso_por_mes}/mês</span>
                      {p.preco_unit > 0 && <span>R$ {p.preco_unit.toFixed(2)}</span>}
                    </div>
                  </div>

                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div className={cn('h-full rounded-full transition-all', sm.bar)} style={{ width: `${pct}%` }} />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setReporProduto(p)}
                      className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Repor
                    </button>
                    <button onClick={() => ajustar(p.id, -1)} disabled={p.quantidade_atual <= 0}
                      className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30">
                      <Minus className="w-3.5 h-3.5" /> Registrar uso (−1)
                    </button>
                    <button onClick={() => { setSelecionado(p); setDrawer(p) }}
                      className="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-700 text-lg leading-none">
                      ···
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {drawer !== false && (
        <ProdutoDrawer
          produto={drawer}
          onClose={() => { setDrawer(false); setSelecionado(null) }}
          onSave={salvar}
          onDelete={selecionado ? deletar : undefined}
        />
      )}

      {reporProduto && (
        <ReporModal produto={reporProduto} onClose={() => setReporProduto(null)} onConfirm={repor} />
      )}
    </div>
  )
}
