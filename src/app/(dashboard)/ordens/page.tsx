'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, X, ChevronLeft, ChevronRight, Check, Copy, MessageSquare, Search, Minus, MapPin, Phone, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────

interface Cliente { id: string; nome: string; fone: string; bairro: string; cor_avatar: string }
interface CatItem { id: string; nome: string; preco: number; icone: string; duracao: string }
interface ItemOs  { catalogo_id: string; nome: string; preco_unitario: number; quantidade: number }
interface Ordem {
  id: string; cliente_id: string; cliente_nome: string
  data_agendamento: string; itens: ItemOs[]; valor_total: number
  status: string; status_pagamento: string; observacoes: string
  metodo_pagamento: string; criado_em: string
}

// ── Constants ─────────────────────────────────────────────────

const STATUS_LABEL: Record<string,string> = {
  agendado: 'Agendado', em_andamento: 'Em andamento',
  concluido: 'Concluído', cancelado: 'Cancelado', rascunho: 'Rascunho',
}
const STATUS_STYLE: Record<string,string> = {
  agendado:    'bg-blue-50 text-blue-700',
  em_andamento:'bg-amber-50 text-amber-700',
  concluido:   'bg-emerald-50 text-emerald-700',
  cancelado:   'bg-red-50 text-red-600',
  rascunho:    'bg-slate-100 text-slate-500',
}
const HORARIOS = ['08:00','09:00','10:30','13:00','14:30','16:00','17:30','19:00']
const MESES    = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const MESES_FULL = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const DIAS_SEM = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// ── Avatar ────────────────────────────────────────────────────

function Avatar({ nome, cor, size='md' }: { nome: string; cor?: string; size?: 'sm'|'md'|'lg' }) {
  const initials = nome.trim().split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase()||'?'
  const colors = ['#1E5EFF','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899']
  const bg = cor || colors[(nome.charCodeAt(0)||0)%colors.length]
  const sz = size==='lg'?'w-12 h-12 text-base':size==='sm'?'w-7 h-7 text-xs':'w-9 h-9 text-sm'
  return <div className={cn('rounded-full flex items-center justify-center shrink-0 font-bold text-white',sz)} style={{backgroundColor:bg}}>{initials}</div>
}

// ── Orçamento Modal ───────────────────────────────────────────

