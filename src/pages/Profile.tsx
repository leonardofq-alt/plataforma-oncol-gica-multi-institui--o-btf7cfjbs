import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/hooks/use-tenant'
import { supabase } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/typed-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  User,
  ShieldCheck,
  KeyRound,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Profile() {
  const { user, profile, refreshProfile, aalLevel } = useAuth()
  const { memberships, roles } = useTenant()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // MFA Enrollment Flow State
  const [mfaModalOpen, setMfaModalOpen] = useState(false)
  const [mfaEnrollData, setMfaEnrollData] = useState<{
    id: string
    qrCode: string
    secret: string
  } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [hasTotpEnrolled, setHasTotpEnrolled] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setPhone(profile.phone || '')
    }

    // Check existing MFA factors
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (data?.totp && data.totp.length > 0) {
        setHasTotpEnrolled(true)
      }
    })
  }, [profile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSavingProfile(true)
    try {
      const { error } = await db
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error
      toast.success('Perfil atualizado com sucesso.')
      await refreshProfile()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar dados do perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleStartMfaEnrollment = async () => {
    setEnrolling(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `OncoHub (${user?.email})`,
      })

      if (error) throw error

      if (data) {
        setMfaEnrollData({
          id: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
        })
        setMfaModalOpen(true)
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao iniciar registro MFA.')
    } finally {
      setEnrolling(false)
    }
  }

  const handleConfirmMfaEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaEnrollData || verifyCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos gerado.')
      return
    }

    setVerifying(true)
    try {
      const challengeRes = await supabase.auth.mfa.challenge({ factorId: mfaEnrollData.id })
      if (challengeRes.error) throw challengeRes.error

      const verifyRes = await supabase.auth.mfa.verify({
        factorId: mfaEnrollData.id,
        challengeId: challengeRes.data.id,
        code: verifyCode.trim(),
      })

      if (verifyRes.error) throw verifyRes.error

      toast.success('MFA configurado e ativado com sucesso! Sessão elevada para AAL2.')
      setHasTotpEnrolled(true)
      setMfaModalOpen(false)
      setVerifyCode('')
    } catch (err: any) {
      toast.error(err.message || 'Código incorreto ou expirado. Tente novamente.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-[#0057A8]" />
          Meu Perfil & Segurança Pessoal
        </h1>
        <p className="text-xs text-gray-500">
          Gerenciamento da sua identidade profissional, fatores de autenticação MFA e histórico de
          vínculos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile form (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold text-gray-900">
                Informações Pessoais
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Seu nome de exibição é utilizado para identificação em auditorias e escalas
                assistenciais.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0">
              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Nome de Exibição *</Label>
                  <Input
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">E-mail Cadastrado</Label>
                  <Input
                    disabled
                    value={user?.email || ''}
                    className="h-9 text-xs bg-gray-50 text-gray-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Telefone / Celular</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs px-5"
                  >
                    {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Memberships overview */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0057A8]" />
                Seus Vínculos Institucionais Autorizados ({memberships.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="divide-y divide-gray-100 text-xs">
                {memberships.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{m.institution?.name}</div>
                      <div className="text-[11px] text-gray-500">
                        Unidade: {m.unit?.name || 'Geral'} • Status: {m.status}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-teal-50 text-teal-800 border-teal-200"
                    >
                      Vínculo Ativo
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: MFA & Security Status */}
        <div className="space-y-6">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0057A8]" />
                Segundo Fator (MFA)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Status do MFA</span>
                  {hasTotpEnrolled ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                      Ativado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-amber-700 border-amber-300 text-[10px]"
                    >
                      Não Configurado
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">
                  Nível de sessão atual:{' '}
                  <strong className="uppercase font-mono">{aalLevel || 'aal1'}</strong>
                </div>
              </div>

              <p className="text-gray-600 text-[11px] leading-relaxed">
                O aplicativo autenticador (Google Authenticator, Microsoft Authenticator, 1Password)
                gera códigos temporários para proteger seu acesso.
              </p>

              <Button
                onClick={handleStartMfaEnrollment}
                disabled={enrolling}
                className="w-full bg-[#0057A8] hover:bg-[#00447F] text-white text-xs gap-1.5"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Carregando QR Code...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    {hasTotpEnrolled ? 'Reconfigurar MFA' : 'Configurar MFA Agora'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Active Roles in current institution */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Papéis Concedidos (Contexto Ativo)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              {roles.map((r) => (
                <div key={r.id} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="font-semibold text-gray-800">{r.role?.label}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{r.role?.code}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog: MFA Enrollment with QR Code */}
      <Dialog open={mfaModalOpen} onOpenChange={setMfaModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-base font-bold text-gray-900">
              Configurar Autenticação de Dois Fatores
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Escaneie o código QR com seu aplicativo autenticador e digite o código de 6 dígitos
              gerado.
            </DialogDescription>
          </DialogHeader>

          {mfaEnrollData && (
            <form
              onSubmit={handleConfirmMfaEnrollment}
              className="space-y-4 my-2 text-xs text-center"
            >
              <div className="flex justify-center p-3 bg-gray-50 rounded-xl border border-gray-200 w-fit mx-auto">
                <img src={mfaEnrollData.qrCode} alt="QR Code MFA" className="w-48 h-48 rounded" />
              </div>

              <div className="text-[11px] text-gray-500">
                Se não conseguir escanear, digite a chave manual:
                <div className="font-mono font-bold text-gray-800 select-all mt-0.5">
                  {mfaEnrollData.secret}
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-semibold text-gray-700">
                  Código de Confirmação (6 dígitos)
                </Label>
                <Input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.3em] font-mono font-bold h-12"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMfaModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={verifying || verifyCode.length !== 6}
                  size="sm"
                  className="bg-[#0057A8] hover:bg-[#00447F] text-white"
                >
                  {verifying ? 'Verificando...' : 'Ativar MFA'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
