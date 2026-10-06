import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Bell,
  ShieldCheck,
  ShieldAlert,
  User,
  LogOut,
  Building,
  Key,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/hooks/use-tenant'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface TopbarProps {
  onOpenMobileSidebar: () => void
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileSidebar }) => {
  const { user, profile, signOut, aalLevel } = useAuth()
  const { activeInstitution, activeUnit, isMfaRequiredForSession } = useTenant()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const initials = profile?.display_name
    ? profile.display_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'US'

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/pacientes?busca=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast.info('Sessão encerrada com sucesso.')
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-0 lg:left-[260px] z-20 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
      {/* Left: Mobile hamburger & Context breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-hidden"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
            <span>{activeInstitution?.name || 'OncoHub'}</span>
            {activeUnit && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-teal-700 font-medium">{activeUnit.name}</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <span>Fronteira RLS Isolada</span>
            {aalLevel === 'aal2' ? (
              <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                • Sessão AAL2 (MFA Verificado)
              </span>
            ) : isMfaRequiredForSession ? (
              <span className="text-amber-600 font-bold flex items-center gap-0.5">
                • MFA Requerido
              </span>
            ) : (
              <span className="text-gray-400">• AAL1 Padrão</span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Search patient */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Buscar paciente por nome, CPF ou prontuário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-gray-50 border-gray-200 focus:bg-white rounded-lg"
          />
        </div>
      </form>

      {/* Right: Security Status, Notifications & Profile dropdown */}
      <div className="flex items-center gap-2.5">
        {/* Security Badge */}
        <div className="hidden md:flex items-center">
          {aalLevel === 'aal2' ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] py-0.5 px-2 gap-1 flex items-center"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>AAL2 Protegido</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-800 text-[10px] py-0.5 px-2 gap-1 flex items-center"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#0057A8]" />
              <span>Deny-by-default</span>
            </Badge>
          )}
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-gray-500 hover:text-gray-900 relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-teal-500 rounded-full" />
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition focus:outline-hidden">
              <Avatar className="h-8 w-8 bg-[#0057A8] text-white text-xs font-semibold shadow-xs">
                <AvatarFallback className="bg-[#0057A8] text-white">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold text-gray-900 leading-none">
                  {profile?.display_name || user?.email}
                </p>
                <p className="text-[11px] text-gray-500 leading-none truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate('/perfil')}
              className="cursor-pointer text-xs"
            >
              <User className="w-3.5 h-3.5 mr-2 text-gray-500" />
              Meu Perfil & Segurança
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate('/configuracoes')}
              className="cursor-pointer text-xs"
            >
              <Key className="w-3.5 h-3.5 mr-2 text-gray-500" />
              Configurações de Instituição
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-xs text-red-600 focus:text-red-700"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Encerrar Sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
