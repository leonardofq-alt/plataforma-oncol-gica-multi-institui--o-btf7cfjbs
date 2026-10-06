import React, { useState, useEffect } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { supabase } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/typed-client'
import {
  updateSecuritySettings,
  getSubstitutions,
  createTemporarySubstitution,
  getBreakGlassLogs,
} from '@/services/oncology'
import { TemporarySubstitution, BreakGlassAccess } from '@/types/oncology'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Shield,
  Key,
  Users,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Plus,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Settings() {
  const { activeInstitution, securitySettings, refreshTenantData, availableUnits } = useTenant()

  // Institution Tab State
  const [instName, setInstName] = useState('')
  const [savingInst, setSavingInst] = useState(false)

  // Security / MFA Tab State
  const [requireMfaAll, setRequireMfaAll] = useState(false)
  const [enforcedRoleIds, setEnforcedRoleIds] = useState<string[]>([])
  const [allRoles, setAllRoles] = useState<{ id: string; label: string; code: string }[]>([])
  const [savingSec, setSavingSec] = useState(false)

  // Units Tab State
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitCode, setNewUnitCode] = useState('')
  const [creatingUnit, setCreatingUnit] = useState(false)

  // Users & Memberships Tab State
  const [institutionUsers, setInstitutionUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Temporary Substitution Modal State
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [substitutions, setSubstitutions] = useState<TemporarySubstitution[]>([])
  const [selectedSubUser, setSelectedSubUser] = useState('')
  const [targetUserToSub, setTargetUserToSub] = useState('')
  const [subReason, setSubReason] = useState('')
  const [subDurationDays, setSubDurationDays] = useState('14')
  const [creatingSub, setCreatingSub] = useState(false)

  // Break Glass Audit Logs
  const [bgLogs, setBgLogs] = useState<BreakGlassAccess[]>([])

  useEffect(() => {
    if (activeInstitution) {
      setInstName(activeInstitution.name)
    }
    if (securitySettings) {
      setRequireMfaAll(securitySettings.require_mfa_for_all)
      setEnforcedRoleIds(securitySettings.mfa_enforced_role_ids || [])
    }

    // Load standard roles for MFA selection
    db.from('roles')
      .select('id, label, code')
      .eq('is_professional_role', true)
      .then(({ data }: any) => setAllRoles(data || []))

    loadUsersAndSubs()
  }, [activeInstitution, securitySettings])

  const loadUsersAndSubs = async () => {
    if (!activeInstitution) return
    setLoadingUsers(true)

    try {
      const [uRes, sRes, bgRes] = await Promise.all([
        db
          .from('user_institution_memberships')
          .select(`
            id, user_id, unit_id, status, starts_at, ends_at,
            profile:user_id (id, display_name, contact_email, status),
            unit:unit_id (id, name)
          `)
          .eq('institution_id', activeInstitution.id),
        getSubstitutions(activeInstitution.id),
        getBreakGlassLogs(activeInstitution.id),
      ])

      setInstitutionUsers(uRes.data || [])
      setSubstitutions(sRes.data || [])
      setBgLogs(bgRes.data || [])
    } catch (err) {
      console.error('Error loading settings data:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSaveSecurity = async () => {
    if (!activeInstitution) return
    setSavingSec(true)

    try {
      const { error } = await updateSecuritySettings(activeInstitution.id, {
        requireMfaForAll: requireMfaAll,
        mfaEnforcedRoleIds: enforcedRoleIds,
        mfaEnforcedUnitIds: [],
      })

      if (error) throw error
      toast.success('Configurações de segurança e MFA atualizadas no servidor.')
      refreshTenantData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar segurança.')
    } finally {
      setSavingSec(false)
    }
  }

  const handleToggleRoleMfa = (roleId: string) => {
    setEnforcedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    )
  }

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeInstitution || !newUnitName.trim()) return

    setCreatingUnit(true)
    try {
      const { error } = await db.from('units').insert({
        institution_id: activeInstitution.id,
        name: newUnitName.trim(),
        code: newUnitCode.trim() || null,
        status: 'active',
      })

      if (error) throw error
      toast.success('Unidade assistencial cadastrada.')
      setNewUnitName('')
      setNewUnitCode('')
      refreshTenantData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar unidade.')
    } finally {
      setCreatingUnit(false)
    }
  }

  const handleCreateSubstitution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeInstitution || !selectedSubUser || !targetUserToSub || !subReason.trim()) {
      toast.error('Preencha todos os campos da substituição temporária.')
      return
    }

    setCreatingSub(true)
    try {
      const startsAt = new Date().toISOString()
      const endsAt = new Date(Date.now() + parseInt(subDurationDays, 10) * 86400000).toISOString()

      const { error } = await createTemporarySubstitution(
        activeInstitution.id,
        null,
        selectedSubUser,
        targetUserToSub,
        null,
        startsAt,
        endsAt,
        subReason.trim(),
        'Delegação assistencial configurada pela administração',
      )

      if (error) throw error
      toast.success('Substituição temporária registrada e ativada.')
      setSubModalOpen(false)
      setSubReason('')
      loadUsersAndSubs()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar substituição.')
    } finally {
      setCreatingSub(false)
    }
  }

  const handleRevokeMembership = async (membershipId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'active' ? 'ended' : 'active'
      const { error } = await db
        .from('user_institution_memberships')
        .update({
          status: nextStatus,
          ends_at: nextStatus === 'ended' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', membershipId)

      if (error) throw error
      toast.success(`Vínculo ${nextStatus === 'ended' ? 'encerrado' : 'reativado'}.`)
      loadUsersAndSubs()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar vínculo.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#0057A8]" />
          Configurações & Governança Institucional
        </h1>
        <p className="text-xs text-gray-500">
          Gerenciamento de segurança, MFA por papéis, unidades assistenciais, usuários e
          substituições temporárias.
        </p>
      </div>

      <Tabs defaultValue="seguranca" className="w-full">
        <TabsList className="bg-gray-100 p-1 w-full justify-start overflow-x-auto text-xs">
          <TabsTrigger value="seguranca" className="gap-1.5 text-xs">
            <Key className="w-3.5 h-3.5" />
            Segurança & MFA
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            Usuários & Vínculos ({institutionUsers.length})
          </TabsTrigger>
          <TabsTrigger value="substituicoes" className="gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5" />
            Substituições Temporárias ({substitutions.length})
          </TabsTrigger>
          <TabsTrigger value="unidades" className="gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            Unidades ({availableUnits.length})
          </TabsTrigger>
          <TabsTrigger value="breakglass" className="gap-1.5 text-xs">
            <ShieldAlert className="w-3.5 h-3.5" />
            Auditoria Break-Glass ({bgLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Segurança e MFA */}
        <TabsContent value="seguranca" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-[#0057A8]" />
                Política de Autenticação Multifator (MFA / AAL2)
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Configure a obrigatoriedade de segundo fator (TOTP) para a instituição ou grupos de
                papéis sensíveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-6 text-xs">
              {/* Toggle require all */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="space-y-0.5">
                  <div className="font-bold text-gray-900 text-xs">
                    Exigir MFA para TODOS os usuários da instituição
                  </div>
                  <p className="text-gray-500 text-[11px]">
                    Bloqueia rotas e dados para qualquer usuário cujo nível de sessão não seja AAL2.
                  </p>
                </div>
                <Switch checked={requireMfaAll} onCheckedChange={setRequireMfaAll} />
              </div>

              {/* Role-based MFA enforcement */}
              <div className="space-y-3">
                <div className="font-bold text-gray-900 text-xs uppercase tracking-wider text-gray-500">
                  Ou exigir MFA obrigatoriamente para os seguintes Papéis:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {allRoles.map((role) => {
                    const isChecked = enforcedRoleIds.includes(role.id)
                    return (
                      <div
                        key={role.id}
                        onClick={() => handleToggleRoleMfa(role.id)}
                        className={`p-3 rounded-lg border flex items-center gap-2.5 cursor-pointer transition ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-200 text-[#0057A8]'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Checkbox checked={isChecked} />
                        <div>
                          <div className="font-semibold text-gray-900 text-xs">{role.label}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{role.code}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleSaveSecurity}
                  disabled={savingSec}
                  className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs px-5"
                >
                  {savingSec ? 'Salvando Política...' : 'Salvar Configurações de MFA'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Usuários e Vínculos */}
        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Profissionais Vinculados à Instituição ({activeInstitution?.name})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 text-xs">
                {institutionUsers.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-gray-900">
                        {m.profile?.display_name || 'Usuário'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {m.profile?.contact_email} • Unidade: {m.unit?.name || 'Geral'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={
                          m.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }
                      >
                        {m.status === 'active' ? 'Vínculo Ativo' : 'Encerrado'}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeMembership(m.id, m.status)}
                        className="text-xs text-gray-600 hover:text-red-700"
                      >
                        {m.status === 'active' ? 'Desativar Vínculo' : 'Reativar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Substituições Temporárias */}
        <TabsContent value="substituicoes" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Delegações Assistenciais Temporárias
                </CardTitle>
                <CardDescription className="text-[11px] text-gray-500">
                  Permite cobertura de plantões, férias e congressos sem compartilhamento de senha.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => setSubModalOpen(true)}
                className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Substituição
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {substitutions.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Nenhuma substituição temporária cadastrada.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {substitutions.map((s) => (
                    <div key={s.id} className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">
                          {s.substitute?.display_name} ➔ Substituindo:{' '}
                          {s.substituted_user?.display_name || s.substituted_role?.label}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-purple-50 text-purple-800"
                        >
                          {s.status === 'active' ? 'Vigente' : 'Expirada'}
                        </Badge>
                      </div>
                      <div className="text-gray-600 text-[11px]">Motivo: {s.reason}</div>
                      <div className="text-[10px] text-gray-400">
                        Período: {new Date(s.starts_at).toLocaleDateString('pt-BR')} até{' '}
                        {new Date(s.ends_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Unidades */}
        <TabsContent value="unidades" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Unidades Físicas / Assistenciais
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4 text-xs">
              <form onSubmit={handleCreateUnit} className="flex gap-2">
                <Input
                  required
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Nome da unidade (Ex: Ambulatório de Especialidades)"
                  className="h-9 text-xs"
                />
                <Input
                  value={newUnitCode}
                  onChange={(e) => setNewUnitCode(e.target.value)}
                  placeholder="Sigla/Código (Ex: AMB-02)"
                  className="h-9 text-xs w-40"
                />
                <Button
                  type="submit"
                  disabled={creatingUnit || !newUnitName.trim()}
                  className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs h-9 px-4"
                >
                  {creatingUnit ? 'Adicionando...' : 'Adicionar Unidade'}
                </Button>
              </form>

              <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
                {availableUnits.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="font-semibold text-gray-800">{u.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {u.code || 'UNID'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Break-Glass Audit */}
        <TabsContent value="breakglass" className="mt-4 space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Registros de Acesso Excepcional Break-Glass
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Acessos excepcionais solicitados por suporte ou profissionais fora do contexto
                normal.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {bgLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Nenhum registro de acesso excepcional break-glass nesta instituição.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {bgLogs.map((bg) => (
                    <div key={bg.id} className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">
                          {bg.user_profile?.display_name || 'Profissional'} (
                          {bg.user_profile?.contact_email})
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800">
                          Expira em {new Date(bg.expires_at).toLocaleString('pt-BR')}
                        </Badge>
                      </div>
                      <div className="text-gray-700 font-medium">
                        Justificativa: {bg.justification}
                      </div>
                      {bg.patient && (
                        <div className="text-[11px] text-gray-500">
                          Paciente vinculado: {bg.patient.name} ({bg.patient.registration_number})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: New Substitution */}
      <Dialog open={subModalOpen} onOpenChange={setSubModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Registrar Substituição Temporária
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Concede temporariamente as permissões necessárias durante o período acordado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubstitution} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Profissional Titular Substituído *
              </Label>
              <Select value={targetUserToSub} onValueChange={setTargetUserToSub}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o profissional ausente" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {institutionUsers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.display_name} ({m.profile?.contact_email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Profissional Substituto *
              </Label>
              <Select value={selectedSubUser} onValueChange={setSelectedSubUser}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione quem assumirá a cobertura" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {institutionUsers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.display_name} ({m.profile?.contact_email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Duração (Dias)</Label>
              <Select value={subDurationDays} onValueChange={setSubDurationDays}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="3">3 dias (Fim de semana/Plantão)</SelectItem>
                  <SelectItem value="7">7 dias (1 semana)</SelectItem>
                  <SelectItem value="14">14 dias (2 semanas)</SelectItem>
                  <SelectItem value="30">30 dias (Férias/Licença)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Motivo / Justificativa *
              </Label>
              <Input
                required
                value={subReason}
                onChange={(e) => setSubReason(e.target.value)}
                placeholder="Ex: Cobertura de licença médica e consultas ambulatoriais"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creatingSub || !selectedSubUser || !targetUserToSub || !subReason.trim()}
                size="sm"
                className="bg-[#0057A8] hover:bg-[#00447F] text-white"
              >
                {creatingSub ? 'Registrando...' : 'Confirmar Substituição'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
