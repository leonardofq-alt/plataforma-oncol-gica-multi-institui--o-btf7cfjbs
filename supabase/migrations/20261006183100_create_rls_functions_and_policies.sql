-- Migration: 20261006183100_create_rls_functions_and_policies.sql
-- Security Definer helper functions and Deny-by-default RLS policies

-- ============================================================================
-- 1. CENTRALIZED SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Check if current authenticated user has active membership in target institution
CREATE OR REPLACE FUNCTION public.current_user_has_institution_access(target_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR target_institution_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check user profile is active
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND status = 'active'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Direct active membership check
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_institution_memberships m
    WHERE m.user_id = auth.uid()
      AND m.institution_id = target_institution_id
      AND m.status = 'active'
      AND (m.starts_at <= NOW())
      AND (m.ends_at IS NULL OR m.ends_at > NOW())
  ) INTO v_has_access;

  IF v_has_access THEN
    RETURN TRUE;
  END IF;

  -- Active temporary substitution check where user is the substitute
  SELECT EXISTS (
    SELECT 1
    FROM public.temporary_substitutions s
    WHERE s.substitute_user_id = auth.uid()
      AND s.institution_id = target_institution_id
      AND s.status = 'active'
      AND s.starts_at <= NOW()
      AND s.ends_at > NOW()
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current authenticated user has a specific role in an institution
CREATE OR REPLACE FUNCTION public.current_user_has_role(
  required_role_code TEXT,
  target_institution_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_role BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify active profile
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND status = 'active'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Direct role assignment
  SELECT EXISTS (
    SELECT 1 
    FROM public.role_assignments ra
    JOIN public.roles r ON r.id = ra.role_id
    WHERE ra.user_id = auth.uid()
      AND r.code = required_role_code
      AND ra.status = 'active'
      AND (target_institution_id IS NULL OR ra.institution_id = target_institution_id)
      AND (
        -- Also check that they have active membership in this institution
        target_institution_id IS NULL OR public.current_user_has_institution_access(target_institution_id)
      )
  ) INTO v_has_role;

  IF v_has_role THEN
    RETURN TRUE;
  END IF;

  -- Role granted via temporary substitution
  IF target_institution_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.temporary_substitutions s
      LEFT JOIN public.roles sr ON sr.id = s.substituted_role_id
      LEFT JOIN public.role_assignments sra ON sra.user_id = s.substituted_user_id AND sra.institution_id = s.institution_id
      LEFT JOIN public.roles srar ON srar.id = sra.role_id
      WHERE s.substitute_user_id = auth.uid()
        AND s.institution_id = target_institution_id
        AND s.status = 'active'
        AND s.starts_at <= NOW()
        AND s.ends_at > NOW()
        AND (
          sr.code = required_role_code 
          OR (sra.status = 'active' AND srar.code = required_role_code)
        )
    ) INTO v_has_role;
  END IF;

  RETURN v_has_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user can access patient record
CREATE OR REPLACE FUNCTION public.can_access_patient(target_patient_id UUID, target_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_authorized BOOLEAN;
  v_is_patient_user BOOLEAN;
  v_is_representative BOOLEAN;
  v_is_break_glass BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is the patient themselves (via patient role or CPF link)
  -- Patient role users can only access their own patient profile if linked
  -- For phase 1 administrative: check if user has active institution membership
  IF public.current_user_has_institution_access(target_institution_id) THEN
    -- Verify user is NOT solely a patient role trying to access other patients
    -- If user has ONLY patient/representative role, they cannot browse all institution patients
    IF NOT EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.user_id = auth.uid()
        AND ra.institution_id = target_institution_id
        AND ra.status = 'active'
        AND r.is_professional_role = true
    ) THEN
      -- User has only non-professional role (e.g. paciente or representante_autorizado)
      -- In phase 1, non-professionals have no access to browse patient list
      RETURN FALSE;
    END IF;

    -- Professional has access within their institution
    RETURN TRUE;
  END IF;

  -- Exceptional Break-Glass access check
  SELECT EXISTS (
    SELECT 1 FROM public.break_glass_access bg
    WHERE bg.user_id = auth.uid()
      AND (bg.patient_id = target_patient_id OR bg.patient_id IS NULL)
      AND bg.institution_id = target_institution_id
      AND bg.status = 'active'
      AND bg.starts_at <= NOW()
      AND bg.expires_at > NOW()
  ) INTO v_is_break_glass;

  RETURN v_is_break_glass;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES (Deny-by-default)
-- ============================================================================

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_institution_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_institution_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_duplicate_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_merge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.break_glass_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS POLICIES FOR INSTITUTIONS & UNITS
-- ============================================================================

DROP POLICY IF EXISTS "institutions_select_membership" ON public.institutions;
CREATE POLICY "institutions_select_membership" ON public.institutions
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_institution_access(id)
    OR id IN (
      SELECT institution_id FROM public.invitations WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "institutions_update_admin" ON public.institutions;
CREATE POLICY "institutions_update_admin" ON public.institutions
  FOR UPDATE TO authenticated
  USING (
    public.current_user_has_role('ti_administrador_institucional', id)
  )
  WITH CHECK (
    public.current_user_has_role('ti_administrador_institucional', id)
  );

DROP POLICY IF EXISTS "units_select_membership" ON public.units;
CREATE POLICY "units_select_membership" ON public.units
  FOR SELECT TO authenticated
  USING (public.current_user_has_institution_access(institution_id));

DROP POLICY IF EXISTS "units_admin_all" ON public.units;
CREATE POLICY "units_admin_all" ON public.units
  FOR ALL TO authenticated
  USING (public.current_user_has_role('ti_administrador_institucional', institution_id))
  WITH CHECK (public.current_user_has_role('ti_administrador_institucional', institution_id));

-- ============================================================================
-- 4. RLS POLICIES FOR PROFILES & ROLES
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_coworkers_or_self" ON public.profiles;
CREATE POLICY "profiles_select_coworkers_or_self" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      -- Can see profiles of users sharing at least one common active institution
      SELECT 1 FROM public.user_institution_memberships m1
      JOIN public.user_institution_memberships m2 ON m1.institution_id = m2.institution_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profiles.id
        AND m1.status = 'active'
        AND m2.status IN ('active', 'disabled', 'inactive')
    )
  );

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_institution_memberships m
      WHERE m.user_id = profiles.id
        AND public.current_user_has_role('ti_administrador_institucional', m.institution_id)
    )
  );

