import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/hooks/use-tenant'
import { Loader2, ShieldX, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MfaChallengeOverlay } from '@/components/MfaChallengeOverlay'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const {
    user,
    loading: authLoading,
    signOut,
    aalLevel,
    requiresMfaUpgrade,
    setRequiresMfaUpgrade,
  } = useAuth()
  const {
    memberships,
    activeInstitution,
    loading: tenantLoading,
    isMfaRequiredForSession,
  } = useTenant()
  const location = useLocation()

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] text-gray-700">
        <Loader2 className="w-10 h-10 text-[#0057A8] animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide">
          Validando sessão segura e isolamento multi-tenant...
        </p>
      </div>
    )
  }

  // Not authenticated -> redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User has no active membership in any institution
  if (memberships.length === 0 || !activeInstitution) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Seu usuário ({user.email}) não possui vínculos profissionais ativos ou habilitados em
            nenhuma instituição oncológica da plataforma.
          </p>
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-100">
            Entre em contato com o administrador de TI da sua instituição para solicitar um convite
            ou reativação do seu vínculo.
          </div>
          <Button
            variant="outline"
            onClick={() => signOut()}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            Encerrar Sessão
          </Button>
        </div>
      </div>
    )
  }

  // Check MFA Requirement for sensitive routes
  const sensitiveRoutes = ['/configuracoes', '/equipes', '/convites', '/pacientes']
  const isCurrentSensitive = sensitiveRoutes.some((route) => location.pathname.startsWith(route))
  const isMfaSatisfied = aalLevel === 'aal2'

  const shouldChallengeMfa = isMfaRequiredForSession && isCurrentSensitive && !isMfaSatisfied

  return (
    <>
      {children}
      {/* Global MFA Challenge Overlay triggered whenever sensitive routes require aal2 */}
      <MfaChallengeOverlay
        open={shouldChallengeMfa || requiresMfaUpgrade}
        onSuccess={() => setRequiresMfaUpgrade(false)}
        onCancel={() => setRequiresMfaUpgrade(false)}
      />
    </>
  )
}
