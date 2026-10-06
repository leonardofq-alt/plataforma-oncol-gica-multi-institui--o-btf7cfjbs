import React, { useState, useEffect } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import {
  getTeams,
  getTeamById,
  createTeam,
  addTeamMember,
  removeTeamMember,
} from '@/services/oncology'
import { Team, TeamMember } from '@/types/oncology'
import { supabase } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/typed-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Users, UserPlus, Trash2, ArrowLeft, Loader2, UserCheck, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function TeamsList() {
  const { activeInstitution, availableUnits, hasRole } = useTenant()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([])

  // Create Team Dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newSpecialtyId, setNewSpecialtyId] = useState('')
  const [newUnitId, setNewUnitId] = useState('')
  const [creating, setCreating] = useState(false)

  // Add Member Dialog
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [candidateUsers, setCandidateUsers] = useState<
    { id: string; display_name: string; contact_email: string }[]
  >([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [memberRole, setMemberRole] = useState('Profissional Titular')
  const [addingMember, setAddingMember] = useState(false)

  const loadTeams = async () => {
    if (!activeInstitution) return
    setLoading(true)
    try {
      const { data, error } = await getTeams(activeInstitution.id)
      if (error) throw error
      setTeams(data)

      const specRes = await db.from('specialties').select('id, name')
      setSpecialties(specRes.data || [])
    } catch (err) {
      console.error('Error fetching teams:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
  }, [activeInstitution])

  const loadTeamDetail = async (teamId: string) => {
    if (!activeInstitution) return
    const { data } = await getTeamById(teamId, activeInstitution.id)
    setSelectedTeam(data)
  }

  const handleOpenAddMember = async () => {
    if (!activeInstitution) return
    // Load members of this institution who could join
    const { data } = await db
      .from('user_institution_memberships')
      .select(`
        user_id,
        profiles:user_id (id, display_name, contact_email)
      `)
      .eq('institution_id', activeInstitution.id)
      .eq('status', 'active')

    const candidates = (data || []).map((d: any) => d.profiles).filter(Boolean)
    setCandidateUsers(candidates)
    setMemberDialogOpen(true)
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeInstitution || !newTeamName.trim()) return

    setCreating(true)
    try {
      const { data, error } = await createTeam(
        activeInstitution.id,
        newUnitId || null,
        newTeamName.trim(),
        newSpecialtyId || null,
      )
      if (error) throw error
      toast.success('Equipe criada com sucesso!')
      setCreateOpen(false)
      setNewTeamName('')
      loadTeams()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar equipe.')
    } finally {
      setCreating(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam || !activeInstitution || !selectedUserId) return

    setAddingMember(true)
    try {
      const { error } = await addTeamMember(
        selectedTeam.id,
        selectedUserId,
        memberRole,
        activeInstitution.id,
      )
      if (error) throw error
      toast.success('Membro adicionado à equipe.')
      setMemberDialogOpen(false)
      loadTeamDetail(selectedTeam.id)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar membro à equipe.')
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam || !activeInstitution) return
    try {
      const { error } = await removeTeamMember(memberId, activeInstitution.id)
      if (error) throw error
      toast.success('Membro removido da equipe.')
      loadTeamDetail(selectedTeam.id)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover membro.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#0057A8]" />
            Equipes Multidisciplinares & Escalas
          </h1>
          <p className="text-xs text-gray-500">
            Composição e governança de profissionais por especialidade e unidade assistencial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedTeam && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTeam(null)}
              className="text-xs gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Ver Todas
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nova Equipe
          </Button>
        </div>
      </div>

      {/* Main Content: Teams Grid or Selected Team Detail */}
      {!selectedTeam ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [1, 2, 3].map((i) => (
              <Card key={i} className="p-6 border-gray-200">
                <Loader2 className="w-6 h-6 animate-spin text-[#0057A8] mx-auto" />
              </Card>
            ))
          ) : teams.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white border border-gray-200 rounded-xl text-gray-500 text-xs">
              Nenhuma equipe configurada para esta instituição.
            </div>
          ) : (
            teams.map((team) => (
              <Card
                key={team.id}
                onClick={() => loadTeamDetail(team.id)}
                className="border-gray-200 shadow-xs hover:border-[#0057A8] hover:shadow-sm transition cursor-pointer group"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-blue-50 text-[#0057A8] border-blue-200"
                    >
                      {team.specialty?.name || 'Geral'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {team.status === 'active' ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-gray-900 group-hover:text-[#0057A8] transition pt-2">
                    {team.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 text-xs text-gray-500 space-y-2">
                  <div>Unidade: {team.unit?.name || 'Todas as Unidades'}</div>
                  <div className="text-[11px] text-[#0057A8] font-semibold flex items-center justify-end">
                    Gerenciar Membros →
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Team Detail with Members List */
        <div className="space-y-4">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-gray-900">
                    {selectedTeam.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-xs bg-teal-50 text-teal-800 border-teal-200"
                  >
                    {selectedTeam.specialty?.name || 'Especialidade Geral'}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-gray-500">
                  Unidade: {selectedTeam.unit?.name || 'Geral'}
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={handleOpenAddMember}
                className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Adicionar Membro
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {!(selectedTeam as any).members || (selectedTeam as any).members.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Nenhum profissional vinculado a esta equipe no momento.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {(selectedTeam as any).members.map((m: TeamMember) => (
                    <div
                      key={m.id}
                      className="p-4 flex items-center justify-between text-xs hover:bg-gray-50/80"
                    >
                      <div>
                        <div className="font-semibold text-gray-900">
                          {m.profile?.display_name || 'Profissional'}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                          <span>
                            Função na Equipe: <strong>{m.role_in_team || 'Membro'}</strong>
                          </span>
                          <span>•</span>
                          <span>{m.profile?.contact_email}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog: Create Team */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Nova Equipe Multidisciplinar
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Crie um grupo de cuidado associado a especialidade e unidade assistencial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTeam} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Nome da Equipe *</Label>
              <Input
                required
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ex: Equipe de Tumores Gastrointestinais"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Especialidade</Label>
              <Select value={newSpecialtyId} onValueChange={setNewSpecialtyId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione a especialidade" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {specialties.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Unidade Assistencial</Label>
              <Select value={newUnitId} onValueChange={setNewUnitId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas as Unidades" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {availableUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating || !newTeamName.trim()}
                size="sm"
                className="bg-[#0057A8] hover:bg-[#00447F] text-white"
              >
                {creating ? 'Criando...' : 'Criar Equipe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Member */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Adicionar Profissional à Equipe
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Apenas profissionais com vínculo ativo nesta instituição podem ser vinculados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Profissional *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {candidateUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.display_name} ({u.contact_email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Papel na Equipe</Label>
              <Input
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                placeholder="Ex: Médico Titular, Navegadora Responsável"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMemberDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={addingMember || !selectedUserId}
                size="sm"
                className="bg-[#0057A8] hover:bg-[#00447F] text-white"
              >
                {addingMember ? 'Adicionando...' : 'Confirmar Vínculo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
