'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Bot, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Config {
  ativo: boolean
  autonomia: number
  nome_bot: string
  tom: number
  dias_atendimento: boolean[]
  horario_inicio: string
  horario_fim: string
  msg_fora_expediente: string
  msg_saudacao: string
  cartao_apresentacao_ativo: boolean
  cartao_apresentacao_texto: string
  pedir_endereco: boolean
  pedir_foto_estofado: boolean
  pedir_foto_mancha: boolean
  enviar_orcamento: boolean
  cobrar_sobretaxa: boolean
  exigir_aprovacao: boolean
  confirmar_24h: boolean
  pedir_avaliacao: boolean
  enviar_pix: boolean
  oferecer_nfse: boolean
  areas_atendimento: string[]
  sobretaxa_pct: number
  modelo_ia: number
}

const DEFAULT: Config = {
  ativo: true, autonomia: 1, nome_bot: 'SofaBot', tom: 1,
  dias_atendimento: [true,true,true,true,true,true,false],
  horario_inicio: '08:00', horario_fim: '18:00',
  msg_fora_expediente: '', msg_saudacao: '',
  cartao_apresentacao_ativo: false, cartao_apresentacao_texto: '',
  pedir_endereco: true, pedir_foto_estofado: true, pedir_foto_mancha: false,
  enviar_orcamento: true, cobrar_sobretaxa: false, exigir_aprovacao: true,
  confirmar_24h: true, pedir_avaliacao: true, enviar_pix: false, oferecer_nfse: false,
  areas_atendimento: [], sobretaxa_pct: 15, modelo_ia: 1,
}

function Section({ label }: { label: string }) {
  return <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-6 mb-2 px-1">{label}</p>
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">{children}</div>
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className={cn('w-11 h-6 rounded-full transition-all duration-200 relative shrink-0', value ? 'bg-blue-600' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200', value ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  )
}

function Divider() { return <div className="h-px bg-slate-100 mx-4" /> }

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-slate-500 bg-slate-50 focus:bg-white transition-colors resize-none leading-relaxed" />
  )
}

function VarChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full hover:bg-blue-100 transition-colors">
      <Plus className="w-3 h-3" />{label}
    </button>
  )
}

function insertVar(val: string, setVal: (v: string) => void, variable: string) {
  setVal(val + variable)
}

