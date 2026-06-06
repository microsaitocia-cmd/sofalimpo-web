'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, ClipboardList, MessageSquare,
  DollarSign, Package, Bot, LogOut, CalendarDays,
  Settings, User, ChevronDown, X,
} from 'lucide-react'

const mainNav = [
  { href: '/',           label: 'Início',      icon: LayoutDashboard },
  { href: '/ordens',     label: 'Agenda',      icon: CalendarDays },
  { href: '/orcamentos', label: 'Orçamentos',  icon: ClipboardList },
  { href: '/clientes',   label: 'Clientes',    icon: Users },
  { href: '/financeiro', label: 'Financeiro',  icon: DollarSign },
]

interface SidebarNavProps {
  isOpen?: boolean
  onClose?: () => void
}

export function SidebarNav({ isOpen = true, onClose }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [unread, setUnread] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // Nome único por montagem para evitar conflito no strict mode
    const channelName = `sidebar-unread-${Math.random().toString(36).slice(2)}`
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const user = data.user
      if (!user) return
      setUserName(user.user_metadata?.name || user.email || '')

      async function loadUnread() {
        if (cancelled) return
        const { data: rows } = await supabase
          .from('whatsapp_conversations')
          .select('unread_count')
          .eq('user_id', user.id)
        if (cancelled) return
        const total = (rows ?? []).reduce((s: number, c: { unread_count: number }) => s + (c.unread_count ?? 0), 0)
        setUnread(total)
      }
      loadUnread()

      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*', schema: 'public',
          table: 'whatsapp_conversations',
          filter: `user_id=eq.${user.id}`,
        }, () => loadUnread())
        .subscribe()
    })

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // Fecha drawer ao navegar no mobile
  useEffect(() => { onClose?.() }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const firstName = userName.split(' ')[0] || 'Usuário'
  const initials = userName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U'

  return (
    <>
      {/* Overlay mobile */}
      {onClose && isOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'bg-[#f5f3ef] flex flex-col h-screen border-r border-black/5 z-40 transition-transform duration-300',
        // Desktop: sempre visível
        'lg:relative lg:translate-x-0 lg:w-52 lg:shrink-0 lg:sticky lg:top-0',
        // Mobile: drawer fixo
        'fixed top-0 left-0 w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo + fechar */}
        <div className="px-4 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">SofaLimpo</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-black/5 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={label} href={href}
                className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-100',
                  active ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700 font-normal')}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}

          <div className="pt-4 pb-1 px-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Canais</p>
          </div>

          <Link href="/conversas"
            className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-100',
              isActive('/conversas') ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700 font-normal')}>
            <span className="w-4 h-4 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
              <MessageSquare className="w-2.5 h-2.5 text-white" />
            </span>
            <span className="flex-1">WhatsApp</span>
            {unread > 0 && (
              <span className="bg-[#25D366] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          <Link href="/estoque"
            className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-100',
              isActive('/estoque') ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700 font-normal')}>
            <span className="w-4 h-4 rounded-full bg-orange-400 flex items-center justify-center shrink-0">
              <Package className="w-2.5 h-2.5 text-white" />
            </span>
            Estoque
          </Link>

          <Link href="/sofabot"
            className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-100',
              isActive('/sofabot') ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700 font-normal')}>
            <span className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
              <Bot className="w-2.5 h-2.5 text-white" />
            </span>
            SofaBot
          </Link>
        </nav>

        {/* Usuário */}
        <div className="px-2 py-3 border-t border-black/5 space-y-0.5">
          <Link href="/configuracoes"
            className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
              isActive('/configuracoes') ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700')}>
            <Settings className="w-4 h-4 shrink-0" />
            Configurações
          </Link>

          <div className="relative">
            <button onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-white/60 w-full transition-all">
              <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">{initials}</span>
              </div>
              <span className="flex-1 text-left truncate font-medium">{firstName}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', showUserMenu && 'rotate-180')} />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-10">
                <Link href="/perfil" onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <User className="w-4 h-4 text-slate-400" />
                  Meu perfil
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full">
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