-- Roles are catalog: readable by all authenticated users
DROP POLICY IF EXISTS "roles_read_catalog" ON public.roles;
CREATE POLICY "roles_read_catalog" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

-- Role assignments: readable within institution; editable by admin
DROP POLICY IF EXISTS "role_assignments_select" ON public.role_assignments;
CREATE POLICY "role_assignments_select" ON public.role_assignments
  FOR SELECT TO authenticated
  USING (public.current_user_has_institution_access(institution_id));

DROP POLICY IF EXISTS "role_assignments_admin_manage" ON public.role_assignments;
CREATE POLICY "role_assignments_admin_manage" ON public.role_assignments
  FOR ALL TO authenticated
  USING (public.current_user_has_role('ti_administrador_institucional', institution_id))
  WITH CHECK (public.current_user_has_role('ti_administrador_institucional', institution_id));

-- Memberships: readable within institution; editable by admin
DROP POLICY IF EXISTS "memberships_select" ON public.user_institution_memberships;
CREATE POLICY "memberships_select" ON public.user_institution_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_has_institution_access(institution_id)
  );

DROP POLICY IF EXISTS "memberships_admin_manage" ON public.user_institution_memberships;
CREATE POLICY "memberships_admin_manage" ON public.user_institution_memberships
  FOR ALL TO authenticated
  USING (public.current_user_has_role('ti_administrador_institucional', institution_id))
  WITH CHECK (public.current_user_has_role('ti_administrador_institucional', institution_id));

-- Specialties: catalog readable by all authenticated
DROP POLICY IF EXISTS "specialties_read_catalog" ON public.specialties;
CREATE POLICY "specialties_read_catalog" ON public.specialties
  FOR SELECT TO authenticated
  USING (true);

-- Teams & Team Members
DROP POLICY IF EXISTS "teams_select" ON public.teams;
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (public.current_user_has_institution_access(institution_id));

DROP POLICY IF EXISTS "teams_admin_manage" ON public.teams;
CREATE POLICY "teams_admin_manage" ON public.teams
  FOR ALL TO authenticated
  USING (
    public.current_user_has_role('ti_administrador_institucional', institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', institution_id)
  )
  WITH CHECK (
    public.current_user_has_role('ti_administrador_institucional', institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', institution_id)
  );

DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t 
      WHERE t.id = team_members.team_id 
        AND public.current_user_has_institution_access(t.institution_id)
    )
  );

DROP POLICY IF EXISTS "team_members_manage" ON public.team_members;
CREATE POLICY "team_members_manage" ON public.team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t 
      WHERE t.id = team_members.team_id 
        AND (
          public.current_user_has_role('ti_administrador_institucional', t.institution_id)
          OR public.current_user_has_role('gestao_assistencial_operacional', t.institution_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t 
      WHERE t.id = team_members.team_id 
        AND (
          public.current_user_has_role('ti_administrador_institucional', t.institution_id)
          OR public.current_user_has_role('gestao_assistencial_operacional', t.institution_id)
        )
    )
  );

