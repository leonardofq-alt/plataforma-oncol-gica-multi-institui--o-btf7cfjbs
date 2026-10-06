import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '@/hooks/use-tenant'
import { createPatient, updatePatient, getPatientById, checkDuplicates } from '@/services/oncology'
import { Patient } from '@/types/oncology'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  User,
  CreditCard,
  Phone,
  MessageSquare,
  Users2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'

export default function PatientForm() {
  const { id } = useParams()
  const isEditing = !!id
  const { activeInstitution, availableUnits, activeUnit } = useTenant()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEditing)

  // Form State
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [sex, setSex] = useState<'M' | 'F' | 'outro' | 'nao_informado'>('nao_informado')
  const [motherName, setMotherName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [unitId, setUnitId] = useState<string>(activeUnit?.id || '')
  const [status, setStatus] = useState<'active' | 'inactive' | 'emergency'>('active')

  // Identifiers
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [cnsSus, setCnsSus] = useState('')
  const [prontuarioLocal, setProntuarioLocal] = useState('')

  // Contacts
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [communicationChannel, setCommunicationChannel] = useState<
    'whatsapp' | 'email' | 'telefone' | 'sms' | 'nenhum'
  >('whatsapp')
  const [communicationNotes, setCommunicationNotes] = useState('')

  // Representatives
  const [representatives, setRepresentatives] = useState<
    { name: string; relationship: string; phone: string; email: string; authLevel: string }[]
  >([])

  // Duplicate Check Feedback State
  const [duplicateChecked, setDuplicateChecked] = useState(false)
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([])
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)

  useEffect(() => {
    if (isEditing && activeInstitution && id) {
      setFetchLoading(true)
      getPatientById(id, activeInstitution.id).then(({ data, error }) => {
        if (error || !data) {
          toast.error('Paciente não encontrado nesta instituição.')
          navigate('/pacientes')
          return
        }

        setName(data.name || '')
        setBirthDate(data.birth_date || '')
        setSex((data.sex as any) || 'nao_informado')
        setMotherName(data.mother_name || '')
        setRegistrationNumber(data.registration_number || '')
        setUnitId(data.unit_id || '')
        setStatus((data.status as any) || 'active')
        setCommunicationChannel((data.communication_channel as any) || 'whatsapp')
        setCommunicationNotes(data.communication_notes || '')

        // Parse identifiers
        const foundCpf =
          data.identifiers?.find((i) => i.identifier_type === 'CPF')?.identifier_value || ''
        const foundRg =
          data.identifiers?.find((i) => i.identifier_type === 'RG')?.identifier_value || ''
        const foundCns =
          data.identifiers?.find((i) => i.identifier_type === 'CNS_SUS')?.identifier_value || ''
        const foundPront =
          data.identifiers?.find((i) => i.identifier_type === 'PRONTUARIO')?.identifier_value || ''
        setCpf(foundCpf)
        setRg(foundRg)
        setCnsSus(foundCns)
        setProntuarioLocal(foundPront)

        // Parse contacts
        const primaryContact = data.contacts?.[0]
        if (primaryContact) {
          setPhone(primaryContact.phone || '')
          setEmail(primaryContact.email || '')
          setAddress(primaryContact.address || '')
        }

        // Parse reps
        if (data.representatives) {
          setRepresentatives(
            data.representatives.map((r) => ({
              name: r.name,
              relationship: r.relationship,
              phone: r.phone || '',
              email: r.email || '',
              authLevel: r.authorization_level,
            })),
          )
        }
        setFetchLoading(false)
      })
    }
  }, [isEditing, id, activeInstitution])

  const handleAddRepresentative = () => {
    setRepresentatives([
      ...representatives,
      { name: '', relationship: 'Familiar', phone: '', email: '', authLevel: 'standard' },
    ])
  }

  const handleRemoveRepresentative = (index: number) => {
    setRepresentatives(representatives.filter((_, i) => i !== index))
  }

  const handleCheckDuplicatesRealtime = async () => {
    if (!activeInstitution || !name.trim()) return

    try {
      const { data } = await checkDuplicates(
        activeInstitution.id,
        name.trim(),
        birthDate || null,
        cpf.trim() || null,
        id || null,
      )

      setDuplicateChecked(true)
      setDuplicateCandidates(data || [])
      setShowDuplicateWarning((data || []).length > 0)
    } catch (err) {
      console.error('Error checking duplicates:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent, forceSave: boolean = false) => {
    e.preventDefault()
    if (!activeInstitution) return

    if (!name.trim()) {
      toast.error('Informe o nome completo do paciente.')
      return
    }

    // Check duplicates on first submit if not forced and not editing
    if (!isEditing && !forceSave && !duplicateChecked) {
      await handleCheckDuplicatesRealtime()
      // If candidates found, stop and display warning options
      if (duplicateCandidates.length > 0) {
        setShowDuplicateWarning(true)
        return
      }
    }

    setLoading(true)

    try {
      const identifiers = [
        { type: 'CPF', value: cpf },
        { type: 'RG', value: rg },
        { type: 'CNS_SUS', value: cnsSus },
        { type: 'PRONTUARIO', value: prontuarioLocal || registrationNumber },
      ].filter((i) => i.value.trim() !== '')

      const contacts = [
        {
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          isPrimary: true,
        },
      ]

      if (isEditing && id) {
        const { error } = await updatePatient(
          id,
          activeInstitution.id,
          {
            name: name.trim(),
            birth_date: birthDate || null,
            sex,
            mother_name: motherName.trim() || null,
            unit_id: unitId || null,
            status,
            communication_channel: communicationChannel,
            communication_notes: communicationNotes || null,
            registration_number: registrationNumber || null,
          },
          'Atualização de dados demográficos do paciente',
        )

        if (error) throw error
        toast.success('Paciente atualizado com sucesso.')
        navigate(`/pacientes/${id}`)
      } else {
        const { data: newPatient, error } = await createPatient(
          {
            institution_id: activeInstitution.id,
            unit_id: unitId || null,
            name: name.trim(),
            birth_date: birthDate || null,
            sex,
            mother_name: motherName.trim() || null,
            status,
            communication_channel: communicationChannel,
            communication_notes: communicationNotes || null,
            registration_number: registrationNumber || null,
          },
          identifiers,
          contacts,
          representatives,
        )

        if (error) throw error
        toast.success('Paciente cadastrado com sucesso!')
        navigate(`/pacientes/${newPatient.id}`)
      }
    } catch (err: any) {
      console.error('Error saving patient:', err)
      toast.error(err.message || 'Falha ao salvar dados do paciente.')
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <div className="p-12 text-center text-xs text-gray-500 space-y-2">
        <Loader2 className="w-8 h-8 text-[#0057A8] animate-spin mx-auto" />
        <p>Carregando dados cadastrais sob política RLS...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/pacientes')}
          className="text-xs text-gray-600 gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Lista
        </Button>

        <div className="text-right">
          <span className="text-[11px] text-gray-500 font-mono">{activeInstitution?.name}</span>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
          {isEditing ? 'Editar Registro do Paciente' : 'Cadastrar Novo Paciente'}
        </h1>
        <p className="text-xs text-gray-500">
          Campos administrativos e de identidade. Nenhum dado clínico ou prescrição é registrado
          nesta fase.
        </p>
      </div>

      {/* Real-time duplicate feedback banner */}
      {showDuplicateWarning && duplicateCandidates.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                Possível duplicidade encontrada!
              </div>
              <p className="text-xs text-amber-800">
                Identificamos paciente(s) com dados semelhantes já cadastrados nesta instituição:
              </p>
            </div>
          </div>

          <div className="space-y-2 pl-7">
            {duplicateCandidates.map((cand) => (
              <div
                key={cand.candidate_id}
                className="p-2.5 bg-white rounded-lg border border-amber-200 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-gray-900">{cand.candidate_name}</span>
                  <span className="text-gray-500 ml-2">(Motivo: {cand.matched_on})</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/pacientes/${cand.candidate_id}`)}
                  className="text-[11px] h-7 text-[#0057A8]"
                >
                  Examinar Existente
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDuplicateWarning(false)
                setDuplicateChecked(false)
              }}
              className="text-xs text-gray-700 bg-white"
            >
              Cancelar Cadastro
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={(e) => handleSubmit(e, true)}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirmar que são diferentes e prosseguir
            </Button>
          </div>
        </div>
      )}

      {duplicateChecked && duplicateCandidates.length === 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Nenhum candidato a duplicidade encontrado com os dados informados.</span>
        </div>
      )}

      {/* Main Form Accordion */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <Accordion
          type="multiple"
          defaultValue={['item-1', 'item-2', 'item-3']}
          className="space-y-4"
        >
          {/* Section 1: Identidade */}
          <AccordionItem value="item-1" className="border border-gray-200 bg-white rounded-xl px-4">
            <AccordionTrigger className="hover:no-underline py-4 text-xs font-bold uppercase tracking-wider text-gray-800">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#0057A8]" />
                1. Identidade Civil e Demografia
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-gray-700">
                    Nome Completo do Paciente *
                  </Label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleCheckDuplicatesRealtime}
                    placeholder="Ex: Maria das Dores Silva"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    onBlur={handleCheckDuplicatesRealtime}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Sexo Registrado</Label>
                  <Select value={sex} onValueChange={(val: any) => setSex(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                      <SelectItem value="nao_informado">Não informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Nome da Mãe</Label>
                  <Input
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="Nome completo da mãe"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    Unidade de Atendimento
                  </Label>
                  <Select value={unitId} onValueChange={(val) => setUnitId(val)}>
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: Identificadores */}
          <AccordionItem value="item-2" className="border border-gray-200 bg-white rounded-xl px-4">
            <AccordionTrigger className="hover:no-underline py-4 text-xs font-bold uppercase tracking-wider text-gray-800">
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0057A8]" />
                2. Identificadores Oficiais & Prontuário
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">CPF</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    onBlur={handleCheckDuplicatesRealtime}
                    placeholder="000.000.000-00"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">RG / Órgão Emissor</Label>
                  <Input
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    placeholder="Ex: 12.345.678-9 SSP/SP"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    Cartão Nacional do SUS (CNS)
                  </Label>
                  <Input
                    value={cnsSus}
                    onChange={(e) => setCnsSus(e.target.value)}
                    placeholder="700000000000000"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    Número do Prontuário Local / Matrícula
                  </Label>
                  <Input
                    value={registrationNumber || prontuarioLocal}
                    onChange={(e) => {
                      setRegistrationNumber(e.target.value)
                      setProntuarioLocal(e.target.value)
                    }}
                    placeholder="Ex: PR-2026-0819"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: Contatos & Preferências */}
          <AccordionItem value="item-3" className="border border-gray-200 bg-white rounded-xl px-4">
            <AccordionTrigger className="hover:no-underline py-4 text-xs font-bold uppercase tracking-wider text-gray-800">
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#0057A8]" />
                3. Contatos & Preferências de Comunicação
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    Telefone / Celular Principal
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="paciente@exemplo.com"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-gray-700">
                    Endereço Residencial
                  </Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, complemento, bairro, cidade - UF"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    Canal de Comunicação Preferencial
                  </Label>
                  <Select
                    value={communicationChannel}
                    onValueChange={(val: any) => setCommunicationChannel(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="telefone">Ligação Telefônica</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="nenhum">Nenhum / Restrito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    Observações de Comunicação
                  </Label>
                  <Input
                    value={communicationNotes}
                    onChange={(e) => setCommunicationNotes(e.target.value)}
                    placeholder="Ex: Ligar preferencialmente após as 14h"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4: Representantes Autorizados */}
          <AccordionItem value="item-4" className="border border-gray-200 bg-white rounded-xl px-4">
            <AccordionTrigger className="hover:no-underline py-4 text-xs font-bold uppercase tracking-wider text-gray-800">
              <span className="flex items-center gap-2">
                <Users2 className="w-4 h-4 text-[#0057A8]" />
                4. Representantes Autorizados & Responsáveis Legais ({representatives.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <p className="text-gray-500 text-[11px]">
                  Pessoas autorizadas a receber informações administrativas e acompanhar
                  agendamentos.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRepresentative}
                  className="text-xs gap-1 border-gray-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Representante
                </Button>
              </div>

              {representatives.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-400 text-xs">
                  Nenhum representante cadastrado.
                </div>
              ) : (
                <div className="space-y-3">
                  {representatives.map((rep, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200/80 space-y-3 relative"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveRepresentative(idx)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                        <div>
                          <Label className="text-[11px] text-gray-600">Nome do Representante</Label>
                          <Input
                            value={rep.name}
                            onChange={(e) => {
                              const updated = [...representatives]
                              updated[idx].name = e.target.value
                              setRepresentatives(updated)
                            }}
                            placeholder="Nome completo"
                            className="h-8 text-xs bg-white"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-gray-600">Parentesco / Relação</Label>
                          <Input
                            value={rep.relationship}
                            onChange={(e) => {
                              const updated = [...representatives]
                              updated[idx].relationship = e.target.value
                              setRepresentatives(updated)
                            }}
                            placeholder="Ex: Filho, Cônjuge, Curador"
                            className="h-8 text-xs bg-white"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-gray-600">Telefone</Label>
                          <Input
                            value={rep.phone}
                            onChange={(e) => {
                              const updated = [...representatives]
                              updated[idx].phone = e.target.value
                              setRepresentatives(updated)
                            }}
                            placeholder="(00) 00000-0000"
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/pacientes')}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="bg-[#0057A8] hover:bg-[#00447F] text-white text-xs px-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Salvando Dados...
              </>
            ) : isEditing ? (
              'Atualizar Paciente'
            ) : (
              'Salvar Paciente'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