export default function SofaBotPage() {
  const [cfg, setCfg] = useState<Config>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState('')
  const [novoBairro, setNovoBairro] = useState('')
  const [addBairro, setAddBairro] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const meta = (await supabase.auth.getUser()).data.user?.user_metadata ?? {}
      const { data: eId } = await supabase.rpc('bootstrap_empresa', { p_nome: meta.name ?? '', p_email: meta.email_contato ?? '' })
      if (!eId) { setLoading(false); return }
      const { data } = await supabase.from('config_sofabot').select('*').eq('empresa_id', eId).single()
      if (data) {
        setCfg({
          ativo: data.ativo ?? true,
          autonomia: data.autonomia ?? 1,
          nome_bot: data.nome_bot ?? 'SofaBot',
          tom: data.tom ?? 1,
          dias_atendimento: data.dias_atendimento ?? DEFAULT.dias_atendimento,
          horario_inicio: data.horario_inicio ?? '08:00',
          horario_fim: data.horario_fim ?? '18:00',
          msg_fora_expediente: data.msg_fora_expediente ?? '',
          msg_saudacao: data.msg_saudacao ?? '',
          cartao_apresentacao_ativo: data.cartao_apresentacao_ativo ?? false,
          cartao_apresentacao_texto: data.cartao_apresentacao_texto ?? '',
          pedir_endereco: data.pedir_endereco ?? true,
          pedir_foto_estofado: data.pedir_foto_estofado ?? true,
          pedir_foto_mancha: data.pedir_foto_mancha ?? false,
          enviar_orcamento: data.enviar_orcamento ?? true,
          cobrar_sobretaxa: data.cobrar_sobretaxa ?? false,
          exigir_aprovacao: data.exigir_aprovacao ?? true,
          confirmar_24h: data.confirmar_24h ?? true,
          pedir_avaliacao: data.pedir_avaliacao ?? true,
          enviar_pix: data.enviar_pix ?? false,
          oferecer_nfse: data.oferecer_nfse ?? false,
          areas_atendimento: data.areas_atendimento ?? [],
          sobretaxa_pct: data.sobretaxa_pct ?? 15,
          modelo_ia: data.modelo_ia ?? 1,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function salvar() {
    setSalvando(true)
    try {
      const supabase = createClient()
      const meta = (await supabase.auth.getUser()).data.user?.user_metadata ?? {}
      const { data: eId } = await supabase.rpc('bootstrap_empresa', { p_nome: meta.name ?? '', p_email: meta.email_contato ?? '' })
      await supabase.from('config_sofabot').upsert({
        empresa_id: eId,
        ativo: cfg.ativo, autonomia: cfg.autonomia, nome_bot: cfg.nome_bot, tom: cfg.tom,
        dias_atendimento: cfg.dias_atendimento, horario_inicio: cfg.horario_inicio, horario_fim: cfg.horario_fim,
        msg_fora_expediente: cfg.msg_fora_expediente, msg_saudacao: cfg.msg_saudacao,
        cartao_apresentacao_ativo: cfg.cartao_apresentacao_ativo, cartao_apresentacao_texto: cfg.cartao_apresentacao_texto,
        pedir_endereco: cfg.pedir_endereco, pedir_foto_estofado: cfg.pedir_foto_estofado, pedir_foto_mancha: cfg.pedir_foto_mancha,
        enviar_orcamento: cfg.enviar_orcamento, cobrar_sobretaxa: cfg.cobrar_sobretaxa, exigir_aprovacao: cfg.exigir_aprovacao,
        confirmar_24h: cfg.confirmar_24h, pedir_avaliacao: cfg.pedir_avaliacao, enviar_pix: cfg.enviar_pix, oferecer_nfse: cfg.oferecer_nfse,
        areas_atendimento: cfg.areas_atendimento, sobretaxa_pct: cfg.sobretaxa_pct, modelo_ia: cfg.modelo_ia,
      }, { onConflict: 'empresa_id' })
      showToast('Configurações salvas!')
    } catch (e) {
      showToast('Erro ao salvar')
    }
    setSalvando(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function set<K extends keyof Config>(k: K, v: Config[K]) {
    setCfg(c => ({ ...c, [k]: v }))
  }

  const DIAS = ['S','T','Q','Q','S','S','D']

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-6 pb-24">
      {/* Status card */}
      <div className={cn('mt-8 rounded-2xl p-5 transition-all', cfg.ativo ? 'bg-gradient-to-br from-[#0D5F3A] to-[#0A4A2D]' : 'bg-gradient-to-br from-slate-700 to-slate-800')}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">SofaBot · WhatsApp</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.ativo ? 'bg-green-400' : 'bg-white/30')} />
              <span className="text-xs text-white/70">{cfg.ativo ? 'Ativo' : 'Pausado'}</span>
            </div>
          </div>
          <button onClick={() => set('ativo', !cfg.ativo)}
            className={cn('w-12 h-7 rounded-full relative transition-all', cfg.ativo ? 'bg-green-400' : 'bg-white/20')}>
            <span className={cn('absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all', cfg.ativo ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>
        <div className="flex mt-4 border-t border-white/10 pt-4">
          {[['142','conversas/mês'],['38','orçamentos'],['27%','conversão']].map(([v,l], i) => (
            <div key={l} className={cn('flex-1 text-center', i > 0 && 'border-l border-white/20')}>
              <p className="text-lg font-bold text-white">{v}</p>
              <p className="text-xs text-white/50">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Autonomia */}
      <Section label="Nível de autonomia" />
      <Card>
        {[
          { v: 0, title: 'Apenas conversar', sub: 'Tira dúvidas, coleta nome e serviço desejado' },
          { v: 1, title: 'Conversar + orçar', sub: 'Envia tabela de preços e agenda visita' },
          { v: 2, title: 'Total autonomia',  sub: 'Fecha pedido, gera OS e confirma pagamento' },
        ].map((o, i) => (
          <div key={o.v}>
            {i > 0 && <Divider />}
            <label className="flex items-center gap-3 px-4 py-3.5 cursor-pointer">
              <input type="radio" checked={cfg.autonomia === o.v} onChange={() => set('autonomia', o.v)}
                className="w-4 h-4 accent-blue-600" />
              <div>
                <p className={cn('text-sm font-medium', cfg.autonomia === o.v ? 'text-blue-600' : 'text-slate-800')}>{o.title}</p>
                <p className="text-xs text-slate-400">{o.sub}</p>
              </div>
            </label>
          </div>
        ))}
      </Card>

      {/* Identidade */}
      <Section label="Identidade e tom de voz" />
      <Card>
        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nome do bot</label>
            <input value={cfg.nome_bot} onChange={e => set('nome_bot', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-slate-500 focus:outline-none transition-colors" />
          </div>
          <Divider />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tom de voz</p>
            <div className="flex gap-2">
              {[{v:0,l:'Profissional'},{v:1,l:'Amigável'},{v:2,l:'Descolado'}].map(t => (
                <button key={t.v} onClick={() => set('tom', t.v)}
                  className={cn('flex-1 py-2 rounded-xl text-xs font-semibold border transition-all', cfg.tom === t.v ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100')}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Horário */}
      <Section label="Horário de atendimento" />
      <Card>
        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dias de atendimento</p>
            <div className="flex gap-1.5">
              {DIAS.map((d, i) => (
                <button key={i} onClick={() => {
                  const novo = [...cfg.dias_atendimento]
                  novo[i] = !novo[i]
                  set('dias_atendimento', novo)
                }}
                  className={cn('flex-1 h-9 rounded-xl text-xs font-bold border transition-all', cfg.dias_atendimento[i] ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100')}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Divider />
          <div className="grid grid-cols-2 gap-3">
            {[{label:'Início',key:'horario_inicio' as const},{label:'Fim',key:'horario_fim' as const}].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                <input type="time" value={cfg[f.key]} onChange={e => set(f.key, e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-slate-500 focus:outline-none transition-colors" />
              </div>
            ))}
          </div>
          <Divider />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mensagem fora do expediente</p>
            <Textarea value={cfg.msg_fora_expediente} onChange={v => set('msg_fora_expediente', v)}
              placeholder="Ex.: Olá! Estamos fora do horário. Atendemos de Seg a Sáb, 8h às 18h..." />
          </div>
        </div>
      </Card>

      {/* Mensagens */}
      <Section label="Mensagens do bot" />
      <Card>
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saudação inicial</p>
          <Textarea value={cfg.msg_saudacao} onChange={v => set('msg_saudacao', v)}
            placeholder="Ex.: Olá, {primeiro_nome}! 👋 Seja bem-vindo ao {nome_negocio}..." />
          <div className="flex flex-wrap gap-1.5">
            {['{primeiro_nome}','{nome_negocio}','{horario_atendimento}'].map(v => (
              <VarChip key={v} label={v} onClick={() => set('msg_saudacao', cfg.msg_saudacao + v)} />
            ))}
          </div>
        </div>
      </Card>

      {/* Cartão de apresentação */}
      <Section label="Cartão de apresentação" />
      <Card>
        <Toggle label="Enviar cartão de boas-vindas" sub="Mensagem especial no primeiro contato do cliente"
          value={cfg.cartao_apresentacao_ativo} onChange={v => set('cartao_apresentacao_ativo', v)} />
        {cfg.cartao_apresentacao_ativo && (
          <>
            <Divider />
            <div className="px-4 py-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Texto do cartão</p>
                <p className="text-xs text-slate-400 mb-2">Use variáveis para personalizar</p>
                <Textarea value={cfg.cartao_apresentacao_texto} onChange={v => set('cartao_apresentacao_texto', v)} placeholder="Ex.: Olá {primeiro_nome}! 🛋️ Aqui é o {nome_negocio}..." />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['{primeiro_nome}','{nome_negocio}','{link_catalogo}'].map(v => (
                  <VarChip key={v} label={v} onClick={() => set('cartao_apresentacao_texto', cfg.cartao_apresentacao_texto + v)} />
                ))}
              </div>
              <div className="bg-blue-50 rounded-xl p-3 flex gap-2 text-xs text-blue-600">
                <span>ℹ️</span>
                <span>O cartão é enviado automaticamente apenas uma vez, no primeiro contato do cliente.</span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* O que pedir */}
      <Section label="O que pedir antes de fechar" />
      <Card>
        <Toggle label="Endereço completo" sub="CEP, rua, número e complemento" value={cfg.pedir_endereco} onChange={v => set('pedir_endereco', v)} />
        <Divider />
        <Toggle label="Foto do estofado" sub="Imagem do móvel a ser limpo" value={cfg.pedir_foto_estofado} onChange={v => set('pedir_foto_estofado', v)} />
        <Divider />
        <Toggle label="Foto da mancha" sub="Imagem específica de manchas ou danos" value={cfg.pedir_foto_mancha} onChange={v => set('pedir_foto_mancha', v)} />
      </Card>

      {/* Preço automático */}
      <Section label="Regras de preço automático" />
      <Card>
        <Toggle label="Enviar orçamento automático" sub="Usa tabela de preços do catálogo" value={cfg.enviar_orcamento} onChange={v => set('enviar_orcamento', v)} />
        <Divider />
        <Toggle label="Cobrar sobretaxa por bairro" sub="Aplica acréscimo em áreas distantes" value={cfg.cobrar_sobretaxa} onChange={v => set('cobrar_sobretaxa', v)} />
        <Divider />
        <Toggle label="Exigir aprovação antes de confirmar" sub="Você aprova o orçamento antes de enviar" value={cfg.exigir_aprovacao} onChange={v => set('exigir_aprovacao', v)} />
      </Card>

      {/* Pós-serviço */}
      <Section label="Pós-serviço" />
      <Card>
        <Toggle label="Confirmar 24h antes" sub="Lembrete automático ao cliente" value={cfg.confirmar_24h} onChange={v => set('confirmar_24h', v)} />
        <Divider />
        <Toggle label="Pedir avaliação após serviço" sub="Link para avaliação no Google" value={cfg.pedir_avaliacao} onChange={v => set('pedir_avaliacao', v)} />
        <Divider />
        <Toggle label="Enviar Pix após conclusão" sub="Chave Pix e valor da OS" value={cfg.enviar_pix} onChange={v => set('enviar_pix', v)} />
        <Divider />
        <Toggle label="Oferecer NFS-e" sub="Nota fiscal de serviço eletrônica" value={cfg.oferecer_nfse} onChange={v => set('oferecer_nfse', v)} />
      </Card>

      {/* Áreas de atendimento */}
      <Section label="Áreas de atendimento" />
      <Card>
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bairros atendidos</p>
          <div className="flex flex-wrap gap-2">
            {cfg.areas_atendimento.map(b => (
              <span key={b} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700">
                {b}
                <button onClick={() => set('areas_atendimento', cfg.areas_atendimento.filter(x => x !== b))} className="text-slate-400 hover:text-slate-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {addBairro ? (
              <div className="flex items-center gap-1.5">
                <input value={novoBairro} onChange={e => setNovoBairro(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && novoBairro.trim()) {
                      set('areas_atendimento', [...cfg.areas_atendimento, novoBairro.trim()])
                      setNovoBairro(''); setAddBairro(false)
                    }
                    if (e.key === 'Escape') { setNovoBairro(''); setAddBairro(false) }
                  }}
                  autoFocus placeholder="Nome do bairro"
                  className="px-3 py-1 border border-blue-400 rounded-full text-xs outline-none bg-blue-50 w-32" />
                <button onClick={() => {
                  if (novoBairro.trim()) set('areas_atendimento', [...cfg.areas_atendimento, novoBairro.trim()])
                  setNovoBairro(''); setAddBairro(false)
                }} className="text-xs text-blue-600 font-semibold">OK</button>
              </div>
            ) : (
              <button onClick={() => setAddBairro(true)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold hover:bg-blue-100 border border-dashed border-blue-300 transition-colors">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            )}
          </div>
          <Divider />
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium text-slate-800">Sobretaxa por deslocamento</p>
              <p className="text-xs text-slate-400">Percentual adicional sobre o total</p>
            </div>
            <div className="relative w-20">
              <input type="number" value={cfg.sobretaxa_pct} onChange={e => set('sobretaxa_pct', Number(e.target.value))} min={0} max={100}
                className="w-full pl-3 pr-6 py-2 border border-slate-200 rounded-xl text-sm text-center font-bold bg-slate-50 focus:bg-white focus:border-slate-500 focus:outline-none" />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Modelo de IA */}
      <Section label="Modelo de linguagem" />
      <Card>
        {[
          { v:0, title:'Rápido',      sub:'Respostas instantâneas · ideal para volume alto', badge:'Haiku',  badgeClass:'bg-slate-100 text-slate-500' },
          { v:1, title:'Equilibrado', sub:'Melhor custo-benefício · recomendado',            badge:'Sonnet', badgeClass:'bg-blue-50 text-blue-600' },
          { v:2, title:'Avançado',    sub:'Máxima inteligência · para casos complexos',      badge:'Opus',   badgeClass:'bg-violet-50 text-violet-600' },
        ].map((o, i) => (
          <div key={o.v}>
            {i > 0 && <Divider />}
            <label className="flex items-center gap-3 px-4 py-3.5 cursor-pointer">
              <input type="radio" checked={cfg.modelo_ia === o.v} onChange={() => set('modelo_ia', o.v)} className="w-4 h-4 accent-blue-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn('text-sm font-medium', cfg.modelo_ia === o.v ? 'text-blue-600' : 'text-slate-800')}>{o.title}</p>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', o.badgeClass)}>{o.badge}</span>
                </div>
                <p className="text-xs text-slate-400">{o.sub}</p>
              </div>
            </label>
          </div>
        ))}
      </Card>

      {/* Integração */}
      <Section label="Integração" />
      <Card>
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
            <span className="text-lg">💬</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">WhatsApp Business</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-400">Conectado</span>
            </div>
          </div>
          <button className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors font-medium">Reconectar</button>
        </div>
      </Card>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 lg:left-52 right-0 bg-white border-t border-slate-100 px-8 py-4 flex gap-3">
        <button className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Testar conversa
        </button>
        <button onClick={salvar} disabled={salvando}
          className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors">
          {salvando ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <span className="text-emerald-400">✓</span> {toast}
        </div>
      )}
    </div>
  )
}
