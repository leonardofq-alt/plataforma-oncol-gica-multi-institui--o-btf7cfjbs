import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/typed-client'
import { useAuth } from './use-auth'
import {
  Institution,
  Unit,
  UserInstitutionMembership,
  RoleAssignment,
  InstitutionSecuritySettings,
} from '@/types/oncology'

interface TenantContextType {
  memberships: UserInstitutionMembership[]
  activeMembership: UserInstitutionMembership | null
  activeInstitution: Institution | null
  activeUnit: Unit | null
  availableUnits: Unit[]
  roles: RoleAssignment[]
  securitySettings: InstitutionSecuritySettings | null
  loading: boolean
  switchInstitution: (institutionId: string, unitId?: string | null) => Promise<void>
  switchUnit: (unitId: string | null) => void
  refreshTenantData: () => Promise<void>
  hasRole: (roleCode: string) => boolean
  isMfaRequiredForSession: boolean
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

const ACTIVE_INST_KEY = 'onco_active_institution_id'
const ACTIVE_UNIT_KEY = 'onco_active_unit_id'

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) throw new Error('useTenant must be used within a TenantProvider')
  return context
}

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user, aalLevel } = useAuth()
  const navigate = useNavigate()

  const [memberships, setMemberships] = useState<UserInstitutionMembership[]>([])
  const [activeInstitution, setActiveInstitution] = useState<Institution | null>(null)
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null)
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([])
  const [roles, setRoles] = useState<RoleAssignment[]>([])
  const [securitySettings, setSecuritySettings] = useState<InstitutionSecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTenantData = useCallback(async () => {
    // If no user is logged in, ensure state is cleaned up
    if (!user) {
      setMemberships([])
      setActiveInstitution(null)
      setActiveUnit(null)
      setAvailableUnits([])
      setRoles([])
      setSecuritySettings(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Ensure we have a valid session before issuing queries
      const { data: sessionData } = await supabase.auth.getSession()
      const currentUserId = sessionData?.session?.user?.id || user.id

      // 1. Fetch active memberships for the user with retry in case session token just attached
      let memData: any = null
      let memError: any = null

      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await db
          .from('user_institution_memberships')
          .select(`
            id, user_id, institution_id, unit_id, status, starts_at, ends_at,
            institutions:institution_id (id, name, code, status, created_at, updated_at),
            units:unit_id (id, institution_id, name, code, status, created_at, updated_at)
          `)
          .eq('user_id', currentUserId)
          .eq('status', 'active')

        memData = res.data
        memError = res.error

        // If returned rows or explicit error without data, break or retry
        if (memData && memData.length > 0) break
        if (memError) {
          console.warn(`Attempt ${attempt + 1} to load memberships had error:`, memError)
        }
        // Small delay if empty, allowing auth token propagation
        if (attempt < 2 && (!memData || memData.length === 0)) {
          await new Promise((r) => setTimeout(r, 200))
        }
      }

      if (memError) {
        console.error('Error fetching memberships:', memError)
        setLoading(false)
        return
      }

      // Defensive fallback: if joined institutions came back null due to join policy nesting,
      // load institutions directly to guarantee activeInstitution is fully populated.
      const rawMemberships = memData || []
      const instIds = Array.from(
        new Set(rawMemberships.map((m: any) => m.institution_id).filter(Boolean)),
      )

      let directInstitutionsMap: Record<string, Institution> = {}
      if (instIds.length > 0) {
        const { data: instData } = await db.from('institutions').select('*').in('id', instIds)

        if (instData) {
          directInstitutionsMap = instData.reduce((acc: Record<string, Institution>, inst: any) => {
            acc[inst.id] = inst
            return acc
          }, {})
        }
      }

      // Also ensure units map fallback
      const unitIds = Array.from(new Set(rawMemberships.map((m: any) => m.unit_id).filter(Boolean)))
      let directUnitsMap: Record<string, Unit> = {}
      if (unitIds.length > 0) {
        const { data: unitData } = await db.from('units').select('*').in('id', unitIds)

        if (unitData) {
          directUnitsMap = unitData.reduce((acc: Record<string, Unit>, u: any) => {
            acc[u.id] = u
            return acc
          }, {})
        }
      }

      const formattedMemberships: UserInstitutionMembership[] = rawMemberships.map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        institution_id: m.institution_id,
        unit_id: m.unit_id,
        status: m.status,
        starts_at: m.starts_at,
        ends_at: m.ends_at,
        institution: m.institutions || directInstitutionsMap[m.institution_id] || null,
        unit: m.units || (m.unit_id ? directUnitsMap[m.unit_id] : null) || null,
      }))

      setMemberships(formattedMemberships)

      if (formattedMemberships.length === 0) {
        setActiveInstitution(null)
        setActiveUnit(null)
        setLoading(false)
        return
      }

      // Determine active institution from localStorage or fallback to first
      const savedInstId = localStorage.getItem(ACTIVE_INST_KEY)
      const chosenMembership =
        formattedMemberships.find((m) => m.institution_id === savedInstId) ||
        formattedMemberships[0]

      const currentInst = chosenMembership.institution || null
      setActiveInstitution(currentInst)
      if (currentInst) {
        localStorage.setItem(ACTIVE_INST_KEY, currentInst.id)
      }

      // Fetch units for current institution
      if (currentInst) {
        const { data: unitData } = await db
          .from('units')
          .select('*')
          .eq('institution_id', currentInst.id)
          .eq('status', 'active')

        const loadedUnits: Unit[] = unitData || []
        setAvailableUnits(loadedUnits)

        // Determine active unit
        const savedUnitId = localStorage.getItem(ACTIVE_UNIT_KEY)
        const chosenUnit =
          loadedUnits.find((u) => u.id === savedUnitId) ||
          chosenMembership.unit ||
          loadedUnits[0] ||
          null

        setActiveUnit(chosenUnit)
        if (chosenUnit) {
          localStorage.setItem(ACTIVE_UNIT_KEY, chosenUnit.id)
        } else {
          localStorage.removeItem(ACTIVE_UNIT_KEY)
        }

        // Fetch roles for this user in this institution
        const { data: roleData } = await db
          .from('role_assignments')
          .select(`
            id, role_id, user_id, institution_id, unit_id, status,
            roles:role_id (id, code, label, description, is_professional_role)
          `)
          .eq('user_id', user.id)
          .eq('institution_id', currentInst.id)
          .eq('status', 'active')

        const loadedRoles: RoleAssignment[] = (roleData || []).map((r: any) => ({
          id: r.id,
          role_id: r.role_id,
          user_id: r.user_id,
          institution_id: r.institution_id,
          unit_id: r.unit_id,
          status: r.status,
          role: r.roles,
        }))
        setRoles(loadedRoles)

        // Fetch security settings for active institution
        const { data: secData } = await db
          .from('institution_security_settings')
          .select('*')
          .eq('institution_id', currentInst.id)
          .single()

        if (secData) {
          setSecuritySettings(secData as InstitutionSecuritySettings)
        }
      }
    } catch (err) {
      console.error('Failed to load tenant context:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTenantData()
  }, [fetchTenantData])

  // Switching institution explicitly resets navigation and clears patient context
  const switchInstitution = async (institutionId: string, unitId?: string | null) => {
    localStorage.setItem(ACTIVE_INST_KEY, institutionId)
    if (unitId) {
      localStorage.setItem(ACTIVE_UNIT_KEY, unitId)
    } else {
      localStorage.removeItem(ACTIVE_UNIT_KEY)
    }

    // If switching between known memberships, update activeInstitution immediately
    const targetMembership = memberships.find((m) => m.institution_id === institutionId)
    if (targetMembership?.institution) {
      setActiveInstitution(targetMembership.institution)
    }

    // Always reset navigation to dashboard index to prevent cross-institution bleed
    navigate('/', { replace: true })
    await fetchTenantData()
  }

  const switchUnit = (unitId: string | null) => {
    if (unitId) {
      localStorage.setItem(ACTIVE_UNIT_KEY, unitId)
      const found = availableUnits.find((u) => u.id === unitId) || null
      setActiveUnit(found)
    } else {
      localStorage.removeItem(ACTIVE_UNIT_KEY)
      setActiveUnit(null)
    }
    // Also reset to dashboard on unit switch
    navigate('/', { replace: true })
  }

  const hasRole = (roleCode: string): boolean => {
    return roles.some((r) => r.role?.code === roleCode && r.status === 'active')
  }

  // Determine if MFA is required for this active session based on institution settings
  const isMfaRequiredForSession = (() => {
    if (!securitySettings) return false
    if (securitySettings.require_mfa_for_all) return true

    // Check if user's roles match enforced role IDs
    if (securitySettings.mfa_enforced_role_ids?.length > 0) {
      const userRoleIds = roles.map((r) => r.role_id)
      const requires = userRoleIds.some((id) => securitySettings.mfa_enforced_role_ids.includes(id))
      if (requires) return true
    }
    return false
  })()

  const activeMembership =
    memberships.find((m) => m.institution_id === activeInstitution?.id) || null

  return (
    <TenantContext.Provider
      value={{
        memberships,
        activeMembership,
        activeInstitution,
        activeUnit,
        availableUnits,
        roles,
        securitySettings,
        loading,
        switchInstitution,
        switchUnit,
        refreshTenantData: fetchTenantData,
        hasRole,
        isMfaRequiredForSession,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}
