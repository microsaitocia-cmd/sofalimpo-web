'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User, Phone, Mail, Store, CheckCircle } from 'lucide-react'

interface FormData {
  name: string
  fone: string
  email_contato: string
  nome_negocio: string
}

function Field({ label, value, onChange, icon: Icon, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  icon: React.ElementType; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
      </div>
    </div>
  )
}

export default function PerfilPage() {
  const [form, setForm] = useState<FormData>({ name: '', fone: '', email_contato: '', nome_negocio: '' })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [userId, setUserId] = useState('')
  const [empresaId, setEmpresaId] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return
      setUserId(user.id)
      const meta = user.user_metadata ?? {}
      const { data: eId } = await supabase.rpc('bootstrap_empresa', { p_nome: meta.name ?? '', p_email: meta.email_contato ?? '' })
      if (eId) {
        setEmpresaId(eId)
        const { data: empresa } = await supabase.from('empresas').select('nome').eq('id', eId).single()
        setForm({
          name: meta.name ?? '',
          fone: meta.fone ?? '',
          email_contato: meta.email_contato ?? '',
          nome_negocio: empresa?.nome ?? '',
        })
      }
      setLoading(false)
    }
    init()
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({ data: {
        name: form.name,
        fone: form.fone,
        email_contato: form.email_contato,
      }})
      if (empresaId && form.nome_negocio.trim()) {
        await supabase.from('empresas').update({ nome: form.nome_negocio.trim() }).eq('id', empresaId)
      }
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } finally {
      setSalvando(false)
    }
  }

  const initials = form.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U'

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900">Meu perfil</h1>
        <p className="text-slate-400 text-sm mt-1">Informações da sua conta e negócio</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
          <span className="text-white text-xl font-bold">{initials}</span>
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-lg">{form.name || 'Usuário'}</p>
          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full mt-1">
            <CheckCircle className="w-3 h-3" /> PRO ativo
          </span>
        </div>
      </div>

      <form onSubmit={salvar} className="space-y-5">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Dados pessoais</p>
          <div className="space-y-4">
            <Field label="Nome completo" value={form.name} onChange={v => setForm(f => ({...f, name: v}))}
              icon={User} placeholder="Seu nome completo" />
            <Field label="Telefone / WhatsApp" value={form.fone} onChange={v => setForm(f => ({...f, fone: v}))}
              icon={Phone} placeholder="(11) 99999-9999" />
            <Field label="E-mail de contato" value={form.email_contato} onChange={v => setForm(f => ({...f, email_contato: v}))}
              icon={Mail} type="email" placeholder="seu@email.com" />
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Meu negócio</p>
          <Field label="Nome do negócio" value={form.nome_negocio} onChange={v => setForm(f => ({...f, nome_negocio: v}))}
            icon={Store} placeholder="Ex: Higieniza SP, SofaLimpo..." />
        </div>

        <div className="pt-4 flex items-center gap-3">
          <button type="submit" disabled={salvando}
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
          {sucesso && (
            <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Salvo!
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
