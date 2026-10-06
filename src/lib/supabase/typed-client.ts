import { supabase as rawClient } from '@/lib/supabase/client'

// Client cast to any to allow dynamic table queries without TS strict overload failures
// while preserving the official single instance and standard configuration from client.ts
export const db = rawClient as any
export const supabase = rawClient
