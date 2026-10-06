import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Users,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  Eye,
  FileText,
  UserX,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { getPatients, getDuplicateCandidates, confirmDifferentPatients } from '@/services/oncology'
import { Patient, PatientDuplicateCandidate } from '@/types/oncology'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function PatientsList() {
  const { activeInstitution, activeUnit, hasRole } = useTenant()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<'all' | 'duplicates'>('all')
  const [patients, setPatients] = useState<Patient[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [duplicates, setDuplicates] = useState<PatientDuplicateCandidate[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const searchFilter = searchParams.get('busca') || ''
  const [search, setSearch] = useState(searchFilter)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const loadPatients = async () => {
    if (!activeInstitution) return
    setLoading(true)

    try {
      const [pRes, dRes] = await Promise.all([
        getPatients(activeInstitution.id, {
          search: searchFilter || undefined,
          status: statusFilter,
          limit: pageSize,
          offset: page * pageSize,
        }),
        getDuplicateCandidates(activeInstitution.id),
      ])

      setPatients(pRes.data)
      setTotalCount(pRes.count)
      setDuplicates(dRes.data)
    } catch (err) {
      console.error('Error fetching patients:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPatients()
  }, [activeInstitution, searchFilter, statusFilter, page])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams(search ? { busca: search } : {})
    setPage(0)
  }

  const handleConfirmDifferent = async (candidateId: string, patientId: string) => {
    if (!activeInstitution) return
    try {
      const { error } = await confirmDifferentPatients(candidateId, activeInstitution.id, patientId)
      if (error) throw error
      toast.success('Confirmação registrada: registros mantidos como pessoas distintas.')
      loadPatients()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar conferência.')
    }
  }

  const pendingDuplicatesCount = duplicates.filter((d) => d.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header & Main Call to Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0057A8]" />
            Pacientes (Identidade Administrativa)
          </h1>
          <p className="text-xs text-gray-500">
            Fase 1: Cadastro demográfico, identificadores civis, contatos e governança de
            duplicidades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/pacientes/novo')}
            className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Paciente
          </Button>
        </div>
      </div>

      {/* Tabs: All Patients vs Duplicate Candidates */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-2">
          <TabsList className="bg-gray-100 p-1">
            <TabsTrigger value="all" className="text-xs">
              Todos os Pacientes ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="text-xs relative">
              Potenciais Duplicidades
              {pendingDuplicatesCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {pendingDuplicatesCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search bar & Status Filter */}
          {activeTab === 'all' && (
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearchSubmit} className="relative w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="Nome ou CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white border-gray-200"
                />
              </form>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-gray-200 gap-1.5"
                  >
                    <Filter className="w-3 h-3 text-gray-500" />
                    <span>{statusFilter === 'all' ? 'Status: Todos' : statusFilter}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>Todos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                    Ativo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                    Inativo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('merged')}>
                    Mesclado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Tab 1: Patients Table */}
        <TabsContent value="all" className="mt-4 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Nome Completo / Prontuário</th>
                    <th className="py-3 px-4">CPF / Documento</th>
                    <th className="py-3 px-4">Data Nasc.</th>
                    <th className="py-3 px-4">Unidade</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        <td colSpan={6} className="p-4">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : patients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 space-y-3">
                        <Users className="w-8 h-8 mx-auto text-gray-300" />
                        <p className="text-xs font-medium">
                          Nenhum paciente encontrado com os filtros aplicados.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    patients.map((p) => {
                      const cpf = p.identifiers?.find(
                        (id) => id.identifier_type === 'CPF',
                      )?.identifier_value
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-blue-50/40 transition group cursor-pointer"
                          onClick={() => navigate(`/pacientes/${p.id}`)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900 group-hover:text-[#0057A8]">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {p.registration_number || 'Sem registro'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                            {cpf || '—'}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {p.birth_date
                              ? new Date(p.birth_date).toLocaleDateString('pt-BR')
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{p.unit?.name || 'Geral'}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                p.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                  : p.status === 'merged'
                                    ? 'bg-gray-100 text-gray-600 border-gray-200 text-[10px]'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                              }
                            >
                              {p.status === 'active'
                                ? 'Ativo'
                                : p.status === 'merged'
                                  ? 'Mesclado'
                                  : 'Inativo'}
                            </Badge>
                          </td>
                          <td
                            className="py-3 px-4 text-right space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/pacientes/${p.id}`)}
                              className="h-7 text-xs text-gray-600 hover:text-[#0057A8]"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/pacientes/${p.id}/editar`)}
                              className="h-7 text-xs text-gray-600 hover:text-gray-900"
                            >
                              Editar
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span>
                Mostrando {patients.length} de {totalCount} registros
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2 text-xs">Página {page + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * pageSize >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 px-2"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Duplicate Candidates Review Flow */}
        <TabsContent value="duplicates" className="mt-4 space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Governança de Duplicidades (Nunca Merge Automático)
            </div>
            <p className="text-amber-800">
              O sistema identifica possíveis candidatos com base em CPF, nome similar ou data de
              nascimento idêntica. A decisão final cabe exclusivamente ao usuário autorizado após
              conferência documental.
            </p>
          </div>

          <div className="space-y-4">
            {duplicates.length === 0 ? (
              <div className="p-12 text-center bg-white border border-gray-200 rounded-xl text-gray-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold">Nenhuma duplicidade registrada ou pendente.</p>
              </div>
            ) : (
              duplicates.map((dup) => (
                <div
                  key={dup.id}
                  className="p-5 bg-white border border-gray-200 rounded-xl shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                        <span>Suspeita de Duplicidade</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                        >
                          {dup.status === 'pending'
                            ? 'Pendente de Análise'
                            : dup.status === 'confirmed_different'
                              ? 'Confirmados Diferentes'
                              : 'Mesclados'}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Critério de correspondência:{' '}
                        <span className="font-medium text-gray-700">{dup.matched_on}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-400">
                      Identificado em {new Date(dup.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Compared Records */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Record A */}
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80 space-y-1">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Registro A (Cadastrado)
                      </div>
                      <div className="text-xs font-bold text-gray-900">
                        {dup.patient?.name || 'Paciente A'}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        Nascimento:{' '}
                        {dup.patient?.birth_date
                          ? new Date(dup.patient.birth_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        Prontuário: {dup.patient?.registration_number || 'Sem número'}
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate(`/pacientes/${dup.patient_id}`)}
                        className="text-[11px] h-auto p-0 text-[#0057A8]"
                      >
                        Ver Detalhes do Registro A →
                      </Button>
                    </div>

                    {/* Record B */}
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80 space-y-1">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Registro B (Candidato)
                      </div>
                      <div className="text-xs font-bold text-gray-900">
                        {dup.candidate_patient?.name || 'Paciente B'}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        Nascimento:{' '}
                        {dup.candidate_patient?.birth_date
                          ? new Date(dup.candidate_patient.birth_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        Prontuário: {dup.candidate_patient?.registration_number || 'Sem número'}
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate(`/pacientes/${dup.candidate_patient_id}`)}
                        className="text-[11px] h-auto p-0 text-[#0057A8]"
                      >
                        Ver Detalhes do Registro B →
                      </Button>
                    </div>
                  </div>

                  {/* Actions for Pending Duplicates */}
                  {dup.status === 'pending' && (
                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfirmDifferent(dup.id, dup.patient_id)}
                        className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Confirmar que são pessoas diferentes
                      </Button>

                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/pacientes/${dup.patient_id}?openMerge=true&secondaryId=${dup.candidate_patient_id}`,
                          )
                        }
                        className="text-xs bg-[#0057A8] hover:bg-[#00447F] text-white"
                      >
                        <GitMerge className="w-3.5 h-3.5 mr-1" />
                        Iniciar Fusão Governada (Merge)
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
