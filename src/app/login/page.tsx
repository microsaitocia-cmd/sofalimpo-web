'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import Image from 'next/image'

// Converte dígitos do celular para o e-mail interno (igual ao Flutter)
function emailDeCelular(fone: string) {
  const digits = fone.replace(/\D/g, '')
  return `${digits}@sofalimpo.app`
}

// Máscara de celular: (00) 00000-0000
function mascaraCelular(v: string) {
  const d = v.replace(/\D/g, '').substring(0, 11)
  if (d.length <= 2)  return d.length ? `(${d}` : ''
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  return v
}

export default function LoginPage() {
  const router = useRouter()
  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleCelular(v: string) {
    setCelular(mascaraCelular(v))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const digits = celular.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Informe um celular válido com DDD.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: emailDeCelular(celular),
      password,
    })
    if (error) {
      setError('Celular ou senha incorretos. Tente novamente.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const podeEntrar = celular.replace(/\D/g, '').length >= 10 && password.length >= 4

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — branding */}
      <div className="hidden lg:flex w-[45%] bg-[#0F1530] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(circle at 20% 50%, #1E5EFF 0%, transparent 60%), radial-gradient(circle at 80% 20%, #6366F1 0%, transparent 50%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Image src="/icon.svg" alt="SofaLimpo" width={36} height={36} className="rounded-xl" />
          <span className="text-white font-semibold text-lg">SofaLimpo</span>
        </div>

        <div className="relative z-10">
          <p className="text-[#1E5EFF] text-sm font-semibold uppercase tracking-widest mb-4">Painel administrativo</p>
          <div className="text-5xl font-bold text-white mb-4 leading-tight">
            Gerencie seu<br />
            <span className="text-[#1E5EFF]">negócio</span><br />
            com facilidade
          </div>
          <p className="text-slate-400 text-lg leading-relaxed">
            Clientes, agendamentos e WhatsApp<br />em um só lugar.
          </p>
          <div className="flex gap-8 mt-10">
            {[
              { value: '1.000+', label: 'Clientes atendidos' },
              { value: '98%',    label: 'Satisfação' },
              { value: '24/7',   label: 'Bot ativo' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© 2026 SofaLimpo · Todos os direitos reservados</p>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <Image src="/icon.svg" alt="SofaLimpo" width={32} height={32} className="rounded-xl" />
            <span className="font-semibold text-slate-900">SofaLimpo</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Bem-vindo</h1>
            <p className="text-slate-500 mt-1.5">Entre com seu celular e senha</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Celular */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Celular</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={celular}
                  onChange={e => handleCelular(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                  inputMode="numeric"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E5EFF] focus:ring-2 focus:ring-[#1E5EFF]/10 bg-slate-50 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Senha numérica</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  inputMode="numeric"
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E5EFF] focus:ring-2 focus:ring-[#1E5EFF]/10 bg-slate-50 focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading || !podeEntrar}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1E5EFF] text-white rounded-xl text-sm font-semibold hover:bg-[#0E3FCC] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 mt-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <>Entrar <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-slate-400 text-xs mt-8">
            Use o mesmo celular e senha cadastrados no app mobile.
          </p>
        </div>
      </div>
    </div>
  )
}
