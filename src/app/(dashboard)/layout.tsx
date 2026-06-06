'use client'

import { useState } from 'react'
import { SidebarNav } from '@/components/sidebar-nav'
import { Menu } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f3ef]">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto bg-white lg:rounded-tl-2xl shadow-sm flex flex-col min-w-0">
        {/* Header mobile com hambúrguer */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">S</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">SofaLimpo</span>
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}
