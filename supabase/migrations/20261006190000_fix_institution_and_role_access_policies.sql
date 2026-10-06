-- Migration: 20261006190000_fix_institution_and_role_access_policies.sql
-- Fix self-read policies on institutions, units, and role_assignments
-- so authenticated users with active memberships can read their own institutions and roles
-- without being blocked during login membership queries.

-- ============================================================================
-- 1. FIX INSTITUTIONS SELECT POLICY
-- Allow users to read an institution if:
--   a) They have active membership/substitution via current_user_has_institution_access(id)
--   b) They have a direct active membership row in that institution (direct check without function recursion)
--   c) They have an invitation for their email
-- ============================================================================
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
        AND m.starts_at <= NOW()
        AND (m.ends_at IS NULL OR m.ends_at > NOW())
    )
    OR id IN (
      SELECT institution_id FROM public.invitations 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- 2. FIX UNITS SELECT POLICY
-- Allow users to read units if:
--   a) They have institution access via current_user_has_institution_access(institution_id)
--   b) Or they have direct active membership in the parent institution
-- ============================================================================
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
        AND m.starts_at <= NOW()
        AND (m.ends_at IS NULL OR m.ends_at > NOW())
    )
  );

-- ============================================================================
-- 3. FIX ROLE ASSIGNMENTS SELECT POLICY
-- Allow users to read role assignments if:
--   a) They are reading their OWN role assignments (user_id = auth.uid())
--   b) Or they have active institution access to see coworkers' role assignments
-- ============================================================================
DROP POLICY IF EXISTS "role_assignments_select" ON public.role_assignments;
CREATE POLICY "role_assignments_select" ON public.role_assignments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_has_institution_access(institution_id)
  );

-- ============================================================================
-- 4. REINFORCE MEMBERSHIPS SELECT POLICY
-- Ensure self-read is always permitted and coworkers within institution can read
-- ============================================================================
DROP POLICY IF EXISTS "memberships_select" ON public.user_institution_memberships;
CREATE POLICY "memberships_select" ON public.user_institution_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_has_institution_access(institution_id)
  );
