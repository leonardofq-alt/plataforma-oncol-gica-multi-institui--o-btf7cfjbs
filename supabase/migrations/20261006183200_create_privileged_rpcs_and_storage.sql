-- Migration: 20261006183200_create_privileged_rpcs_and_storage.sql
-- Privileged Operations as Security Definer Functions (RPCs) and Storage Setup

-- 1. Create Private Storage Bucket for Patient Documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pacientes-documentos',
  'pacientes-documentos',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage Policies for pacientes-documentos
DROP POLICY IF EXISTS "storage_patient_docs_select" ON storage.objects;
CREATE POLICY "storage_patient_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pacientes-documentos'
    AND EXISTS (
      SELECT 1 FROM public.patient_files f
      WHERE f.storage_path = storage.objects.name
        AND public.can_access_patient(f.patient_id, f.institution_id)
    )
  );

DROP POLICY IF EXISTS "storage_patient_docs_insert" ON storage.objects;
CREATE POLICY "storage_patient_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pacientes-documentos'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "storage_patient_docs_update" ON storage.objects;
CREATE POLICY "storage_patient_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pacientes-documentos'
    AND EXISTS (
      SELECT 1 FROM public.patient_files f
      WHERE f.storage_path = storage.objects.name
        AND public.can_access_patient(f.patient_id, f.institution_id)
    )
  );

-- ============================================================================
-- 2. PRIVILEGED RPCs (SECURITY DEFINER)
-- ============================================================================

