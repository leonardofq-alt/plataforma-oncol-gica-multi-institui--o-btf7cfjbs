import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/typed-client'
import { Profile } from '@/types/oncology'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  aalLevel: 'aal1' | 'aal2' | null
  requiresMfaUpgrade: boolean
  setRequiresMfaUpgrade: (val: boolean) => void
  signIn: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>
  signOut: () => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
  verifyMfaOtp: (factorId: string, challengeId: string, code: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [requiresMfaUpgrade, setRequiresMfaUpgrade] = useState(false)

  // Derive aal level from current session
  const aalLevel =
    (session?.user?.app_metadata?.aal as 'aal1' | 'aal2') || (session ? 'aal1' : null)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await db.from('profiles').select('*').eq('id', userId).single()

      if (!error && data) {
        setProfile(data as Profile)
      }
    } catch (e) {
      console.error('Error fetching profile:', e)
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // FORBIDDEN: no async/await inside this callback — sync only
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (newSession?.user) {
        // Trigger async profile load safely outside
        fetchProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const res = await supabase.auth.signInWithPassword({ email, password })
    if (!res.error && res.data.user) {
      await fetchProfile(res.data.user.id)
    }
    return res
  }

  const signOut = async () => {
    setProfile(null)
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const verifyMfaOtp = async (factorId: string, challengeId: string, code: string) => {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    })
    if (!error) {
      setRequiresMfaUpgrade(false)
      const sessionRes = await supabase.auth.getSession()
      setSession(sessionRes.data.session)
    }
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        aalLevel,
        requiresMfaUpgrade,
        setRequiresMfaUpgrade,
        signIn,
        signOut,
        refreshProfile,
        verifyMfaOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
