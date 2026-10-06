export type RoleCode =
  | 'oncologista_clinico'
  | 'medico_residente'
  | 'enfermeira_navegadora'
  | 'enfermagem_assistencial'
  | 'farmacia_clinica_hospitalar'
  | 'regulacao_faturamento'
  | 'recepcao_agendamento'
  | 'gestao_assistencial_operacional'
  | 'ti_administrador_institucional'
  | 'paciente'
  | 'representante_autorizado'

export interface Role {
  id: string
  code: RoleCode
  label: string
  description: string | null
  is_professional_role: boolean
  created_at?: string
}

export interface Institution {
  id: string
  name: string
  code: string | null
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  institution_id: string
  name: string
  code: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  display_name: string
  contact_email: string | null
  phone: string | null
  status: 'active' | 'disabled'
  preferred_language: string
  created_at: string
  updated_at: string
}

export interface UserInstitutionMembership {
  id: string
  user_id: string
  institution_id: string
  unit_id: string | null
  status: 'active' | 'inactive' | 'ended' | 'disabled'
  starts_at: string
  ends_at: string | null
  institution?: Institution
  unit?: Unit | null
}

export interface RoleAssignment {
  id: string
  role_id: string
  user_id: string
  institution_id: string
  unit_id: string | null
  status: 'active' | 'revoked'
  role?: Role
}

export interface Specialty {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Team {
  id: string
  institution_id: string
  unit_id: string | null
  name: string
  specialty_id: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  specialty?: Specialty | null
  unit?: Unit | null
  member_count?: number
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role_in_team: string | null
  status: 'active' | 'removed'
  joined_at: string
  left_at: string | null
  profile?: Profile | null
  role_assignment?: RoleAssignment | null
}

export interface Invitation {
  id: string
  institution_id: string
  unit_id: string | null
  invited_by: string
  email: string
  role_id: string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'canceled'
  expires_at: string
  accepted_at: string | null
  created_at: string
  role?: Role
  unit?: Unit | null
}

export interface TemporarySubstitution {
  id: string
  institution_id: string
  unit_id: string | null
  substituted_user_id: string | null
  substituted_role_id: string | null
  substitute_user_id: string
  authorized_by: string
  reason: string
  starts_at: string
  ends_at: string
  status: 'active' | 'revoked' | 'expired'
  notes: string | null
  created_at: string
  updated_at: string
  substitute?: Profile | null
  substituted_user?: Profile | null
  substituted_role?: Role | null
  unit?: Unit | null
}

export interface InstitutionSecuritySettings {
  id: string
  institution_id: string
  require_mfa_for_all: boolean
  mfa_enforced_role_ids: string[]
  mfa_enforced_unit_ids: string[]
  session_timeout_minutes: number
  updated_at: string
}

export interface Patient {
  id: string
  institution_id: string
  unit_id: string | null
  name: string
  birth_date: string | null
  sex: 'M' | 'F' | 'outro' | 'nao_informado' | null
  mother_name: string | null
  status: 'active' | 'inactive' | 'emergency' | 'merged'
  communication_channel: 'whatsapp' | 'email' | 'telefone' | 'sms' | 'nenhum' | null
  communication_notes: string | null
  registration_number: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  unit?: Unit | null
  identifiers?: PatientIdentifier[]
  contacts?: PatientContact[]
  representatives?: PatientRepresentative[]
}

export interface PatientIdentifier {
  id: string
  patient_id: string
  institution_id: string
  identifier_type: 'CPF' | 'RG' | 'CNS_SUS' | 'CONVENIO' | 'PRONTUARIO'
  identifier_value: string
  created_at: string
  updated_at: string
}

export interface PatientContact {
  id: string
  patient_id: string
  institution_id: string
  contact_type: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface PatientRepresentative {
  id: string
  patient_id: string
  institution_id: string
  name: string
  relationship: string
  phone: string | null
  email: string | null
  authorization_level: 'standard' | 'legal_guardian' | 'emergency_only'
  created_at: string
  updated_at: string
}

export interface PatientDuplicateCandidate {
  id: string
  patient_id: string
  candidate_patient_id: string
  institution_id: string
  matched_on: string
  status: 'pending' | 'confirmed_different' | 'merged' | 'cancelled'
  confirmed_different_at: string | null
  confirmed_by: string | null
  created_at: string
  resolved_at: string | null
  patient?: Patient | null
  candidate_patient?: Patient | null
}

export interface PatientMergeEvent {
  id: string
  primary_patient_id: string
  secondary_patient_id: string
  institution_id: string
  performed_by: string
  reason: string
  snapshot: Record<string, unknown>
  merged_at: string
}

export interface PatientFile {
  id: string
  institution_id: string
  patient_id: string
  unit_id: string | null
  storage_path: string
  document_type: string
  original_name: string
  uploaded_by: string
  size_bytes: number | null
  mime_type: string | null
  state: 'available' | 'archived' | 'quarantine'
  origin: string | null
  uploaded_at: string
}

export interface AuditEvent {
  id: string
  institution_id: string | null
  unit_id: string | null
  actor_user_id: string | null
  patient_id: string | null
  action: string
  entity: string
  entity_id: string | null
  occurred_at: string
  previous_version: Record<string, unknown> | null
  new_version: Record<string, unknown> | null
  reason: string | null
  metadata: Record<string, unknown> | null
  actor_profile?: Profile | null
}

export interface BreakGlassAccess {
  id: string
  user_id: string
  patient_id: string | null
  resource_type: string
  institution_id: string
  unit_id: string | null
  justification: string
  starts_at: string
  expires_at: string
  approved_by: string | null
  status: 'active' | 'expired' | 'revoked'
  created_at: string
  patient?: Patient | null
  user_profile?: Profile | null
}
