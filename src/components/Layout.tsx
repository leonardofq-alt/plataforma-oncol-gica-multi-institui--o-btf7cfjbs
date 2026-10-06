import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useTenant } from '@/hooks/use-tenant'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { activeInstitution } = useTenant()

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-gray-900 flex flex-col font-sans">
      {/* Sidebar (Desktop 260px fixed, mobile slide-in) */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Topbar (Fixed 64px) */}
      <Topbar onOpenMobileSidebar={() => setMobileOpen(true)} />

      {/* Main Content Area */}
      <div className="lg:pl-[260px] pt-16 flex-1 flex flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto animate-fade-in">
          <Outlet />
        </main>

        {/* Global Institutional Footer */}
        <footer className="border-t border-gray-200 bg-white/70 py-4 px-6 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">
              {activeInstitution?.name || 'OncoHub'}
            </span>
            <span>•</span>
            <span>Fase 1: Fundação & Identidade Administrativa</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <span>Segurança: Deny-by-default (PostgreSQL RLS)</span>
            <span>v1.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
