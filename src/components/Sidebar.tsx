import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Building2,
  MapPin,
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  UserCheck,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Menu,
  X,
  Activity,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useAuth } from '@/hooks/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const {
    memberships,
    activeInstitution,
    activeUnit,
    availableUnits,
    switchInstitution,
    switchUnit,
    roles,
    hasRole,
  } = useTenant()
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { label: 'Visão Geral', path: '/', icon: LayoutDashboard },
    { label: 'Pacientes', path: '/pacientes', icon: Users },
    { label: 'Equipes & Escalas', path: '/equipes', icon: UserCheck },
    { label: 'Convites', path: '/convites', icon: UserPlus },
    { label: 'Configurações', path: '/configuracoes', icon: Settings },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-gray-200 bg-gradient-to-r from-blue-900 via-[#0057A8] to-[#00447F] text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
            <Activity className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight flex items-center gap-1.5">
              <span>OncoHub</span>
              <span className="text-[10px] font-semibold uppercase bg-teal-400 text-teal-950 px-1.5 py-0.5 rounded tracking-wide">
                Fase 1
              </span>
            </div>
            <div className="text-[11px] text-blue-100 font-medium">Plataforma Oncológica</div>
          </div>
        </div>
      </div>

      {/* Tenant Context Switcher */}
      <div className="p-3.5 bg-gray-50/80 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
          <span>Instituição Ativa</span>
          <ShieldCheck className="w-3.5 h-3.5 text-[#00A896]" />
        </div>

        {/* Institution Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full text-left p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm flex items-center justify-between transition group">
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <Building2 className="w-4 h-4 text-[#0057A8] flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-900 truncate">
                  {activeInstitution?.name || 'Selecione a Instituição'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start">
            <DropdownMenuLabel className="text-xs font-bold text-gray-500">
              Vínculos Autorizados ({memberships.length})
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {memberships.map((m) => {
              const isSelected = m.institution_id === activeInstitution?.id
              return (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => {
                    switchInstitution(m.institution_id, m.unit_id)
                    onCloseMobile()
                  }}
                  className={cn(
                    'cursor-pointer text-xs py-2 px-3 flex items-center justify-between',
                    isSelected && 'bg-blue-50 text-[#0057A8] font-semibold',
                  )}
                >
                  <div className="truncate">
                    <div>{m.institution?.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {m.institution?.code || 'Instituição'}
                    </div>
                  </div>
                  {isSelected && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 bg-blue-100 text-[#0057A8]"
                    >
                      Ativa
                    </Badge>
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Unit Selector */}
        {availableUnits.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1">
              Unidade Assistencial
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full text-left p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-xs flex items-center justify-between transition text-xs text-gray-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span className="truncate">
                      {activeUnit ? activeUnit.name : 'Todas as Unidades'}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="start">
                <DropdownMenuItem
                  onClick={() => {
                    switchUnit(null)
                    onCloseMobile()
                  }}
                  className="text-xs"
                >
                  Todas as Unidades (Geral)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableUnits.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => {
                      switchUnit(u.id)
                      onCloseMobile()
                    }}
                    className={cn(
                      'text-xs',
                      activeUnit?.id === u.id && 'bg-teal-50 text-teal-800 font-semibold',
                    )}
                  >
                    {u.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
          Menu de Operações
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group',
                isActive
                  ? 'bg-[#0057A8] text-white shadow-xs font-semibold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-transform group-hover:scale-110',
                  isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#0057A8]',
                )}
              />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>

      {/* Active Roles Summary Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Seu Perfil Ativo</span>
          <span className="text-[9px] text-[#0057A8] font-bold">RLS Ativo</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {roles.slice(0, 2).map((r) => (
            <Badge
              key={r.id}
              variant="outline"
              className="text-[10px] bg-white border-gray-200 font-normal"
            >
              {r.role?.label}
            </Badge>
          ))}
          {roles.length > 2 && (
            <Badge variant="outline" className="text-[10px] bg-white border-gray-200">
              +{roles.length - 2}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] fixed inset-y-0 left-0 z-30 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        >
          <div
            className="w-[280px] h-full bg-white shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
