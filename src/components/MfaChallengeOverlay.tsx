import React, { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShieldAlert, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface MfaChallengeOverlayProps {
  open: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export const MfaChallengeOverlay: React.FC<MfaChallengeOverlayProps> = ({
  open,
  onSuccess,
  onCancel,
}) => {
  const { verifyMfaOtp } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 6) {
      setErrorMsg('Digite o código de 6 dígitos.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      // Fetch user's registered MFA factors
      const factorsRes = await supabase.auth.mfa.listFactors()
      if (factorsRes.error || !factorsRes.data?.totp?.length) {
        setErrorMsg('Nenhum fator MFA TOTP encontrado para esta conta. Configure em Meu Perfil.')
        setLoading(false)
        return
      }

      const totpFactor = factorsRes.data.totp[0]
      const challengeRes = await supabase.auth.mfa.challenge({ factorId: totpFactor.id })

      if (challengeRes.error) {
        setErrorMsg(challengeRes.error.message)
        setLoading(false)
        return
      }

      const { error } = await verifyMfaOtp(totpFactor.id, challengeRes.data.id, code)

      if (error) {
        setErrorMsg('Código incorreto ou expirado. Tente novamente.')
      } else {
        toast.success('Autenticação de dois fatores confirmada (Sessão AAL2 ativa)!')
        onSuccess?.()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao validar MFA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel?.()}>
      <DialogContent className="max-w-md p-6 bg-white border border-gray-200 shadow-xl rounded-xl">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Verificação de Segurança (MFA Obrigatório)
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Esta instituição exige elevação de privilégio de segurança (nível AAL2) para a sua
            função ou para acessar este recurso sensível.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-primary" />
              Código do Aplicativo Autenticador (6 dígitos)
            </label>
            <Input
              type="text"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.4em] font-mono font-bold h-14"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                Voltar
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 bg-[#0057A8] hover:bg-[#00447F] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                'Confirmar Desafio'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
