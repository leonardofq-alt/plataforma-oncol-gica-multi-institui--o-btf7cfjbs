import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTenant } from '@/hooks/use-tenant'
import {
  getPatientById,
  getPatientFiles,
  getAuditEvents,
  getDuplicateCandidates,
  uploadPatientFile,
  createSignedFileUrl,
  initiatePatientMerge,
  requestBreakGlass,
  confirmDifferentPatients,
} from '@/services/oncology'
import { Patient, PatientFile, AuditEvent, PatientDuplicateCandidate } from '@/types/oncology'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  User,
  CreditCard,
  Phone,
  FileText,
  History,
  GitMerge,
  Upload,
  Download,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Lock,
  Building2,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { activeInstitution, activeUnit, hasRole } = useTenant()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [files, setFiles] = useState<PatientFile[]>([])
  const [audits, setAudits] = useState<AuditEvent[]>([])
  const [duplicates, setDuplicates] = useState<PatientDuplicateCandidate[]>([])
  const [loading, setLoading] = useState(true)

  // File Upload State
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('Documento Pessoal (RG/CPF)')
  const [uploading, setUploading] = useState(false)

  // Governed Merge Modal State
  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [secondaryPatientId, setSecondaryPatientId] = useState(
    searchParams.get('secondaryId') || '',
  )
  const [mergeReason, setMergeReason] = useState('')
  const [mergeConfirmed, setMergeConfirmed] = useState(false)
  const [merging, setMerging] = useState(false)

  // Break-glass request state
  const [breakGlassOpen, setBreakGlassOpen] = useState(false)
  const [bgJustification, setBgJustification] = useState('')
  const [requestingBg, setRequestingBg] = useState(false)

  const loadData = async () => {
    if (!id || !activeInstitution) return
    setLoading(true)

    try {
      const [patRes, fileRes, auditRes, dupRes] = await Promise.all([
        getPatientById(id, activeInstitution.id),
        getPatientFiles(id, activeInstitution.id),
        getAuditEvents(activeInstitution.id, { patientId: id }),
        getDuplicateCandidates(activeInstitution.id, id),
      ])

      if (patRes.error || !patRes.data) {
        toast.error(
          'Paciente não encontrado ou acesso não autorizado pela fronteira da instituição.',
        )
        navigate('/pacientes')
        return
      }

      setPatient(patRes.data)
      setFiles(fileRes.data)
      setAudits(auditRes.data)
      setDuplicates(dupRes.data)
    } catch (err) {
      console.error('Error fetching patient details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    if (searchParams.get('openMerge') === 'true') {
      setMergeModalOpen(true)
    }
  }, [id, activeInstitution])

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !patient || !activeInstitution) return

    setUploading(true)
    try {
      const { error } = await uploadPatientFile(
        activeInstitution.id,
        patient.id,
        patient.unit_id,
        uploadFile,
        documentType,
      )

      if (error) throw error

      toast.success('Arquivo arquivado com sucesso no Storage privado.')
      setUploadOpen(false)
      setUploadFile(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Falha no upload do documento.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    try {
      const { signedUrl, error } = await createSignedFileUrl(storagePath, 120)
      if (error || !signedUrl) throw error || new Error('URL assinada indisponível')

      // Open signed temporary URL
      window.open(signedUrl, '_blank')
      toast.success('Link temporário assinado gerado com sucesso (expira em 2 min).')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar URL temporária do arquivo.')
    }
  }

  const handleConfirmMerge = async () => {
    if (!patient || !activeInstitution || !secondaryPatientId.trim() || !mergeReason.trim()) {
      toast.error('Preencha todos os campos obrigatórios para a fusão.')
      return
    }

    if (!mergeConfirmed) {
      toast.error('Confirme a declaração de irreversibilidade antes de prosseguir.')
      return
    }

    setMerging(true)
    try {
      const { error } = await initiatePatientMerge(
        patient.id,
        secondaryPatientId.trim(),
        activeInstitution.id,
        mergeReason.trim(),
      )

      if (error) throw error

      toast.success('Fusão governada de pacientes realizada com sucesso!')
      setMergeModalOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar fusão governada.')
    } finally {
      setMerging(false)
    }
  }

  const handleBreakGlassRequest = async () => {
    if (!patient || !activeInstitution || !bgJustification.trim()) {
      toast.error('A justificativa é obrigatória para o acesso excepcional.')
      return
    }

    setRequestingBg(true)
    try {
      const { error } = await requestBreakGlass(
        activeInstitution.id,
        patient.unit_id,
        patient.id,
        bgJustification.trim(),
        4,
      )

      if (error) throw error

      toast.success('Acesso excepcional registrado em trilha imutável por 4 horas.')
      setBreakGlassOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar Break-Glass.')
    } finally {
      setRequestingBg(false)
    }
  }

  if (loading || !patient) {
    return (
      <div className="p-16 text-center text-xs text-gray-500 space-y-2">
        <Loader2 className="w-8 h-8 text-[#0057A8] animate-spin mx-auto" />
        <p>Carregando registro e validando políticas RLS...</p>
      </div>
    )
  }

  const primaryCpf = patient.identifiers?.find((i) => i.identifier_type === 'CPF')?.identifier_value

  return (
    <div className="space-y-6">
      {/* Back button & Institutional Boundary header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/pacientes')}
          className="text-xs text-gray-600 gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Lista
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBreakGlassOpen(true)}
            className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50 gap-1"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Acesso Excepcional (Break-Glass)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMergeModalOpen(true)}
            className="text-xs border-blue-200 text-[#0057A8] hover:bg-blue-50 gap-1"
          >
            <GitMerge className="w-3.5 h-3.5" />
            Iniciar Fusão
          </Button>

          <Button
            size="sm"
            onClick={() => navigate(`/pacientes/${patient.id}/editar`)}
            className="text-xs bg-[#0057A8] hover:bg-[#00447F] text-white"
          >
            Editar Registro
          </Button>
        </div>
      </div>

      {/* Patient Header Card */}
      <Card className="border-gray-200 shadow-xs bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-[#0057A8] font-bold text-lg flex items-center justify-center border-2 border-blue-200 shadow-xs">
                {patient.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{patient.name}</h1>
                  <Badge
                    variant="outline"
                    className={
                      patient.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                        : patient.status === 'merged'
                          ? 'bg-gray-100 text-gray-600 border-gray-200 text-xs'
                          : 'bg-amber-50 text-amber-700 border-amber-200 text-xs'
                    }
                  >
                    {patient.status === 'active'
                      ? 'Registro Ativo'
                      : patient.status === 'merged'
                        ? 'Registro Mesclado'
                        : 'Inativo'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>
                    Prontuário:{' '}
                    <strong className="text-gray-700">
                      {patient.registration_number || 'Não informado'}
                    </strong>
                  </span>
                  {primaryCpf && (
                    <span>
                      • CPF: <strong className="text-gray-700 font-mono">{primaryCpf}</strong>
                    </span>
                  )}
                  <span>
                    • Unidade:{' '}
                    <strong className="text-teal-700">{patient.unit?.name || 'Geral'}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] text-gray-400">
              <div>Cadastrado em {new Date(patient.created_at).toLocaleDateString('pt-BR')}</div>
              <div className="text-[#0057A8] font-medium flex items-center justify-end gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Isolamento: {activeInstitution?.name}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="identidade" className="w-full">
        <TabsList className="bg-gray-100 p-1 w-full justify-start overflow-x-auto text-xs">
          <TabsTrigger value="identidade" className="gap-1.5 text-xs">
            <User className="w-3.5 h-3.5" />
            Identidade & Contatos
          </TabsTrigger>
          <TabsTrigger value="representantes" className="gap-1.5 text-xs">
            <Phone className="w-3.5 h-3.5" />
            Representantes ({patient.representatives?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="arquivos" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Arquivos Privados ({files.length})
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-1.5 text-xs">
            <History className="w-3.5 h-3.5" />
            Trilha de Auditoria ({audits.length})
          </TabsTrigger>
          <TabsTrigger value="duplicidades" className="gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            Duplicidades ({duplicates.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Identidade */}
        <TabsContent value="identidade" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Dados Demográficos e Identificadores Civis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">Data de Nascimento</span>
                  <span className="font-semibold text-gray-900">
                    {patient.birth_date
                      ? new Date(patient.birth_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Sexo</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {patient.sex === 'F'
                      ? 'Feminino'
                      : patient.sex === 'M'
                        ? 'Masculino'
                        : patient.sex || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Nome da Mãe</span>
                  <span className="font-semibold text-gray-900">{patient.mother_name || '—'}</span>
                </div>

                <div className="md:col-span-3 pt-3 border-t border-gray-100">
                  <span className="text-gray-500 block mb-2 font-bold uppercase tracking-wider text-[10px]">
                    Identificadores Registrados
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {patient.identifiers && patient.identifiers.length > 0 ? (
                      patient.identifiers.map((ident) => (
                        <Badge
                          key={ident.id}
                          variant="secondary"
                          className="text-xs font-mono py-1 px-2.5"
                        >
                          {ident.identifier_type}: {ident.identifier_value}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-400">Nenhum identificador registrado.</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3 pt-3 border-t border-gray-100">
                  <span className="text-gray-500 block mb-2 font-bold uppercase tracking-wider text-[10px]">
                    Contatos Principais
                  </span>
                  {patient.contacts && patient.contacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <span className="text-gray-500 text-[11px] block">Telefone</span>
                        <span className="font-medium text-gray-800">
                          {patient.contacts[0].phone || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px] block">E-mail</span>
                        <span className="font-medium text-gray-800">
                          {patient.contacts[0].email || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px] block">Endereço</span>
                        <span className="font-medium text-gray-800">
                          {patient.contacts[0].address || '—'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Nenhum contato registrado.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Representantes */}
        <TabsContent value="representantes" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Representantes Autorizados & Responsáveis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {!patient.representatives || patient.representatives.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Nenhum representante cadastrado para este paciente.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {patient.representatives.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200/80 text-xs space-y-1"
                    >
                      <div className="font-bold text-gray-900">{rep.name}</div>
                      <div className="text-gray-600">Parentesco: {rep.relationship}</div>
                      <div className="text-gray-600">Telefone: {rep.phone || '—'}</div>
                      <Badge variant="outline" className="text-[10px] mt-1 bg-white">
                        {rep.authorization_level === 'legal_guardian'
                          ? 'Tutor/Curador Legal'
                          : 'Padrão'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Arquivos Privados (Storage) */}
        <TabsContent value="arquivos" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Repositório Privado de Documentos (pacientes-documentos)
                </CardTitle>
                <CardDescription className="text-[11px] text-gray-500">
                  Armazenamento criptografado no Supabase Storage com autorização restrita via RLS e
                  URL assinada temporária.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => setUploadOpen(true)}
                className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                Novo Arquivo
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {files.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Nenhum arquivo anexado a este paciente.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50/80 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-900">{file.original_name}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                          <span>{file.document_type}</span>
                          <span>•</span>
                          <span>
                            {file.size_bytes
                              ? `${Math.round(file.size_bytes / 1024)} KB`
                              : 'Tamanho desconhecido'}
                          </span>
                          <span>•</span>
                          <span>{new Date(file.uploaded_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadFile(file.storage_path, file.original_name)}
                        className="text-xs gap-1 text-[#0057A8] border-blue-200"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Obter Link Assinado
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Auditoria Imutável */}
        <TabsContent value="auditoria" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Trilha de Auditoria Append-Only (PostgreSQL)
              </CardTitle>
              <CardDescription className="text-[11px] text-gray-500">
                Registro imutável protegido contra edição ou remoção de qualquer usuário regular.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {audits.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Nenhum evento registrado ainda para este paciente.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {audits.map((event) => (
                    <div key={event.id} className="p-4 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] bg-gray-50 text-gray-800"
                        >
                          {event.action}
                        </Badge>
                        <span className="text-[11px] text-gray-400">
                          {new Date(event.occurred_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-gray-700">
                        {event.reason || 'Operação registrada pelo sistema'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Ator:{' '}
                        {event.actor_profile?.display_name || event.actor_user_id || 'Sistema'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Duplicidades */}
        <TabsContent value="duplicidades" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Histórico de Possíveis Duplicidades e Fusões
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {duplicates.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Nenhuma suspeita de duplicidade associada a este prontuário.
                </div>
              ) : (
                <div className="space-y-3">
                  {duplicates.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">
                          Critério: {d.matched_on}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {d.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Registrado em {new Date(d.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload File Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Anexar Arquivo ao Paciente
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              O arquivo será armazenado no bucket privado pacientes-documentos sob política de
              acesso da instituição.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFileUpload} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Tipo do Documento</Label>
              <Input
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                placeholder="Ex: Documento de Identificação, Termo de Consentimento"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Arquivo (PDF ou Imagem)</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="h-10 text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUploadOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploading || !uploadFile}
                size="sm"
                className="bg-[#0057A8] hover:bg-[#00447F] text-white"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Enviando...
                  </>
                ) : (
                  'Salvar Documento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Governed Merge Modal */}
      <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-[#0057A8]" />
              Fusão Governada de Pacientes (Merge)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              A fusão consolida registros duplicados. O registro principal será preservado e o
              secundário arquivado com histórico integral mantido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
              <div className="font-bold text-[#0057A8]">Registro Principal (Permanecerá Ativo)</div>
              <div className="text-gray-800">
                {patient.name} (Prontuário: {patient.registration_number || 'S/N'})
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                ID do Paciente Secundário (Será Mesclado e Arquivado) *
              </Label>
              <Input
                value={secondaryPatientId}
                onChange={(e) => setSecondaryPatientId(e.target.value)}
                placeholder="UUID do paciente secundário..."
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Motivo e Justificativa Obrigatória *
              </Label>
              <Textarea
                value={mergeReason}
                onChange={(e) => setMergeReason(e.target.value)}
                placeholder="Descreva a evidência que confirma que ambos os registros pertencem à mesma pessoa..."
                rows={3}
                className="text-xs"
                required
              />
            </div>

            <div className="flex items-start space-x-2 pt-2 border-t border-gray-100">
              <Checkbox
                id="merge-confirm"
                checked={mergeConfirmed}
                onCheckedChange={(c) => setMergeConfirmed(!!c)}
              />
              <label
                htmlFor="merge-confirm"
                className="text-[11px] text-gray-700 leading-tight cursor-pointer"
              >
                Entendo que esta ação é irreversível, transfere os contatos e identificadores para o
                registro principal, arquiva o secundário e gera trilha de auditoria completa.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMergeModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={
                merging || !mergeConfirmed || !secondaryPatientId.trim() || !mergeReason.trim()
              }
              onClick={handleConfirmMerge}
              className="bg-[#0057A8] hover:bg-[#00447F] text-white"
            >
              {merging ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Processando Fusão...
                </>
              ) : (
                'Executar Fusão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Break-Glass Modal */}
      <Dialog open={breakGlassOpen} onOpenChange={setBreakGlassOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Solicitação de Acesso Excepcional (Break-Glass)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Para auditoria, suporte técnico e TI: o acesso sem vínculo direto exige justificativa
              obrigatória e gera evento imediato de auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Justificativa Formal do Acesso *
              </Label>
              <Textarea
                value={bgJustification}
                onChange={(e) => setBgJustification(e.target.value)}
                placeholder="Ex: Chamado de suporte emergencial INC-9021 para desbloqueio de prontuário duplicado..."
                rows={4}
                className="text-xs"
                required
              />
            </div>
            <p className="text-[11px] text-gray-500">
              O acesso excepcional expira automaticamente após 4 horas.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBreakGlassOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={requestingBg || !bgJustification.trim()}
              onClick={handleBreakGlassRequest}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {requestingBg ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Registrando...
                </>
              ) : (
                'Confirmar Acesso Excepcional'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