-- Invitations
DROP POLICY IF EXISTS "invitations_select" ON public.invitations;
CREATE POLICY "invitations_select" ON public.invitations
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_institution_access(institution_id)
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "invitations_admin_manage" ON public.invitations;
CREATE POLICY "invitations_admin_manage" ON public.invitations
  FOR ALL TO authenticated
  USING (
    public.current_user_has_role('ti_administrador_institucional', institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', institution_id)
  )
  WITH CHECK (
    public.current_user_has_role('ti_administrador_institucional', institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', institution_id)
  );

-- Temporary Substitutions
DROP POLICY IF EXISTS "substitutions_select" ON public.temporary_substitutions;
CREATE POLICY "substitutions_select" ON public.temporary_substitutions
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_institution_access(institution_id)
    OR substitute_user_id = auth.uid()
    OR substituted_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "substitutions_manage" ON public.temporary_substitutions;
CREATE POLICY "substitutions_manage" ON public.temporary_substitutions
  FOR ALL TO authenticated
  USING (
    public.current_user_has_role('ti_administrador_institucional', institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', institution_id)
  )
  WITH CHECK (
    public.current_user_has_role('ti_administrador_institucional', institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', institution_id)
  );

-- Security Settings
DROP POLICY IF EXISTS "security_settings_select" ON public.institution_security_settings;
CREATE POLICY "security_settings_select" ON public.institution_security_settings
  FOR SELECT TO authenticated
  USING (public.current_user_has_institution_access(institution_id));

DROP POLICY IF EXISTS "security_settings_admin_manage" ON public.institution_security_settings;
CREATE POLICY "security_settings_admin_manage" ON public.institution_security_settings
  FOR ALL TO authenticated
  USING (public.current_user_has_role('ti_administrador_institucional', institution_id))
  WITH CHECK (public.current_user_has_role('ti_administrador_institucional', institution_id));

-- ============================================================================
-- 5. RLS POLICIES FOR PATIENT RECORDS (Administrative Identity Only)
-- ============================================================================

-- PROVE 1: User of Institution A cannot read patients of Institution B
DROP POLICY IF EXISTS "patients_select" ON public.patients;
CREATE POLICY "patients_select" ON public.patients
  FOR SELECT TO authenticated
  USING (public.can_access_patient(id, institution_id));

-- PROVE 2: User of Institution A cannot update/insert/delete patients of Institution B
DROP POLICY IF EXISTS "patients_insert" ON public.patients;
CREATE POLICY "patients_insert" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_has_institution_access(institution_id)
    AND EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.user_id = auth.uid()
        AND ra.institution_id = patients.institution_id
        AND ra.status = 'active'
        AND r.is_professional_role = true
    )
  );

DROP POLICY IF EXISTS "patients_update" ON public.patients;
CREATE POLICY "patients_update" ON public.patients
  FOR UPDATE TO authenticated
  USING (public.can_access_patient(id, institution_id))
  WITH CHECK (
    public.can_access_patient(id, institution_id)
    AND EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.user_id = auth.uid()
        AND ra.institution_id = patients.institution_id
        AND ra.status = 'active'
        AND r.is_professional_role = true
    )
  );

-- Patient Identifiers
DROP POLICY IF EXISTS "patient_identifiers_select" ON public.patient_identifiers;
CREATE POLICY "patient_identifiers_select" ON public.patient_identifiers
  FOR SELECT TO authenticated
  USING (public.can_access_patient(patient_id, institution_id));

DROP POLICY IF EXISTS "patient_identifiers_manage" ON public.patient_identifiers;
CREATE POLICY "patient_identifiers_manage" ON public.patient_identifiers
  FOR ALL TO authenticated
  USING (public.can_access_patient(patient_id, institution_id))
  WITH CHECK (public.can_access_patient(patient_id, institution_id));

-- Patient Contacts
DROP POLICY IF EXISTS "patient_contacts_select" ON public.patient_contacts;
CREATE POLICY "patient_contacts_select" ON public.patient_contacts
  FOR SELECT TO authenticated
  USING (public.can_access_patient(patient_id, institution_id));

DROP POLICY IF EXISTS "patient_contacts_manage" ON public.patient_contacts;
CREATE POLICY "patient_contacts_manage" ON public.patient_contacts
  FOR ALL TO authenticated
  USING (public.can_access_patient(patient_id, institution_id))
  WITH CHECK (public.can_access_patient(patient_id, institution_id));

-- Patient Representatives
DROP POLICY IF EXISTS "patient_representatives_select" ON public.patient_representatives;
CREATE POLICY "patient_representatives_select" ON public.patient_representatives
  FOR SELECT TO authenticated
  USING (public.can_access_patient(patient_id, institution_id));

DROP POLICY IF EXISTS "patient_representatives_manage" ON public.patient_representatives;
CREATE POLICY "patient_representatives_manage" ON public.patient_representatives
  FOR ALL TO authenticated
  USING (public.can_access_patient(patient_id, institution_id))
  WITH CHECK (public.can_access_patient(patient_id, institution_id));

-- Patient Institution Links
DROP POLICY IF EXISTS "patient_institution_links_select" ON public.patient_institution_links;
CREATE POLICY "patient_institution_links_select" ON public.patient_institution_links
  FOR SELECT TO authenticated
  USING (public.current_user_has_institution_access(institution_id));

DROP POLICY IF EXISTS "patient_institution_links_manage" ON public.patient_institution_links;
CREATE POLICY "patient_institution_links_manage" ON public.patient_institution_links
  FOR ALL TO authenticated
  USING (public.current_user_has_institution_access(institution_id))
  WITH CHECK (public.current_user_has_institution_access(institution_id));

-- Duplicate Candidates
DROP POLICY IF EXISTS "duplicate_candidates_select" ON public.patient_duplicate_candidates;
CREATE POLICY "duplicate_candidates_select" ON public.patient_duplicate_candidates
  FOR SELECT TO authenticated
  USING (public.current_user_has_institution_access(institution_id));

DROP POLICY IF EXISTS "duplicate_candidates_manage" ON public.patient_duplicate_candidates;
CREATE POLICY "duplicate_candidates_manage" ON public.patient_duplicate_candidates
  FOR ALL TO authenticated
  USING (public.current_user_has_institution_access(institution_id))
  WITH CHECK (public.current_user_has_institution_access(institution_id));

-- Patient Merge Events: readable by authorized staff; insert only via security definer RPC
DROP POLICY IF EXISTS "patient_merge_events_select" ON public.patient_merge_events;
CREATE POLICY "patient_merge_events_select" ON public.patient_merge_events
  FOR SELECT TO authenticated
  USING (public.current_user_has_institution_access(institution_id));

-- Patient Files metadata table
DROP POLICY IF EXISTS "patient_files_select" ON public.patient_files;
CREATE POLICY "patient_files_select" ON public.patient_files
  FOR SELECT TO authenticated
  USING (public.can_access_patient(patient_id, institution_id));

DROP POLICY IF EXISTS "patient_files_insert" ON public.patient_files;
CREATE POLICY "patient_files_insert" ON public.patient_files
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_patient(patient_id, institution_id)
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "patient_files_update" ON public.patient_files;
CREATE POLICY "patient_files_update" ON public.patient_files
  FOR UPDATE TO authenticated
  USING (public.can_access_patient(patient_id, institution_id))
  WITH CHECK (public.can_access_patient(patient_id, institution_id));

-- ============================================================================
-- 6. AUDIT_EVENTS: Append-only protection
-- ============================================================================
-- Non-service roles CANNOT update or delete audit events under any circumstance
DROP POLICY IF EXISTS "audit_events_select" ON public.audit_events;
CREATE POLICY "audit_events_select" ON public.audit_events
  FOR SELECT TO authenticated
  USING (
    institution_id IS NOT NULL 
    AND public.current_user_has_institution_access(institution_id)
    AND (
      public.current_user_has_role('ti_administrador_institucional', institution_id)
      OR public.current_user_has_role('gestao_assistencial_operacional', institution_id)
      OR public.current_user_has_role('oncologista_clinico', institution_id)
      OR public.current_user_has_role('enfermeira_navegadora', institution_id)
    )
  );

DROP POLICY IF EXISTS "audit_events_insert" ON public.audit_events;
CREATE POLICY "audit_events_insert" ON public.audit_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (institution_id IS NULL OR public.current_user_has_institution_access(institution_id))
  );

-- No UPDATE or DELETE policies exist for audit_events -> Deny-by-default!

-- ============================================================================
-- 7. BREAK-GLASS ACCESS TABLE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "break_glass_select" ON public.break_glass_access;
CREATE POLICY "break_glass_select" ON public.break_glass_access
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_has_role('ti_administrador_institucional', institution_id)
    OR public.current_user_has_role('gestao_assistencial_operacional', institution_id)
  );

DROP POLICY IF EXISTS "break_glass_insert" ON public.break_glass_access;
CREATE POLICY "break_glass_insert" ON public.break_glass_access
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_has_institution_access(institution_id)
  );

DROP POLICY IF EXISTS "break_glass_update" ON public.break_glass_access;
CREATE POLICY "break_glass_update" ON public.break_glass_access
  FOR UPDATE TO authenticated
  USING (
    public.current_user_has_role('ti_administrador_institucional', institution_id)
  )
  WITH CHECK (
    public.current_user_has_role('ti_administrador_institucional', institution_id)
  );
