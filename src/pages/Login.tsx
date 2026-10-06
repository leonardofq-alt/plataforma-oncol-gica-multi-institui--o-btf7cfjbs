import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ShieldCheck,
  Activity,
  KeyRound,
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Login() {
  const { signIn, verifyMfaOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('leonardofq@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // MFA stage state
  const [mfaStage, setMfaStage] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      const res = await signIn(email.trim(), password)

      if (res.error) {
        setErrorMessage(res.error.message || 'Credenciais inválidas. Verifique seu email e senha.')
        setLoading(false)
        return
      }

      // Check if MFA challenge is needed
      const mfaFactors = await supabase.auth.mfa.listFactors()
      if (!mfaFactors.error && mfaFactors.data?.totp && mfaFactors.data.totp.length > 0) {
        const verifiedFactor = mfaFactors.data.totp[0]
        const chalRes = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id })

        if (!chalRes.error && chalRes.data) {
          setFactorId(verifiedFactor.id)
          setChallengeId(chalRes.data.id)
          setMfaStage(true)
          setLoading(false)
          toast.info('Autenticação de dois fatores necessária.')
          return
        }
      }

      toast.success('Login institucional realizado com sucesso.')
      const target = (location.state as any)?.from?.pathname || '/'
      navigate(target, { replace: true })
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado na autenticação.')
    } finally {
      setLoading(false)
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mfaCode.length !== 6) {
      setErrorMessage('Digite os 6 dígitos do autenticador.')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    const { error } = await verifyMfaOtp(factorId, challengeId, mfaCode)
    if (error) {
      setErrorMessage('Código MFA inválido ou expirado.')
      setLoading(false)
      return
    }

    toast.success('MFA confirmado com nível AAL2!')
    const target = (location.state as any)?.from?.pathname || '/'
    navigate(target, { replace: true })
  }

  const handleQuickFill = (userEmail: string) => {
    setEmail(userEmail)
    setPassword('Skip@Pass')
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Subtle animated background shapes */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0057A8] text-white shadow-lg shadow-blue-900/20 mb-1">
            <Activity className="w-7 h-7 text-teal-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            OncoHub <span className="text-[#0057A8]">Clinical</span>
          </h1>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Plataforma Oncológica Multi-Instituição • Fundação & Segurança RLS Deny-by-default
          </p>
        </div>

        {/* Card with 3D Flip style effect */}
        <Card className="border border-gray-200/90 shadow-xl bg-white rounded-xl overflow-hidden transition-all duration-500">
          {!mfaStage ? (
            /* Stage 1: Password Form */
            <form onSubmit={handlePasswordLogin}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Acesso Profissional
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Informe suas credenciais institucionais para carregar seus vínculos autorizados.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                    E-mail Institucional
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="usuario@instituicao.org.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10 text-xs rounded-lg border-gray-200 focus:border-[#0057A8]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
                      Senha
                    </Label>
                    <button
                      type="button"
                      onClick={() =>
                        toast.info(
                          'Para redefinição de senha, contate o administrador de TI da sua instituição.',
                        )
                      }
                      className="text-[11px] text-[#0057A8] hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 h-10 text-xs rounded-lg border-gray-200 focus:border-[#0057A8]"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                  />
                  <label htmlFor="remember" className="text-xs text-gray-600 cursor-pointer">
                    Lembrar meu acesso nesta estação de trabalho
                  </label>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-[#0057A8] hover:bg-[#00447F] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      Entrar no Sistema
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        'Solicitação registrada. Seu gestor ou TI institucional avaliará a concessão do convite.',
                      )
                    }
                    className="text-xs text-gray-500 hover:text-gray-800 underline"
                  >
                    Novo por aqui? Solicitar acesso institucional
                  </button>
                </div>
              </CardFooter>
            </form>
          ) : (
            /* Stage 2: MFA TOTP Input */
            <form onSubmit={handleMfaVerify} className="animate-fade-in">
              <CardHeader className="pb-4 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0057A8] flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Segundo Fator de Autenticação
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador (Google
                  Authenticator, Microsoft Authenticator, etc.).
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-2">
                  <Input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-3xl tracking-[0.4em] font-mono font-bold h-14"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full h-10 bg-[#0057A8] hover:bg-[#00447F] text-white text-xs font-semibold rounded-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Validando Código...
                    </>
                  ) : (
                    'Confirmar e Entrar'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMfaStage(false)}
                  className="w-full text-xs text-gray-500"
                >
                  Voltar ao login com senha
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        {/* Fictional Fast Switch Helper (Developer & Demo UX) */}
        <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>Usuários Fictícios de Demonstração</span>
            <span className="text-[10px] text-teal-700 font-semibold">Senha: Skip@Pass</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('leonardofq@gmail.com')}
              className="text-left p-1.5 rounded hover:bg-blue-50 text-gray-700 hover:text-[#0057A8] transition border border-transparent hover:border-blue-200 text-[11px] truncate"
            >
              👑 <span className="font-semibold">leonardofq@gmail.com</span> (TI Admin)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('camila.oncologista@oncohub.internal')}
              className="text-left p-1.5 rounded hover:bg-blue-50 text-gray-700 hover:text-[#0057A8] transition border border-transparent hover:border-blue-200 text-[11px] truncate"
            >
              🩺 <span className="font-semibold">camila.oncologista</span> (Médica)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('marcos.valente@oncohub.internal')}
              className="text-left p-1.5 rounded hover:bg-blue-50 text-gray-700 hover:text-[#0057A8] transition border border-transparent hover:border-blue-200 text-[11px] truncate"
            >
              🏢 <span className="font-semibold">marcos.valente</span> (Multi-vínculo)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('rodrigo.desativado@oncohub.internal')}
              className="text-left p-1.5 rounded hover:bg-red-50 text-red-700 transition border border-transparent hover:border-red-200 text-[11px] truncate"
            >
              🚫 <span className="font-semibold">rodrigo.desativado</span> (Bloqueado)
            </button>
          </div>
        </div>

        {/* Security boundary declaration note */}
        <div className="text-center text-[11px] text-gray-400 leading-tight">
          Protegido por Supabase Auth, PostgreSQL Row Level Security e Trilha Imutável de Auditoria.
        </div>
      </div>
    </div>
  )
}
