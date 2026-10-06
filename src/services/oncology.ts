import { supabase } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/typed-client'
import {
  Patient,
  PatientDuplicateCandidate,
  PatientMergeEvent,
  PatientFile,
  AuditEvent,
  BreakGlassAccess,
  Invitation,
  TemporarySubstitution,
  Team,
  TeamMember,
} from '@/types/oncology'

// ----------------------------------------------------------------------------
// Patients API
// ----------------------------------------------------------------------------
export const getPatients = async (
  institutionId: string,
  options?: {
    search?: string
    status?: string
    unitId?: string | null
    limit?: number
    offset?: number
  },
) => {
  let query = db
    .from('patients')
    .select(
      `
      id, institution_id, unit_id, name, birth_date, sex, mother_name,
      status, communication_channel, communication_notes, registration_number,
      created_by, created_at, updated_at,
      unit:unit_id (id, name, code),
      identifiers:patient_identifiers (id, identifier_type, identifier_value)
    `,
      { count: 'exact' },
    )
    .eq('institution_id', institutionId)

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }
  if (options?.unitId) {
    query = query.eq('unit_id', options.unitId)
  }
  if (options?.search) {
    const s = `%${options.search}%`
    query = query.or(`name.ilike.${s},registration_number.ilike.${s}`)
  }

  query = query
    .order('created_at', { ascending: false })
    .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 20) - 1)

  const { data, error, count } = await query
  return { data: (data || []) as Patient[], error, count: count || 0 }
}

export const getPatientById = async (id: string, institutionId: string) => {
  const { data, error } = await db
    .from('patients')
    .select(`
      *,
      unit:unit_id (id, name, code),
      identifiers:patient_identifiers (*),
      contacts:patient_contacts (*),
      representatives:patient_representatives (*)
    `)
    .eq('id', id)
    .eq('institution_id', institutionId)
    .single()

  return { data: data as Patient | null, error }
}

export const checkDuplicates = async (
  institutionId: string,
  name: string,
  birthDate?: string | null,
  cpf?: string | null,
  excludePatientId?: string | null,
) => {
  const { data, error } = await (db.rpc as any)('check_patient_duplicates', {
    p_institution_id: institutionId,
    p_name: name,
    p_birth_date: birthDate || null,
    p_cpf: cpf || null,
    p_exclude_patient_id: excludePatientId || null,
  })

  return { data: (data || []) as any[], error }
}

