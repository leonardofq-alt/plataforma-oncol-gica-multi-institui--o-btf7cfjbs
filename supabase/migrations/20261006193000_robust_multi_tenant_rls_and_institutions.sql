-- Migration: 20261006193000_robust_multi_tenant_rls_and_institutions.sql
-- Description: Unify and robustly fix RLS policies for tenant onboarding and memberships.
-- Ensures that:
-- 1) Any authenticated active user can read active institutions and units they belong to (direct membership or access function)
-- 2) current_user_has_institution_access is resilient and performant (SECURITY DEFINER STABLE)
-- 3) Rodrigo (disabled profile, ended membership) remains strictly blocked (returns 0 rows)
-- 4) Leonardo, Camila, and Marcos (active profiles & memberships) have full access to their respective institutions

-- Recreate current_user_has_institution_access with full safety
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
      AND (s.ends_at IS NULL OR s.ends_at > NOW())
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1. INSTITUTIONS SELECT POLICY
DROP POLICY IF EXISTS "institutions_select_membership" ON public.institutions;
CREATE POLICY "institutions_select_membership" ON public.institutions
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_institution_access(id)
    OR EXISTS (
      SELECT 1 FROM public.user_institution_memberships m
      JOIN public.profiles p ON p.id = m.user_id
      WHERE m.user_id = auth.uid()
        AND m.institution_id = institutions.id
        AND m.status = 'active'
        AND p.status = 'active'
        AND (m.starts_at <= NOW())
        AND (m.ends_at IS NULL OR m.ends_at > NOW())
    )
    OR id IN (
      SELECT institution_id FROM public.invitations 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 2. UNITS SELECT POLICY
DROP POLICY IF EXISTS "units_select_membership" ON public.units;
CREATE POLICY "units_select_membership" ON public.units
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_institution_access(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.user_institution_memberships m
      JOIN public.profiles p ON p.id = m.user_id
      WHERE m.user_id = auth.uid()
        AND m.institution_id = units.institution_id
        AND m.status = 'active'
        AND p.status = 'active'
        AND (m.starts_at <= NOW())
        AND (m.ends_at IS NULL OR m.ends_at > NOW())
    )
  );

-- 3. USER_INSTITUTION_MEMBERSHIPS SELECT POLICY
DROP POLICY IF EXISTS "memberships_select" ON public.user_institution_memberships;
CREATE POLICY "memberships_select" ON public.user_institution_memberships
  FOR SELECT TO authenticated
  USING (
    (
      user_id = auth.uid() 
      AND status = 'active'
      AND (starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at > NOW())
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
    )
    OR public.current_user_has_institution_access(institution_id)
  );

-- 4. ROLE_ASSIGNMENTS SELECT POLICY
DROP POLICY IF EXISTS "role_assignments_select" ON public.role_assignments;
CREATE POLICY "role_assignments_select" ON public.role_assignments
  FOR SELECT TO authenticated
  USING (
    (
      user_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
    )
    OR public.current_user_has_institution_access(institution_id)
  );
