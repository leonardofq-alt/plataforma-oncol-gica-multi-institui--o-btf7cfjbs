import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  UserCheck,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Mail,
  UserPlus,
  FileCheck2,
  Calendar,
  Building2,
  Activity,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/hooks/use-tenant'
import { getPatients, getDuplicateCandidates, getSubstitutions } from '@/services/oncology'
import { Patient, PatientDuplicateCandidate, TemporarySubstitution } from '@/types/oncology'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function Index() {
  const { profile } = useAuth()
  const { activeInstitution, activeUnit, hasRole } = useTenant()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [totalPatients, setTotalPatients] = useState(0)
  const [duplicateCandidates, setDuplicateCandidates] = useState<PatientDuplicateCandidate[]>([])
  const [substitutions, setSubstitutions] = useState<TemporarySubstitution[]>([])

  useEffect(() => {
    if (!activeInstitution) return

    let isMounted = true
    const loadDashboardData = async () => {
      setLoading(true)
      try {
        const [patRes, dupRes, subRes] = await Promise.all([
          getPatients(activeInstitution.id, { limit: 5 }),
          getDuplicateCandidates(activeInstitution.id),
          getSubstitutions(activeInstitution.id),
        ])

        if (isMounted) {
          setPatients(patRes.data)
          setTotalPatients(patRes.count)
          setDuplicateCandidates(dupRes.data.filter((d) => d.status === 'pending'))
          setSubstitutions(subRes.data.filter((s) => s.status === 'active'))
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDashboardData()
    return () => {
      isMounted = false
    }
  }, [activeInstitution])

  const activePatientsCount = patients.filter((p) => p.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
              Bem-vindo(a), {profile?.display_name || 'Profissional'}
            </h1>
            <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 text-xs">
              Contexto Ativo
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-[#0057A8]" />
            <span className="font-medium text-gray-700">{activeInstitution?.name}</span>
            {activeUnit && (
              <>
                <span>•</span>
                <span className="text-teal-700 font-medium">{activeUnit.name}</span>
              </>
            )}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/pacientes/novo')}
            className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Paciente
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/convites')}
            className="text-xs gap-1.5 border-gray-200"
          >
            <UserPlus className="w-3.5 h-3.5 text-gray-600" />
            Convidar Profissional
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/equipes')}
            className="text-xs gap-1.5 border-gray-200"
          >
            <UserCheck className="w-3.5 h-3.5 text-gray-600" />
            Gerenciar Equipes
          </Button>
        </div>
      </div>

      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="border-gray-200 shadow-xs hover:shadow-sm transition">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total de Pacientes
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0057A8] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-gray-900">{totalPatients}</div>
            )}
            <p className="text-[11px] text-gray-500 mt-1">
              Identidades administrativas nesta instituição
            </p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="border-gray-200 shadow-xs hover:shadow-sm transition">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Pacientes Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00A896] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-gray-900">{activePatientsCount}</div>
            )}
            <p className="text-[11px] text-gray-500 mt-1">Com registro regular e ativo</p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="border-gray-200 shadow-xs hover:shadow-sm transition">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Duplicidades Pendentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-amber-700">{duplicateCandidates.length}</div>
            )}
            <p className="text-[11px] text-amber-600 mt-1 font-medium">Exigem conferência humana</p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="border-gray-200 shadow-xs hover:shadow-sm transition">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Substituições Ativas
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-purple-900">{substitutions.length}</div>
            )}
            <p className="text-[11px] text-gray-500 mt-1">Delegação temporária de autorização</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Recent Patients + Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Patients (2 cols) */}
        <Card className="lg:col-span-2 border-gray-200 shadow-xs">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-900">
                Pacientes Recentes
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Últimos registros inseridos sob a fronteira desta instituição
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pacientes')}
              className="text-xs text-[#0057A8] hover:text-[#00447F] gap-1"
            >
              Ver todos
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : patients.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                Nenhum paciente cadastrado nesta instituição ainda.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {patients.map((patient) => {
                  const cpf = patient.identifiers?.find(
                    (i) => i.identifier_type === 'CPF',
                  )?.identifier_value
                  return (
                    <div
                      key={patient.id}
                      onClick={() => navigate(`/pacientes/${patient.id}`)}
                      className="p-4 flex items-center justify-between hover:bg-gray-50/80 cursor-pointer transition"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-gray-900 hover:text-[#0057A8]">
                          {patient.name}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                          <span>{patient.registration_number || 'Sem Prontuário'}</span>
                          {cpf && <span>• CPF: {cpf}</span>}
                          {patient.unit && <span>• {patient.unit.name}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={
                            patient.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                              : patient.status === 'merged'
                                ? 'bg-gray-100 text-gray-600 border-gray-200 text-[10px]'
                                : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                          }
                        >
                          {patient.status === 'active'
                            ? 'Ativo'
                            : patient.status === 'merged'
                              ? 'Mesclado'
                              : 'Inativo'}
                        </Badge>
                        <span className="text-[11px] text-gray-400">
                          {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Pending Actions & Compliance Status */}
        <div className="space-y-4">
          {/* Duplicate candidates card */}
          <Card className="border-amber-200 bg-amber-50/30 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Conferência de Duplicidades
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2 text-xs">
              {duplicateCandidates.length === 0 ? (
                <p className="text-gray-500 text-[11px]">
                  Nenhuma suspeita de duplicidade pendente de análise no momento.
                </p>
              ) : (
                <>
                  <p className="text-gray-700 leading-relaxed text-[11px]">
                    Existem{' '}
                    <span className="font-bold text-amber-800">{duplicateCandidates.length}</span>{' '}
                    par(es) de pacientes com identificadores similares aguardando decisão humana.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/pacientes')}
                    className="w-full text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-50"
                  >
                    Examinar Duplicidades
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Substitutions Alert */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                Substituições Temporárias Vigentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2 text-xs">
              {substitutions.length === 0 ? (
                <p className="text-gray-500 text-[11px]">
                  Nenhuma substituição temporária ativa no momento.
                </p>
              ) : (
                <div className="space-y-2">
                  {substitutions.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-[11px] space-y-1"
                    >
                      <div className="font-semibold text-gray-800">
                        {s.substitute?.display_name || 'Substituto'}
                      </div>
                      <div className="text-gray-500">
                        Substituindo:{' '}
                        {s.substituted_user?.display_name || s.substituted_role?.label}
                      </div>
                      <div className="text-[10px] text-purple-700 font-medium">
                        Até {new Date(s.ends_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/configuracoes')}
                    className="w-full text-xs text-[#0057A8]"
                  >
                    Gerenciar Acessos & Substituições
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