export const createPatient = async (
  patientData: Partial<Patient>,
  identifiers: { type: string; value: string }[],
  contacts?: { phone?: string; email?: string; address?: string; isPrimary?: boolean }[],
  representatives?: {
    name: string
    relationship: string
    phone?: string
    email?: string
    authLevel?: string
  }[],
) => {
  const user = (await supabase.auth.getUser()).data.user

  // Insert base patient
  const { data: newPatient, error: patientError } = await db
    .from('patients')
    .insert({
      institution_id: patientData.institution_id,
      unit_id: patientData.unit_id || null,
      name: patientData.name,
      birth_date: patientData.birth_date || null,
      sex: patientData.sex || null,
      mother_name: patientData.mother_name || null,
      status: patientData.status || 'active',
      communication_channel: patientData.communication_channel || 'whatsapp',
      communication_notes: patientData.communication_notes || null,
      registration_number: patientData.registration_number || null,
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (patientError || !newPatient) {
    return { data: null, error: patientError }
  }

  // Insert identifiers
  if (identifiers.length > 0) {
    const idRows = identifiers
      .filter((i) => i.value.trim() !== '')
      .map((i) => ({
        patient_id: newPatient.id,
        institution_id: newPatient.institution_id,
        identifier_type: i.type,
        identifier_value: i.value.trim(),
      }))

    if (idRows.length > 0) {
      await db.from('patient_identifiers').insert(idRows)
    }
  }

  // Insert contacts
  if (contacts && contacts.length > 0) {
    const contactRows = contacts.map((c) => ({
      patient_id: newPatient.id,
      institution_id: newPatient.institution_id,
      phone: c.phone || null,
      email: c.email || null,
      address: c.address || null,
      is_primary: !!c.isPrimary,
    }))
    await db.from('patient_contacts').insert(contactRows)
  }

  // Insert representatives
  if (representatives && representatives.length > 0) {
    const repRows = representatives.map((r) => ({
      patient_id: newPatient.id,
      institution_id: newPatient.institution_id,
      name: r.name,
      relationship: r.relationship,
      phone: r.phone || null,
      email: r.email || null,
      authorization_level: r.authLevel || 'standard',
    }))
    await db.from('patient_representatives').insert(repRows)
  }

  // Log audit event server-side
  await logAuditEvent(
    newPatient.institution_id,
    newPatient.unit_id,
    newPatient.id,
    'CREATE_PATIENT',
    'patients',
    newPatient.id,
    null,
    newPatient,
    'Novo paciente cadastrado administrativamente',
  )

  return { data: newPatient as Patient, error: null }
}

export const updatePatient = async (
  id: string,
  institutionId: string,
  updates: Partial<Patient>,
  reason?: string,
) => {
  const { data: previous } = await db.from('patients').select('*').eq('id', id).single()

  const { data, error } = await db
    .from('patients')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('institution_id', institutionId)
    .select()
    .single()

  if (!error && data) {
    await logAuditEvent(
      institutionId,
      data.unit_id,
      id,
      'UPDATE_PATIENT',
      'patients',
      id,
      previous,
      data,
      reason || 'Atualização cadastral do paciente',
    )
  }

  return { data: data as Patient | null, error }
}

// ----------------------------------------------------------------------------
// Duplicates & Merge API
// ----------------------------------------------------------------------------
export const getDuplicateCandidates = async (institutionId: string, patientId?: string) => {
  let query = db
    .from('patient_duplicate_candidates')
    .select(`
      *,
      patient:patient_id (id, name, birth_date, status, registration_number),
      candidate_patient:candidate_patient_id (id, name, birth_date, status, registration_number)
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })

  if (patientId) {
    query = query.or(`patient_id.eq.${patientId},candidate_patient_id.eq.${patientId}`)
  }

  const { data, error } = await query
  return { data: (data || []) as PatientDuplicateCandidate[], error }
}

export const confirmDifferentPatients = async (
  candidateId: string,
  institutionId: string,
  patientId: string,
) => {
  const user = (await supabase.auth.getUser()).data.user

  const { error } = await db
    .from('patient_duplicate_candidates')
    .update({
      status: 'confirmed_different',
      confirmed_different_at: new Date().toISOString(),
      confirmed_by: user?.id || null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', candidateId)
    .eq('institution_id', institutionId)

  if (!error) {
    await logAuditEvent(
      institutionId,
      null,
      patientId,
      'CONFIRM_DIFFERENT_PATIENT',
      'patient_duplicate_candidates',
      candidateId,
      null,
      { status: 'confirmed_different' },
      'Conferência humana confirmou que são pessoas distintas',
    )
  }

  return { error }
}

export const initiatePatientMerge = async (
  primaryPatientId: string,
  secondaryPatientId: string,
  institutionId: string,
  reason: string,
) => {
  const { data, error } = await (db.rpc as any)('initiate_patient_merge', {
    p_primary_patient_id: primaryPatientId,
    p_secondary_patient_id: secondaryPatientId,
    p_institution_id: institutionId,
    p_reason: reason,
  })

  return { mergeId: data as string, error }
}

// ----------------------------------------------------------------------------
// Files & Private Storage
// ----------------------------------------------------------------------------
export const getPatientFiles = async (patientId: string, institutionId: string) => {
  const { data, error } = await db
    .from('patient_files')
    .select('*')
    .eq('patient_id', patientId)
    .eq('institution_id', institutionId)
    .order('uploaded_at', { ascending: false })

  return { data: (data || []) as PatientFile[], error }
}

export const uploadPatientFile = async (
  institutionId: string,
  patientId: string,
  unitId: string | null,
  file: File,
  documentType: string,
) => {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Não autenticado')

  const fileExt = file.name.split('.').pop() || 'dat'
  const fileName = `${institutionId}/${patientId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`

  // Upload to private bucket
  const { data: storageData, error: storageError } = await supabase.storage
    .from('pacientes-documentos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (storageError) {
    return { data: null, error: storageError }
  }

  // Insert metadata record in patient_files
  const { data: fileRecord, error: metaError } = await db
    .from('patient_files')
    .insert({
      institution_id: institutionId,
      patient_id: patientId,
      unit_id: unitId,
      storage_path: storageData.path,
      document_type: documentType,
      original_name: file.name,
      uploaded_by: user.id,
      size_bytes: file.size,
      mime_type: file.type,
      state: 'available',
      origin: 'Upload manual no portal',
    })
    .select()
    .single()

  if (!metaError && fileRecord) {
    await logAuditEvent(
      institutionId,
      unitId,
      patientId,
      'UPLOAD_PATIENT_FILE',
      'patient_files',
      fileRecord.id,
      null,
      fileRecord,
      `Upload do documento ${documentType}: ${file.name}`,
    )
  }

  return { data: fileRecord as PatientFile, error: metaError }
}

export const createSignedFileUrl = async (storagePath: string, expiresInSeconds: number = 300) => {
  const { data, error } = await supabase.storage
    .from('pacientes-documentos')
    .createSignedUrl(storagePath, expiresInSeconds)

  return { signedUrl: data?.signedUrl || null, error }
}

// ----------------------------------------------------------------------------
// Audit Events
// ----------------------------------------------------------------------------
export const getAuditEvents = async (
  institutionId: string,
  options?: { patientId?: string; limit?: number },
) => {
  let query = db
    .from('audit_events')
    .select(`
      id, institution_id, unit_id, actor_user_id, patient_id, action,
      entity, entity_id, occurred_at, previous_version, new_version, reason, metadata,
      actor_profile:actor_user_id (id, display_name, contact_email)
    `)
    .eq('institution_id', institutionId)
    .order('occurred_at', { ascending: false })
    .limit(options?.limit || 50)

  if (options?.patientId) {
    query = query.eq('patient_id', options.patientId)
  }

  const { data, error } = await query
  return { data: (data || []) as AuditEvent[], error }
}

export const logAuditEvent = async (
  institutionId: string | null,
  unitId: string | null,
  patientId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  previousVersion: any = null,
  newVersion: any = null,
  reason: string | null = null,
  metadata: any = null,
) => {
  try {
    const { data, error } = await (db.rpc as any)('log_audit_event', {
      p_institution_id: institutionId,
      p_unit_id: unitId,
      p_patient_id: patientId,
      p_action: action,
      p_entity: entity,
      p_entity_id: entityId,
      p_previous_version: previousVersion ? JSON.stringify(previousVersion) : null,
      p_new_version: newVersion ? JSON.stringify(newVersion) : null,
      p_reason: reason,
      p_metadata: metadata ? JSON.stringify(metadata) : null,
    })
    return { eventId: data as string, error }
  } catch (err) {
    console.error('Failed to log audit event:', err)
    return { eventId: null, error: err }
  }
}

// ----------------------------------------------------------------------------
// Break-Glass Access API
// ----------------------------------------------------------------------------
export const requestBreakGlass = async (
  institutionId: string,
  unitId: string | null,
  patientId: string | null,
  justification: string,
  durationHours: number = 4,
) => {
  const { data, error } = await (db.rpc as any)('request_break_glass', {
    p_institution_id: institutionId,
    p_unit_id: unitId,
    p_patient_id: patientId,
    p_justification: justification,
    p_duration_hours: durationHours,
  })

  return { breakGlassId: data as string, error }
}

export const getBreakGlassLogs = async (institutionId: string) => {
  const { data, error } = await db
    .from('break_glass_access')
    .select(`
      *,
      user_profile:user_id (id, display_name, contact_email),
      patient:patient_id (id, name, registration_number)
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })

  return { data: (data || []) as BreakGlassAccess[], error }
}

// ----------------------------------------------------------------------------
// Teams & Members API
// ----------------------------------------------------------------------------
export const getTeams = async (institutionId: string) => {
  const { data, error } = await db
    .from('teams')
    .select(`
      *,
      specialty:specialty_id (id, name, description),
      unit:unit_id (id, name, code)
    `)
    .eq('institution_id', institutionId)
    .order('name')

  return { data: (data || []) as Team[], error }
}

export const getTeamById = async (teamId: string, institutionId: string) => {
  const { data: team, error: teamErr } = await db
    .from('teams')
    .select(`
      *,
      specialty:specialty_id (*),
      unit:unit_id (*)
    `)
    .eq('id', teamId)
    .eq('institution_id', institutionId)
    .single()

  if (teamErr) return { data: null, error: teamErr }

  const { data: members, error: memErr } = await db
    .from('team_members')
    .select(`
      id, team_id, user_id, role_in_team, status, joined_at, left_at,
      profile:user_id (id, display_name, contact_email)
    `)
    .eq('team_id', teamId)
    .eq('status', 'active')

  return {
    data: { ...team, members: members || [] },
    error: memErr,
  }
}

export const createTeam = async (
  institutionId: string,
  unitId: string | null,
  name: string,
  specialtyId: string | null,
) => {
  const { data, error } = await db
    .from('teams')
    .insert({
      institution_id: institutionId,
      unit_id: unitId,
      name,
      specialty_id: specialtyId,
      status: 'active',
    })
    .select()
    .single()

  if (!error && data) {
    await logAuditEvent(
      institutionId,
      unitId,
      null,
      'CREATE_TEAM',
      'teams',
      data.id,
      null,
      data,
      `Nova equipe multidisciplinar: ${name}`,
    )
  }

  return { data: data as Team, error }
}

export const addTeamMember = async (
  teamId: string,
  userId: string,
  roleInTeam: string,
  institutionId: string,
) => {
  const { data, error } = await db
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: userId,
      role_in_team: roleInTeam,
      status: 'active',
    })
    .select()
    .single()

  if (!error && data) {
    await logAuditEvent(
      institutionId,
      null,
      null,
      'ADD_TEAM_MEMBER',
      'team_members',
      data.id,
      null,
      data,
      `Membro adicionado à equipe com papel ${roleInTeam}`,
    )
  }

  return { data, error }
}