function OrcamentoModal({ ordem, cliente, onClose }: { ordem: Ordem; cliente: Cliente|null; onClose: ()=>void }) {
  const [comData, setComData] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const hoje = new Date()
  const validade = new Date(hoje); validade.setDate(validade.getDate()+7)
  const exec = new Date(ordem.data_agendamento)

  const fmtFull = (d: Date) => `${d.getDate()} de ${MESES_FULL[d.getMonth()]} de ${d.getFullYear()}`

  const texto = [
    'ORÇAMENTO',
    '─────────────────────',
    `Cliente:  ${ordem.cliente_nome}`,
    `Emissão:  ${fmtFull(hoje)}`,
    `Validade: ${fmtFull(validade)}`,
    comData ? `Execução: ${fmtFull(exec)} · ${exec.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}` : null,
    '─────────────────────',
    ...(ordem.itens||[]).map(i => `${i.nome} (${i.quantidade}x)  ${fmt(i.preco_unitario * i.quantidade)}`),
    '─────────────────────',
    `TOTAL:   ${fmt(ordem.valor_total)}`,
  ].filter(Boolean).join('\n')

  function copiar() {
    navigator.clipboard.writeText(texto)
    setCopiado(true); setTimeout(()=>setCopiado(false),2000)
  }

  function whatsapp() {
    const fone = cliente?.fone.replace(/\D/g,'') || ''
    const numero = fone.length===11 ? `55${fone}` : fone
    const hora = exec.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
    const diaFmt = `${DIAS_SEM[(exec.getDay()+6)%7]}, ${exec.getDate()} de ${MESES_FULL[exec.getMonth()]}`
    const linhas = (ordem.itens||[]).map(i=>`• ${i.nome} x${i.quantidade} — ${fmt(i.preco_unitario*i.quantidade)}`).join('\n')
    const msg = encodeURIComponent(`Olá ${ordem.cliente_nome}! 👋\n\nConfirmamos seu agendamento:\n📅 ${diaFmt} · ${hora}\n📍 ${cliente?.bairro||'a combinar'}\n\nServiços:\n${linhas}\n\n💰 Total: ${fmt(ordem.valor_total)}\n\nQualquer dúvida, só chamar!`)
    window.open(`https://wa.me/${numero}?text=${msg}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-lg">Orçamento</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <button onClick={()=>setComData(!comData)}
          className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 transition-all text-sm font-medium',
            comData ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600')}>
          <Calendar className="w-4 h-4" />
          <span className="flex-1 text-left">Incluir data de execução</span>
          <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all', comData ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}>
            {comData && <Check className="w-3 h-3 text-white" />}
          </div>
        </button>

        <pre className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">{texto}</pre>

        <div className="flex gap-3">
          <button onClick={copiar}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors">
            {copiado ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copiado ? 'Copiado!' : 'Copiar'}
          </button>
          <button onClick={whatsapp}
            className="flex-1 py-3 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#22c35e] flex items-center justify-center gap-2 transition-colors">
            <MessageSquare className="w-4 h-4" />WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}

// ── OS Detail Drawer ──────────────────────────────────────────

function OsDrawer({ ordem, clientes, onClose, onStatusChange, onOrcamento }: {
  ordem: Ordem; clientes: Cliente[]
  onClose: ()=>void
  onStatusChange: (id: string, status: string) => Promise<void>
  onOrcamento: ()=>void
}) {
  const cliente = clientes.find(c=>c.id===ordem.cliente_id)||null
  const [mudando, setMudando] = useState(false)
  const exec = new Date(ordem.data_agendamento)

  async function mudarStatus(s: string) {
    setMudando(true); await onStatusChange(ordem.id, s); setMudando(false)
  }

  const nextStatus: Record<string,{label:string;status:string;color:string}> = {
    agendado:    { label:'Iniciar serviço',  status:'em_andamento', color:'bg-amber-500 text-white' },
    em_andamento:{ label:'Marcar concluído', status:'concluido',    color:'bg-emerald-500 text-white' },
  }
  const next = nextStatus[ordem.status]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[480px] bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          {cliente && <Avatar nome={cliente.nome} cor={cliente.cor_avatar} size="lg" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 truncate">{ordem.cliente_nome}</h2>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0', STATUS_STYLE[ordem.status])}>
                {STATUS_LABEL[ordem.status]}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
              {cliente?.fone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/>{cliente.fone}</span>}
              {cliente?.bairro && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{cliente.bairro}</span>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 flex-1">
          {/* Data */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {DIAS_SEM[(exec.getDay()+6)%7]}, {exec.getDate()} de {MESES_FULL[exec.getMonth()]} · {exec.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
              </p>
              {ordem.observacoes && <p className="text-xs text-slate-400 mt-0.5">{ordem.observacoes}</p>}
            </div>
          </div>

          {/* Itens */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Serviços</p>
            <div className="space-y-2">
              {(ordem.itens||[]).map((item,i)=>(
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.nome}</p>
                    <p className="text-xs text-slate-400">{item.quantidade}× · {fmt(item.preco_unitario)} cada</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{fmt(item.preco_unitario*item.quantidade)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 mt-1">
              <p className="text-sm font-bold text-slate-900">Total</p>
              <p className="text-xl font-bold text-slate-900">{fmt(ordem.valor_total)}</p>
            </div>
          </div>

          {/* Pagamento */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Pagamento</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5 capitalize">{ordem.metodo_pagamento}</p>
            </div>
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full',
              ordem.status_pagamento==='pago' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
              {ordem.status_pagamento==='pago' ? 'Pago' : 'Pendente'}
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="px-6 py-4 border-t border-slate-100 space-y-2">
          {next && (
            <button onClick={()=>mudarStatus(next.status)} disabled={mudando}
              className={cn('w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50', next.color)}>
              {mudando ? 'Atualizando...' : next.label}
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onOrcamento}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors">
              <Copy className="w-4 h-4" />Orçamento
            </button>
            {ordem.status === 'agendado' && (
              <button onClick={()=>mudarStatus('cancelado')}
                className="flex-1 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
                Cancelar OS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Nova OS Wizard ────────────────────────────────────────────

interface WizardState {
  step: number
  cliente: Cliente | null
  itens: Record<string, number>
  dia: Date
  horaIdx: number
  obs: string
  lembrete: boolean
}

function NovaOsModal({ clientes, catalogo, empresaId, onClose, onSaved }: {
  clientes: Cliente[]; catalogo: CatItem[]; empresaId: string
  onClose: ()=>void; onSaved: (os: Ordem)=>void
}) {
  const [w, setW] = useState<WizardState>({
    step: 0, cliente: null, itens: {},
    dia: new Date(Date.now()+3*86400000), horaIdx: 1, obs: '', lembrete: true,
  })
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmado, setConfirmado] = useState<Ordem|null>(null)
  const [showOrcamento, setShowOrcamento] = useState(false)

  const subtotal = Object.entries(w.itens).reduce((s,[id,qty])=>{
    const cat = catalogo.find(c=>c.id===id); return s+(cat?.preco||0)*qty
  },0)
  const desconto = subtotal > 500 ? 30 : 0
  const total = subtotal - desconto
  const qtdTotal = Object.values(w.itens).reduce((s,v)=>s+v,0)

  const clientesFiltrados = busca.trim()
    ? clientes.filter(c=>c.nome.toLowerCase().includes(busca.toLowerCase())||c.fone.includes(busca)||c.bairro.toLowerCase().includes(busca.toLowerCase()))
    : clientes

  function addItem(id: string) { setW(p=>({...p,itens:{...p.itens,[id]:(p.itens[id]||0)+1}})) }
  function subItem(id: string) { setW(p=>{ const n=(p.itens[id]||0)-1; const itens={...p.itens}; if(n<=0)delete itens[id]; else itens[id]=n; return {...p,itens} }) }

  const canAdvance = w.step===0 ? !!w.cliente : w.step===1 ? qtdTotal>0 : true
  const steps = ['Cliente','Serviços','Quando','Resumo']

  async function salvar() {
    if(!w.cliente) return
    setSalvando(true)
    const supabase = createClient()
    const exec = new Date(w.dia)
    const partes = HORARIOS[w.horaIdx].split(':')
    exec.setHours(+partes[0], +partes[1], 0)

    const itensOs: ItemOs[] = Object.entries(w.itens).map(([id,qty])=>{
      const cat = catalogo.find(c=>c.id===id)!
      return { catalogo_id: id, nome: cat.nome, preco_unitario: cat.preco, quantidade: qty }
    })

    const { data, error } = await supabase.from('ordens_servico').insert({
      empresa_id: empresaId,
      cliente_id: w.cliente.id,
      cliente_nome: w.cliente.nome,
      data_agendamento: exec.toISOString(),
      itens: itensOs,
      valor_total: total,
      status: 'agendado',
      status_pagamento: 'pendente',
      observacoes: w.obs,
      metodo_pagamento: 'pix',
    }).select().single()

    setSalvando(false)
    if(!error && data) { setConfirmado(data as Ordem) }
  }

  if (confirmado) return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">OS criada com sucesso!</h3>
          <p className="text-slate-500 text-sm mb-6">{confirmado.cliente_nome} · {fmt(total)}</p>
          <div className="flex gap-3">
            <button onClick={()=>setShowOrcamento(true)}
              className="flex-1 py-3 border border-blue-200 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors">
              <Copy className="w-4 h-4" />Orçamento
            </button>
            <button onClick={()=>{ onSaved(confirmado); onClose() }}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              Ver agenda
            </button>
          </div>
        </div>
      </div>
      {showOrcamento && w.cliente && (
        <OrcamentoModal ordem={confirmado} cliente={w.cliente} onClose={()=>setShowOrcamento(false)} />
      )}
    </>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 shrink-0">
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
          <X className="w-4 h-4 text-slate-500" />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">Novo agendamento</p>
          <p className="text-xs text-slate-400">Etapa {w.step+1} de {steps.length} · {
            ['Quem é o cliente?','O que vamos limpar?','Quando?','Confirme o agendamento'][w.step]
          }</p>
        </div>
        <div className="flex gap-1">
          {steps.map((_,i)=>(
            <div key={i} className={cn('h-1 rounded-full transition-all', i<=w.step?'bg-blue-600 w-8':'bg-slate-200 w-4')} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Step 0: Cliente */}
        {w.step===0 && (
          <div className="p-6 space-y-4 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={busca} onChange={e=>setBusca(e.target.value)}
                placeholder="Buscar cliente por nome, telefone ou bairro..."
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {busca ? 'RESULTADOS' : 'CLIENTES'}
            </p>
            <div className="space-y-2">
              {clientesFiltrados.map(c=>(
                <button key={c.id} onClick={()=>setW(p=>({...p,cliente:c}))}
                  className={cn('w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    w.cliente?.id===c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
                  <Avatar nome={c.nome} cor={c.cor_avatar} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{c.nome}</p>
                    <p className="text-xs text-slate-400">{[c.fone,c.bairro].filter(Boolean).join(' · ')}</p>
                  </div>
                  {w.cliente?.id===c.id && <Check className="w-5 h-5 text-blue-600 shrink-0" />}
                </button>
              ))}
              {clientesFiltrados.length===0 && (
                <p className="text-center text-slate-400 text-sm py-8">
                  {busca ? `Nenhum resultado para "${busca}"` : 'Nenhum cliente cadastrado'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Serviços */}
        {w.step===1 && (
          <div className="p-6 max-w-2xl mx-auto">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">SERVIÇOS</p>
            <div className="space-y-2 mb-20">
              {catalogo.map(cat=>{
                const qty = w.itens[cat.id]||0
                return (
                  <div key={cat.id} className={cn('flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                    qty>0 ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white')}>
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl',
                      qty>0 ? 'bg-blue-100' : 'bg-slate-100')}>
                      {cat.icone==='sofa'?'🛋️':cat.icone==='mattress'?'🛏️':cat.icone==='chair'?'🪑':cat.icone==='car'?'🚗':'🧹'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{cat.nome}</p>
                      <p className="text-xs text-slate-500">{fmt(cat.preco)} · {cat.duracao}</p>
                    </div>
                    {qty===0 ? (
                      <button onClick={()=>addItem(cat.id)}
                        className="w-9 h-9 rounded-full border-2 border-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors">
                        <Plus className="w-4 h-4 text-blue-500" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-white rounded-xl px-2 py-1 border border-blue-200">
                        <button onClick={()=>subItem(cat.id)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                          <Minus className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <span className="text-sm font-bold text-blue-700 w-5 text-center">{qty}</span>
                        <button onClick={()=>addItem(cat.id)} className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center hover:bg-blue-700">
                          <Plus className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {qtdTotal>0 && (
              <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-6 w-80">
                <div>
                  <p className="text-xs text-white/50 font-semibold uppercase tracking-wide">Selecionado</p>
                  <p className="text-sm text-white">{qtdTotal} {qtdTotal===1?'item':'itens'}</p>
                </div>
                <p className="text-2xl font-bold ml-auto">{fmt(subtotal)}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Quando */}
        {w.step===2 && (
          <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">DATA</p>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({length:7},(_,i)=>new Date(Date.now()+(i+1)*86400000)).map((d,i)=>{
                  const sel = d.toDateString()===w.dia.toDateString()
                  return (
                    <button key={i} onClick={()=>setW(p=>({...p,dia:d}))}
                      className={cn('py-3 rounded-xl flex flex-col items-center gap-1 border-2 transition-all',
                        sel ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200' : 'bg-white border-slate-200 hover:border-slate-300')}>
                      <span className={cn('text-[10px] font-bold uppercase', sel?'text-white/70':'text-slate-400')}>{DIAS_SEM[(d.getDay()+6)%7]}</span>
                      <span className={cn('text-xl font-bold', sel?'text-white':'text-slate-900')}>{d.getDate()}</span>
                      <span className={cn('text-[10px]', sel?'text-white/70':'text-slate-400')}>{MESES[d.getMonth()]}</span>
                    </button>
                  )
                })}
                <button onClick={async()=>{
                  const d = prompt('Data (DD/MM/AAAA):')
                  if(d){ const p=d.split('/'); const date=new Date(+p[2],+p[1]-1,+p[0]); if(!isNaN(date.getTime())) setW(pr=>({...pr,dia:date})) }
                }}
                  className="py-3 rounded-xl flex flex-col items-center gap-1 border-2 border-dashed border-slate-200 hover:border-slate-300 text-slate-400">
                  <Calendar className="w-5 h-5" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Outra<br/>data</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">HORÁRIO</p>
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS.map((h,i)=>{
                  const sel=i===w.horaIdx
                  return (
                    <button key={h} onClick={()=>setW(p=>({...p,horaIdx:i}))}
                      className={cn('py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                        sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300')}>
                      {h}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">OBSERVAÇÕES</p>
              <textarea value={w.obs} onChange={e=>setW(p=>({...p,obs:e.target.value}))} rows={3}
                placeholder="Acesso pelo elevador, cão na casa..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none resize-none" />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">Lembrete automático</p>
                <p className="text-xs text-blue-600">WhatsApp 24h antes confirmando o horário.</p>
              </div>
              <button onClick={()=>setW(p=>({...p,lembrete:!p.lembrete}))}
                className={cn('w-11 h-6 rounded-full relative transition-all', w.lembrete?'bg-blue-600':'bg-slate-300')}>
                <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', w.lembrete?'left-[22px]':'left-0.5')} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Resumo */}
        {w.step===3 && w.cliente && (
          <div className="p-6 max-w-2xl mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Avatar nome={w.cliente.nome} cor={w.cliente.cor_avatar} size="lg" />
                <div>
                  <p className="font-bold text-slate-900">{w.cliente.nome}</p>
                  <p className="text-sm text-slate-400">{w.cliente.fone}</p>
                </div>
              </div>
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold">{DIAS_SEM[(w.dia.getDay()+6)%7]}, {w.dia.getDate()} de {MESES_FULL[w.dia.getMonth()]} · {HORARIOS[w.horaIdx]}</span>
                </div>
                {w.cliente.bairro && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{w.cliente.bairro}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">ITENS</p>
              {Object.entries(w.itens).map(([id,qty])=>{
                const cat=catalogo.find(c=>c.id===id)!
                return (
                  <div key={id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icone==='sofa'?'🛋️':cat.icone==='mattress'?'🛏️':cat.icone==='chair'?'🪑':'🧹'}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{cat.nome}</p>
                        <p className="text-xs text-slate-400">{qty}× · {cat.duracao}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{fmt(cat.preco*qty)}</p>
                  </div>
                )
              })}
              <div className="pt-3 mt-1 space-y-1.5">
                {desconto>0 && <>
                  <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                  <div className="flex justify-between text-sm text-emerald-600 font-medium"><span>Desconto fidelidade</span><span>− {fmt(desconto)}</span></div>
                </>}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Total</span><span className="text-xl">{fmt(total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-2 text-sm text-emerald-700">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Tudo certo! Confirme o agendamento e depois envie por WhatsApp ou gere o orçamento.</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
        {w.step>0 && (
          <button onClick={()=>setW(p=>({...p,step:p.step-1}))}
            className="py-3 px-5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
            <ChevronLeft className="w-4 h-4" />Voltar
          </button>
        )}
        <button onClick={()=>{ if(w.step<3) setW(p=>({...p,step:p.step+1})); else salvar() }}
          disabled={!canAdvance||salvando}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
          {w.step<3 ? <>Continuar<ChevronRight className="w-4 h-4"/></> : salvando ? 'Salvando...' : <><Check className="w-4 h-4"/>Confirmar agendamento</>}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

const TABS = [
  { key:'todas',       label:'Todas'        },
  { key:'agendado',    label:'Agendadas'    },
  { key:'em_andamento',label:'Em andamento' },
  { key:'concluido',   label:'Concluídas'   },
  { key:'cancelado',   label:'Canceladas'   },
]

export default function OrdensPage() {
  const [empresaId, setEmpresaId] = useState<string|null>(null)
  const [ordens,   setOrdens]   = useState<Ordem[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [catalogo, setCatalogo] = useState<CatItem[]>([])
  const [filtro,   setFiltro]   = useState('todas')
  const [loading,  setLoading]  = useState(true)
  const [novaOs,   setNovaOs]   = useState(false)
  const [detalhe,  setDetalhe]  = useState<Ordem|null>(null)
  const [showOrc,  setShowOrc]  = useState(false)

  const carregar = useCallback(async (eId: string) => {
    const supabase = createClient()
    const [{ data: os }, { data: cl }, { data: cat }] = await Promise.all([
      supabase.from('ordens_servico').select('*').eq('empresa_id',eId).order('data_agendamento',{ascending:false}),
      supabase.from('clientes').select('id,nome,fone,bairro,cor_avatar').eq('empresa_id',eId).eq('ativo',true).order('nome'),
      supabase.from('catalogo_servicos').select('id,nome,preco,icone,duracao').eq('empresa_id',eId).eq('ativo',true).order('nome'),
    ])
    setOrdens(os ?? [])
    setClientes(cl ?? [])
    setCatalogo(cat ?? [])
  }, [])

  useEffect(()=>{
    async function init() {
      const supabase = createClient()
      const meta = (await supabase.auth.getUser()).data.user?.user_metadata??{}
      const {data:eId} = await supabase.rpc('bootstrap_empresa',{p_nome:meta.name??'',p_email:meta.email_contato??''})
      if(!eId) { setLoading(false); return }
      setEmpresaId(eId)
      await carregar(eId)
      setLoading(false)
    }
    init()
  },[carregar])

  async function mudarStatus(id: string, status: string) {
    const supabase = createClient()
    const update: Record<string,unknown> = { status }
    if (status==='concluido') update.data_conclusao = new Date().toISOString()
    await supabase.from('ordens_servico').update(update).eq('id',id)
    if(empresaId) await carregar(empresaId)
    setDetalhe(prev=>prev?.id===id ? {...prev,status} : prev)
  }

  const filtradas = filtro==='todas' ? ordens : ordens.filter(o=>o.status===filtro)
  const clienteDetalhe = detalhe ? clientes.find(c=>c.id===detalhe.cliente_id)||null : null
  const fmtData = (d: string) => {
    const dt=new Date(d)
    return `${DIAS_SEM[(dt.getDay()+6)%7]} ${dt.getDate()}/${String(dt.getMonth()+1).padStart(2,'0')} · ${dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-0 border-b border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Ordens de Serviço</h1>
            <p className="text-slate-400 text-sm mt-0.5">{loading?'...': `${ordens.length} ordens no total`}</p>
          </div>
          <button onClick={()=>setNovaOs(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />Nova OS
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setFiltro(t.key)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                filtro===t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              {t.label}
              {t.key!=='todas' && (
                <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full', filtro===t.key?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-500')}>
                  {ordens.filter(o=>o.status===t.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
        ) : filtradas.length===0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium text-sm">Nenhuma ordem {filtro!=='todas'&&STATUS_LABEL[filtro]?.toLowerCase()}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map(o=>{
              const cliente = clientes.find(c=>c.id===o.cliente_id)
              return (
                <button key={o.id} onClick={()=>setDetalhe(o)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                  {cliente ? <Avatar nome={cliente.nome} cor={cliente.cor_avatar} /> :
                    <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{o.cliente_nome}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {(o.itens||[]).map(i=>i.nome).join(', ')||'Sem serviços'} · {fmtData(o.data_agendamento)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {o.valor_total>0 && <span className="text-sm font-semibold text-slate-700">{fmt(o.valor_total)}</span>}
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[o.status])}>
                      {STATUS_LABEL[o.status]}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {detalhe && (
        <OsDrawer
          ordem={detalhe} clientes={clientes}
          onClose={()=>setDetalhe(null)}
          onStatusChange={mudarStatus}
          onOrcamento={()=>setShowOrc(true)}
        />
      )}

      {showOrc && detalhe && (
        <OrcamentoModal ordem={detalhe} cliente={clienteDetalhe} onClose={()=>setShowOrc(false)} />
      )}

      {novaOs && empresaId && (
        <NovaOsModal
          clientes={clientes} catalogo={catalogo} empresaId={empresaId}
          onClose={()=>setNovaOs(false)}
          onSaved={os=>{ setOrdens(prev=>[os,...prev]); setNovaOs(false) }}
        />
      )}
    </div>
  )
}
