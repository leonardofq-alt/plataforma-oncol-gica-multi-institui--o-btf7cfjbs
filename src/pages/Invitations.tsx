import React, { useState, useEffect } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { getInvitations, createInvitation } from '@/services/oncology'
import { Invitation } from '@/types/oncology'
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
import { UserPlus, Mail, ShieldCheck, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Invitations() {
  const { activeInstitution, availableUnits, hasRole } = useTenant()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [roles, setRoles] = useState<{ id: string; label: string; code: string }[]>([])
  const [loading, setLoading] = useState(true)

  // New Invite Modal
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    if (!activeInstitution) return
    setLoading(true)
    try {
      const [invRes, rolesRes] = await Promise.all([
        getInvitations(activeInstitution.id),
        db.from('roles').select('id, label, code').eq('is_professional_role', true),
      ])

      setInvitations(invRes.data)
      setRoles(rolesRes.data || [])
    } catch (err) {
      console.error('Error loading invitations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeInstitution])

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeInstitution || !email.trim() || !roleId) {
      toast.error('Preencha o e-mail e o papel profissional.')
      return
    }

    setSubmitting(true)
    try {
      const { invitationId, error } = await createInvitation(
        activeInstitution.id,
        unitId || null,
        email.trim(),
        roleId,
      )

      if (error) throw error

      toast.success(`Convite emitido com sucesso para ${email}!`)
      setOpen(false)
      setEmail('')
      setRoleId('')
      setUnitId('')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao emitir convite institucional.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-[#0057A8]" />
            Convites Institucionais
          </h1>
          <p className="text-xs text-gray-500">
            Admissão governada de novos profissionais com emissão de token criptografado e
            atribuição de papel.
          </p>
        </div>

        <Button
          onClick={() => setOpen(true)}
          className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs gap-1.5 shadow-xs"
        >
          <Mail className="w-3.5 h-3.5" />
          Novo Convite
        </Button>
      </div>

      {/* Invitations Table */}
      <Card className="border-gray-200 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Histórico de Convites Emitidos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">E-mail Convidado</th>
                  <th className="py-3 px-4">Papel Atribuído</th>
                  <th className="py-3 px-4">Unidade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expira em</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin text-[#0057A8] mx-auto" />
                    </td>
                  </tr>
                ) : invitations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Nenhum convite emitido até o momento.
                    </td>
                  </tr>
                ) : (
                  invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-semibold text-gray-900">{inv.email}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {inv.role?.label || 'Profissional'}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {inv.unit?.name || 'Todas as Unidades'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            inv.status === 'accepted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                              : inv.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                                : 'bg-gray-100 text-gray-600 border-gray-200 text-[10px]'
                          }
                        >
                          {inv.status === 'pending'
                            ? 'Pendente'
                            : inv.status === 'accepted'
                              ? 'Aceito'
                              : 'Expirado'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(inv.token)
                              toast.success(
                                'Token do convite copiado para a área de transferência!',
                              )
                            }}
                            className="text-[11px] text-[#0057A8]"
                          >
                            Copiar Token
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Invitation Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Emitir Convite Institucional
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              O profissional receberá a permissão correspondente ao aceitar o convite autenticado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvite} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                E-mail do Profissional *
              </Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="medico@hospital.com.br"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Papel Institucional *</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o papel do profissional" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Unidade Assistencial</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Geral / Todas as Unidades" />
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
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !email.trim() || !roleId}
                size="sm"
                className="bg-[#0057A8] hover:bg-[#00447F] text-white"
              >
                {submitting ? 'Gerando...' : 'Emitir Convite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