export const removeTeamMember = async (teamMemberId: string, institutionId: string) => {
  const { data, error } = await db
    .from('team_members')
    .update({
      status: 'removed',
      left_at: new Date().toISOString(),
    })
    .eq('id', teamMemberId)
    .select()
    .single()

  if (!error && data) {
    await logAuditEvent(
      institutionId,
      null,
      null,
      'REMOVE_TEAM_MEMBER',
      'team_members',
      teamMemberId,
      null,
      data,
      'Membro removido da equipe',
    )
  }

  return { data, error }
}

// ----------------------------------------------------------------------------
// Invitations API
// ----------------------------------------------------------------------------
export const getInvitations = async (institutionId: string) => {
  const { data, error } = await db
    .from('invitations')
    .select(`
      *,
      role:role_id (id, code, label),
      unit:unit_id (id, name, code)
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })

  return { data: (data || []) as Invitation[], error }
}

export const createInvitation = async (
  institutionId: string,
  unitId: string | null,
  email: string,
  roleId: string,
) => {
  const { data, error } = await (db.rpc as any)('create_invitation_rpc', {
    p_institution_id: institutionId,
    p_unit_id: unitId,
    p_email: email,
    p_role_id: roleId,
  })

  return { invitationId: data as string, error }
}

// ----------------------------------------------------------------------------
// Temporary Substitutions API
// ----------------------------------------------------------------------------
export const getSubstitutions = async (institutionId: string) => {
  const { data, error } = await db
    .from('temporary_substitutions')
    .select(`
      *,
      substitute:substitute_user_id (id, display_name, contact_email),
      substituted_user:substituted_user_id (id, display_name, contact_email),
      substituted_role:substituted_role_id (id, code, label),
      unit:unit_id (id, name, code)
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })

  return { data: (data || []) as TemporarySubstitution[], error }
}

