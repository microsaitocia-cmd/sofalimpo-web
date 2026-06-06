'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Camera, Shuffle, CheckCircle, Settings2 } from 'lucide-react'

interface WhatsappConfig {
  id: string
  quote_model: string
  ai_tone: string
  business_name: string | null
  ai_schedule: string | null
  ai_instructions: string | null
  active: boolean
}

const QUOTE_MODELS = [
  {
    id: 'fixed',
    label: 'Preço fixo por tipo',
    desc: 'Cota pelo catálogo sem precisar de foto. Ideal para tabela de preços padrão.',
    icon: Settings2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    id: 'photo_first',
    label: 'Foto obrigatória',
    desc: 'Pede foto antes de dar qualquer orçamento. Ideal quando a condição visual define o preço.',
    icon: Camera,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    id: 'hybrid',
    label: 'Estimativa + foto',
    desc: 'Dá preço estimado imediato e depois pede foto para confirmar antes de agendar.',
    icon: Shuffle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
]

const TONES = ['profissional', 'amigável', 'formal', 'descontraído']

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<WhatsappConfig | null>(null)
  const [quoteModel, setQuoteModel] = useState('fixed')
  const [aiTone, setAiTone] = useState('profissional')
  const [businessName, setBusinessName] = useState('')
  const [aiSchedule, setAiSchedule] = useState('Segunda a sábado, 8h às 18h')
  const [aiInstructions, setAiInstructions] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return
      const { data } = await supabase
        .from('whatsapp_configs')
        .select('id, quote_model, ai_tone, business_name, ai_schedule, ai_instructions, active')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setConfig(data)
        setQuoteModel(data.quote_model ?? 'fixed')
        setAiTone(data.ai_tone ?? 'profissional')
        setBusinessName(data.business_name ?? '')
        setAiSchedule(data.ai_schedule ?? 'Segunda a sábado, 8h às 18h')
        setAiInstructions(data.ai_instructions ?? '')
      }
      setLoading(false)
    }
    init()
  }, [])

  async function salvar() {
    if (!config) return
    setSalvando(true)
    try {
      const supabase = createClient()
      await supabase.from('whatsapp_configs').update({
        quote_model: quoteModel,
        ai_tone: aiTone,
        business_name: businessName.trim() || null,
        ai_schedule: aiSchedule.trim() || null,
        ai_instructions: aiInstructions.trim() || null,
      }).eq('id', config.id)
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!config) return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
        <MessageSquare className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="font-semibold text-slate-800">WhatsApp não configurado</p>
        <p className="text-slate-500 text-sm mt-1">Configure as credenciais da Meta no app mobile primeiro.</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-400 text-sm mt-1">Comportamento do bot e atendimento WhatsApp</p>
      </div>

      <div className="space-y-8">
        {/* Modelo de orçamento */}
        <section>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Modelo de orçamento</p>
          <div className="space-y-3">
            {QUOTE_MODELS.map(m => (
              <button key={m.id} onClick={() => setQuoteModel(m.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  quoteModel === m.id
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${quoteModel === m.id ? m.bg : 'bg-slate-100'}`}>
                  <m.icon className={`w-5 h-5 ${quoteModel === m.id ? m.color : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${quoteModel === m.id ? 'text-blue-700' : 'text-slate-800'}`}>{m.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                </div>
                {quoteModel === m.id && <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />}
              </button>
            ))}
          </div>
        </section>

        {/* Comportamento da IA */}
        <section>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Comportamento da IA</p>
          <div className="space-y-4">
            {/* Tom de voz */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Tom de voz</label>
              <div className="flex gap-2 flex-wrap">
                {TONES.map(t => (
                  <button key={t} onClick={() => setAiTone(t)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                      aiTone === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome do negócio */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome do negócio</label>
              <input value={businessName} onChange={e => setBusinessName(e.target.value)}
                placeholder="Ex: Limpeza Express, SofaLimpo SP..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-blue-400 focus:outline-none transition-colors" />
            </div>

            {/* Horário */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horário de atendimento</label>
              <input value={aiSchedule} onChange={e => setAiSchedule(e.target.value)}
                placeholder="Ex: Segunda a sábado, 8h às 18h"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-blue-400 focus:outline-none transition-colors" />
            </div>

            {/* Instruções extras */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Instruções extras (opcional)</label>
              <textarea value={aiInstructions} onChange={e => setAiInstructions(e.target.value)} rows={3}
                placeholder="Ex: Sofá 2 lugares: R$120. Não atendemos zona norte."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-blue-400 focus:outline-none transition-colors resize-none" />
            </div>
          </div>
        </section>

        {/* Botão salvar */}
        <div className="flex items-center gap-4 pt-2">
          <button onClick={salvar} disabled={salvando}
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </button>
          {sucesso && (
            <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Salvo!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