-- RPC: Log Audit Event with actor automatically set to auth.uid()
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_institution_id UUID,
  p_unit_id UUID,
  p_patient_id UUID,
  p_action TEXT,
  p_entity TEXT,
  p_entity_id TEXT,
  p_previous_version JSONB DEFAULT NULL,
  p_new_version JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  INSERT INTO public.audit_events (
    institution_id,
    unit_id,
    actor_user_id,
    patient_id,
    action,
    entity,
    entity_id,
    previous_version,
    new_version,
    reason,
    metadata
  ) VALUES (
    p_institution_id,
    p_unit_id,
    auth.uid(),
    p_patient_id,
    p_action,
    p_entity,
    p_entity_id,
    p_previous_version,
    p_new_version,
    p_reason,
    p_metadata
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Check Potential Duplicate Patients
CREATE OR REPLACE FUNCTION public.check_patient_duplicates(
  p_institution_id UUID,
  p_name TEXT,
  p_birth_date DATE DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_exclude_patient_id UUID DEFAULT NULL
)
RETURNS TABLE (
  candidate_id UUID,
  candidate_name TEXT,
  candidate_birth_date DATE,
  matched_on TEXT,
  candidate_status TEXT
) AS $$
BEGIN
  IF NOT public.current_user_has_institution_access(p_institution_id) THEN
    RAISE EXCEPTION 'Acesso negado para a instituição informada.';
  END IF;

  RETURN QUERY
  -- Match on exact CPF if provided
  SELECT 
    p.id AS candidate_id,
    p.name AS candidate_name,
    p.birth_date AS candidate_birth_date,
    'CPF idêntico' AS matched_on,
    p.status AS candidate_status
  FROM public.patients p
  JOIN public.patient_identifiers pi ON pi.patient_id = p.id
  WHERE p.institution_id = p_institution_id
    AND p.status <> 'merged'
    AND (p_exclude_patient_id IS NULL OR p.id <> p_exclude_patient_id)
    AND p_cpf IS NOT NULL 
    AND pi.identifier_type = 'CPF'
    AND REPLACE(REPLACE(REPLACE(pi.identifier_value, '.', ''), '-', ''), ' ', '') = 
        REPLACE(REPLACE(REPLACE(p_cpf, '.', ''), '-', ''), ' ', '')
  
  UNION
  
  -- Match on similar/exact name + exact birth date
  SELECT 
    p.id AS candidate_id,
    p.name AS candidate_name,
    p.birth_date AS candidate_birth_date,
    'Nome e Data de Nascimento idênticos' AS matched_on,
    p.status AS candidate_status
  FROM public.patients p
  WHERE p.institution_id = p_institution_id
    AND p.status <> 'merged'
    AND (p_exclude_patient_id IS NULL OR p.id <> p_exclude_patient_id)
    AND p_birth_date IS NOT NULL 
    AND p.birth_date = p_birth_date
    AND LOWER(TRIM(p.name)) = LOWER(TRIM(p_name))

  UNION

  -- Match on similar name only (Levenshtein-like or ILIKE)
  SELECT 
    p.id AS candidate_id,
    p.name AS candidate_name,
    p.birth_date AS candidate_birth_date,
    'Nome fonético/similar' AS matched_on,
    p.status AS candidate_status
  FROM public.patients p
  WHERE p.institution_id = p_institution_id
    AND p.status <> 'merged'
    AND (p_exclude_patient_id IS NULL OR p.id <> p_exclude_patient_id)
    AND (p_birth_date IS NULL OR p.birth_date <> p_birth_date)
    AND LOWER(TRIM(p.name)) = LOWER(TRIM(p_name))
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RPC: Initiate Governed Patient Merge
CREATE OR REPLACE FUNCTION public.initiate_patient_merge(
  p_primary_patient_id UUID,
  p_secondary_patient_id UUID,
  p_institution_id UUID,
  p_reason TEXT
)
RETURNS UUID AS $$
DECLARE
  v_primary RECORD;
  v_secondary RECORD;
  v_snapshot JSONB;
  v_merge_id UUID;
BEGIN
  -- Permission check: admin, gestao, or oncologista
  IF NOT (
    public.current_user_has_role('ti_administrador_institucional', p_institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', p_institution_id)
    OR public.current_user_has_role('enfermeira_navegadora', p_institution_id)
    OR public.current_user_has_role('oncologista_clinico', p_institution_id)
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para realizar fusão de pacientes.';
  END IF;

  IF p_primary_patient_id = p_secondary_patient_id THEN
    RAISE EXCEPTION 'Não é possível mesclar o mesmo registro de paciente.';
  END IF;

  IF TRIM(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'O motivo da fusão é obrigatório.';
  END IF;

  SELECT * INTO v_primary FROM public.patients WHERE id = p_primary_patient_id AND institution_id = p_institution_id;
  SELECT * INTO v_secondary FROM public.patients WHERE id = p_secondary_patient_id AND institution_id = p_institution_id;

  IF v_primary.id IS NULL OR v_secondary.id IS NULL THEN
    RAISE EXCEPTION 'Registros de paciente não encontrados nesta instituição.';
  END IF;

  IF v_secondary.status = 'merged' THEN
    RAISE EXCEPTION 'O paciente secundário já se encontra mesclado.';
  END IF;

  -- Build full reconstructible snapshot
  v_snapshot := jsonb_build_object(
    'primary', to_jsonb(v_primary),
    'secondary', to_jsonb(v_secondary),
    'secondary_identifiers', (SELECT jsonb_agg(to_jsonb(pi)) FROM public.patient_identifiers pi WHERE pi.patient_id = p_secondary_patient_id),
    'secondary_contacts', (SELECT jsonb_agg(to_jsonb(pc)) FROM public.patient_contacts pc WHERE pc.patient_id = p_secondary_patient_id),
    'secondary_representatives', (SELECT jsonb_agg(to_jsonb(pr)) FROM public.patient_representatives pr WHERE pr.patient_id = p_secondary_patient_id)
  );

  -- Re-point identifiers that don't collide
  UPDATE public.patient_identifiers
  SET patient_id = p_primary_patient_id
  WHERE patient_id = p_secondary_patient_id
    AND NOT EXISTS (
      SELECT 1 FROM public.patient_identifiers ex
      WHERE ex.patient_id = p_primary_patient_id
        AND ex.identifier_type = patient_identifiers.identifier_type
        AND ex.identifier_value = patient_identifiers.identifier_value
    );

  -- Re-point contacts and representatives
  UPDATE public.patient_contacts SET patient_id = p_primary_patient_id WHERE patient_id = p_secondary_patient_id;
  UPDATE public.patient_representatives SET patient_id = p_primary_patient_id WHERE patient_id = p_secondary_patient_id;
  UPDATE public.patient_files SET patient_id = p_primary_patient_id WHERE patient_id = p_secondary_patient_id;

  -- Archive secondary patient (NEVER delete)
  UPDATE public.patients
  SET status = 'merged',
      communication_notes = COALESCE(communication_notes, '') || ' [Mesclado no paciente ' || p_primary_patient_id || ' em ' || NOW() || ']',
      updated_at = NOW()
  WHERE id = p_secondary_patient_id;

  -- Mark duplicate candidates as resolved
  UPDATE public.patient_duplicate_candidates
  SET status = 'merged', resolved_at = NOW()
  WHERE (patient_id = p_primary_patient_id AND candidate_patient_id = p_secondary_patient_id)
     OR (patient_id = p_secondary_patient_id AND candidate_patient_id = p_primary_patient_id);

  -- Record Merge Event
  INSERT INTO public.patient_merge_events (
    primary_patient_id,
    secondary_patient_id,
    institution_id,
    performed_by,
    reason,
    snapshot
  ) VALUES (
    p_primary_patient_id,
    p_secondary_patient_id,
    p_institution_id,
    auth.uid(),
    p_reason,
    v_snapshot
  ) RETURNING id INTO v_merge_id;

  -- Log Audit Events
  PERFORM public.log_audit_event(
    p_institution_id,
    v_primary.unit_id,
    p_primary_patient_id,
    'MERGE_PATIENTS',
    'patients',
    p_primary_patient_id::text,
    v_snapshot,
    to_jsonb(v_primary),
    p_reason,
    jsonb_build_object('secondary_patient_id', p_secondary_patient_id, 'merge_event_id', v_merge_id)
  );

  RETURN v_merge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Create Temporary Substitution
CREATE OR REPLACE FUNCTION public.create_temporary_substitution(
  p_institution_id UUID,
  p_unit_id UUID,
  p_substitute_user_id UUID,
  p_substituted_user_id UUID DEFAULT NULL,
  p_substituted_role_id UUID DEFAULT NULL,
  p_starts_at TIMESTAMPTZ DEFAULT NOW(),
  p_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  p_reason TEXT DEFAULT '',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  IF NOT (
    public.current_user_has_role('ti_administrador_institucional', p_institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', p_institution_id)
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para criar substituições temporárias.';
  END IF;

  IF p_substituted_user_id IS NULL AND p_substituted_role_id IS NULL THEN
    RAISE EXCEPTION 'Informe ao menos o usuário ou o papel a ser substituído.';
  END IF;

  IF TRIM(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A justificativa para a substituição temporária é obrigatória.';
  END IF;

  INSERT INTO public.temporary_substitutions (
    institution_id,
    unit_id,
    substituted_user_id,
    substituted_role_id,
    substitute_user_id,
    authorized_by,
    reason,
    starts_at,
    ends_at,
    status,
    notes
  ) VALUES (
    p_institution_id,
    p_unit_id,
    p_substituted_user_id,
    p_substituted_role_id,
    p_substitute_user_id,
    auth.uid(),
    p_reason,
    p_starts_at,
    p_ends_at,
    'active',
    p_notes
  ) RETURNING id INTO v_sub_id;

  PERFORM public.log_audit_event(
    p_institution_id,
    p_unit_id,
    NULL,
    'CREATE_TEMPORARY_SUBSTITUTION',
    'temporary_substitutions',
    v_sub_id::text,
    NULL,
    jsonb_build_object(
      'substitute_user_id', p_substitute_user_id,
      'substituted_user_id', p_substituted_user_id,
      'substituted_role_id', p_substituted_role_id,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    ),
    p_reason,
    NULL
  );

  RETURN v_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Break-Glass Request
CREATE OR REPLACE FUNCTION public.request_break_glass(
  p_institution_id UUID,
  p_unit_id UUID,
  p_patient_id UUID,
  p_justification TEXT,
  p_duration_hours INTEGER DEFAULT 4
)
RETURNS UUID AS $$
DECLARE
  v_bg_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF TRIM(COALESCE(p_justification, '')) = '' THEN
    RAISE EXCEPTION 'A justificativa do acesso excepcional é obrigatória.';
  END IF;

  -- Minimum institutional link required
  IF NOT EXISTS (
    SELECT 1 FROM public.user_institution_memberships
    WHERE user_id = auth.uid() AND institution_id = p_institution_id
  ) THEN
    RAISE EXCEPTION 'Usuário não possui vínculo cadastrado na instituição.';
  END IF;

  v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

  INSERT INTO public.break_glass_access (
    user_id,
    patient_id,
    institution_id,
    unit_id,
    justification,
    starts_at,
    expires_at,
    status
  ) VALUES (
    auth.uid(),
    p_patient_id,
    p_institution_id,
    p_unit_id,
    p_justification,
    NOW(),
    v_expires_at,
    'active'
  ) RETURNING id INTO v_bg_id;

  PERFORM public.log_audit_event(
    p_institution_id,
    p_unit_id,
    p_patient_id,
    'BREAK_GLASS_ACCESS_REQUESTED',
    'break_glass_access',
    v_bg_id::text,
    NULL,
    jsonb_build_object('duration_hours', p_duration_hours, 'expires_at', v_expires_at),
    p_justification,
    NULL
  );

  RETURN v_bg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Create Invitation
CREATE OR REPLACE FUNCTION public.create_invitation_rpc(
  p_institution_id UUID,
  p_unit_id UUID,
  p_email TEXT,
  p_role_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
  v_token TEXT;
BEGIN
  IF NOT (
    public.current_user_has_role('ti_administrador_institucional', p_institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', p_institution_id)
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para emitir convites.';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.invitations (
    institution_id,
    unit_id,
    invited_by,
    email,
    role_id,
    token,
    status
  ) VALUES (
    p_institution_id,
    p_unit_id,
    auth.uid(),
    LOWER(TRIM(p_email)),
    p_role_id,
    v_token,
    'pending'
  ) RETURNING id INTO v_invitation_id;

  PERFORM public.log_audit_event(
    p_institution_id,
    p_unit_id,
    NULL,
    'CREATE_INVITATION',
    'invitations',
    v_invitation_id::text,
    NULL,
    jsonb_build_object('email', p_email, 'role_id', p_role_id),
    'Convite institucional emitido',
    NULL
  );

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