export const createTemporarySubstitution = async (
  institutionId: string,
  unitId: string | null,
  substituteUserId: string,
  substitutedUserId: string | null,
  substitutedRoleId: string | null,
  startsAt: string,
  endsAt: string,
  reason: string,
  notes?: string,
) => {
  const { data, error } = await (db.rpc as any)('create_temporary_substitution', {
    p_institution_id: institutionId,
    p_unit_id: unitId,
    p_substitute_user_id: substituteUserId,
    p_substituted_user_id: substitutedUserId,
    p_substituted_role_id: substitutedRoleId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_reason: reason,
    p_notes: notes || null,
  })

  return { substitutionId: data as string, error }
}

// ----------------------------------------------------------------------------
// Security Settings & Institution API
// ----------------------------------------------------------------------------
export const updateSecuritySettings = async (
  institutionId: string,
  settings: {
    requireMfaForAll: boolean
    mfaEnforcedRoleIds: string[]
    mfaEnforcedUnitIds: string[]
    sessionTimeoutMinutes?: number
  },
) => {
  const { data, error } = await db
    .from('institution_security_settings')
    .upsert({
      institution_id: institutionId,
      require_mfa_for_all: settings.requireMfaForAll,
      mfa_enforced_role_ids: settings.mfaEnforcedRoleIds,
      mfa_enforced_unit_ids: settings.mfaEnforcedUnitIds,
      session_timeout_minutes: settings.sessionTimeoutMinutes || 60,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (!error) {
    await logAuditEvent(
      institutionId,
      null,
      null,
      'UPDATE_SECURITY_SETTINGS',
      'institution_security_settings',
      data?.id || institutionId,
      null,
      data,
      'Configurações de segurança e MFA atualizadas',
    )
  }

  return { data, error }
}
