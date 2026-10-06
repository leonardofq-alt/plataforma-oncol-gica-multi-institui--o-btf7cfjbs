// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          entity: string
          entity_id: string | null
          id: string
          institution_id: string | null
          metadata: Json | null
          new_version: Json | null
          occurred_at: string
          patient_id: string | null
          previous_version: Json | null
          reason: string | null
          unit_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          new_version?: Json | null
          occurred_at?: string
          patient_id?: string | null
          previous_version?: Json | null
          reason?: string | null
          unit_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          new_version?: Json | null
          occurred_at?: string
          patient_id?: string | null
          previous_version?: Json | null
          reason?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_events_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_events_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_events_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      break_glass_access: {
        Row: {
          approved_by: string | null
          created_at: string
          expires_at: string
          id: string
          institution_id: string
          justification: string
          patient_id: string | null
          resource_type: string
          starts_at: string
          status: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          expires_at: string
          id?: string
          institution_id: string
          justification: string
          patient_id?: string | null
          resource_type?: string
          starts_at?: string
          status?: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          institution_id?: string
          justification?: string
          patient_id?: string | null
          resource_type?: string
          starts_at?: string
          status?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'break_glass_access_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'break_glass_access_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'break_glass_access_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      institution_security_settings: {
        Row: {
          id: string
          institution_id: string
          mfa_enforced_role_ids: string[]
          mfa_enforced_unit_ids: string[]
          require_mfa_for_all: boolean
          session_timeout_minutes: number
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          mfa_enforced_role_ids?: string[]
          mfa_enforced_unit_ids?: string[]
          require_mfa_for_all?: boolean
          session_timeout_minutes?: number
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          mfa_enforced_role_ids?: string[]
          mfa_enforced_unit_ids?: string[]
          require_mfa_for_all?: boolean
          session_timeout_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'institution_security_settings_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: true
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
        ]
      }
      institutions: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          institution_id: string
          invited_by: string
          role_id: string
          status: string
          token: string
          unit_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          institution_id: string
          invited_by: string
          role_id: string
          status?: string
          token: string
          unit_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          institution_id?: string
          invited_by?: string
          role_id?: string
          status?: string
          token?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitations_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitations_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      patient_contacts: {
        Row: {
          address: string | null
          contact_type: string | null
          created_at: string
          email: string | null
          id: string
          institution_id: string
          is_primary: boolean
          patient_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id: string
          is_primary?: boolean
          patient_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id?: string
          is_primary?: boolean
          patient_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patient_contacts_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_contacts_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
        ]
      }
      patient_duplicate_candidates: {
        Row: {
          candidate_patient_id: string
          confirmed_by: string | null
          confirmed_different_at: string | null
          created_at: string
          id: string
          institution_id: string
          matched_on: string
          patient_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          candidate_patient_id: string
          confirmed_by?: string | null
          confirmed_different_at?: string | null
          created_at?: string
          id?: string
          institution_id: string
          matched_on: string
          patient_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          candidate_patient_id?: string
          confirmed_by?: string | null
          confirmed_different_at?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          matched_on?: string
          patient_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patient_duplicate_candidates_candidate_patient_id_fkey'
            columns: ['candidate_patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_duplicate_candidates_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_duplicate_candidates_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
        ]
      }
      patient_files: {
        Row: {
          document_type: string
          id: string
          institution_id: string
          mime_type: string | null
          origin: string | null
          original_name: string
          patient_id: string
          size_bytes: number | null
          state: string
          storage_path: string
          unit_id: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          document_type: string
          id?: string
          institution_id: string
          mime_type?: string | null
          origin?: string | null
          original_name: string
          patient_id: string
          size_bytes?: number | null
          state?: string
          storage_path: string
          unit_id?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          document_type?: string
          id?: string
          institution_id?: string
          mime_type?: string | null
          origin?: string | null
          original_name?: string
          patient_id?: string
          size_bytes?: number | null
          state?: string
          storage_path?: string
          unit_id?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patient_files_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_files_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_files_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      patient_identifiers: {
        Row: {
          created_at: string
          id: string
          identifier_type: string
          identifier_value: string
          institution_id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier_type: string
          identifier_value: string
          institution_id: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier_type?: string
          identifier_value?: string
          institution_id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patient_identifiers_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_identifiers_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
        ]
      }
      patient_institution_links: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          patient_id: string
          status: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          patient_id: string
          status?: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          patient_id?: string
          status?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'patient_institution_links_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_institution_links_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_institution_links_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      patient_merge_events: {
        Row: {
          id: string
          institution_id: string
          merged_at: string
          performed_by: string
          primary_patient_id: string
          reason: string
          secondary_patient_id: string
          snapshot: Json
        }
        Insert: {
          id?: string
          institution_id: string
          merged_at?: string
          performed_by: string
          primary_patient_id: string
          reason: string
          secondary_patient_id: string
          snapshot: Json
        }
        Update: {
          id?: string
          institution_id?: string
          merged_at?: string
          performed_by?: string
          primary_patient_id?: string
          reason?: string
          secondary_patient_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'patient_merge_events_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_merge_events_primary_patient_id_fkey'
            columns: ['primary_patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_merge_events_secondary_patient_id_fkey'
            columns: ['secondary_patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
        ]
      }
      patient_representatives: {
        Row: {
          authorization_level: string
          created_at: string
          email: string | null
          id: string
          institution_id: string
          name: string
          patient_id: string
          phone: string | null
          relationship: string
          updated_at: string
        }
        Insert: {
          authorization_level?: string
          created_at?: string
          email?: string | null
          id?: string
          institution_id: string
          name: string
          patient_id: string
          phone?: string | null
          relationship: string
          updated_at?: string
        }
        Update: {
          authorization_level?: string
          created_at?: string
          email?: string | null
          id?: string
          institution_id?: string
          name?: string
          patient_id?: string
          phone?: string | null
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patient_representatives_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_representatives_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
        ]
      }
      patients: {
        Row: {
          birth_date: string | null
          communication_channel: string | null
          communication_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          institution_id: string
          mother_name: string | null
          name: string
          registration_number: string | null
          sex: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          communication_channel?: string | null
          communication_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id: string
          mother_name?: string | null
          name: string
          registration_number?: string | null
          sex?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          communication_channel?: string | null
          communication_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id?: string
          mother_name?: string | null
          name?: string
          registration_number?: string | null
          sex?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patients_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patients_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          contact_email: string | null
          created_at: string
          display_name: string
          id: string
          phone: string | null
          preferred_language: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          display_name: string
          id: string
          phone?: string | null
          preferred_language?: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          preferred_language?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_assignments: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          role_id: string
          status: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          role_id: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          role_id?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'role_assignments_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'role_assignments_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'role_assignments_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_professional_role: boolean
          label: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_professional_role?: boolean
          label: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_professional_role?: boolean
          label?: string
        }
        Relationships: []
      }
      specialties: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          role_in_team: string | null
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role_in_team?: string | null
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role_in_team?: string | null
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          name: string
          specialty_id: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          name: string
          specialty_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          specialty_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teams_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teams_specialty_id_fkey'
            columns: ['specialty_id']
            isOneToOne: false
            referencedRelation: 'specialties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teams_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      temporary_substitutions: {
        Row: {
          authorized_by: string
          created_at: string
          ends_at: string
          id: string
          institution_id: string
          notes: string | null
          reason: string
          starts_at: string
          status: string
          substitute_user_id: string
          substituted_role_id: string | null
          substituted_user_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          authorized_by: string
          created_at?: string
          ends_at: string
          id?: string
          institution_id: string
          notes?: string | null
          reason: string
          starts_at: string
          status?: string
          substitute_user_id: string
          substituted_role_id?: string | null
          substituted_user_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          authorized_by?: string
          created_at?: string
          ends_at?: string
          id?: string
          institution_id?: string
          notes?: string | null
          reason?: string
          starts_at?: string
          status?: string
          substitute_user_id?: string
          substituted_role_id?: string | null
          substituted_user_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'temporary_substitutions_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'temporary_substitutions_substituted_role_id_fkey'
            columns: ['substituted_role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'temporary_substitutions_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      units: {
        Row: {
          code: string | null
          created_at: string
          id: string
          institution_id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          institution_id: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'units_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
        ]
      }
      user_institution_memberships: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          institution_id: string
          starts_at: string
          status: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          institution_id: string
          starts_at?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          institution_id?: string
          starts_at?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_institution_memberships_institution_id_fkey'
            columns: ['institution_id']
            isOneToOne: false
            referencedRelation: 'institutions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_institution_memberships_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_patient: {
        Args: { target_institution_id: string; target_patient_id: string }
        Returns: boolean
      }
      check_patient_duplicates: {
        Args: {
          p_birth_date?: string
          p_cpf?: string
          p_exclude_patient_id?: string
          p_institution_id: string
          p_name: string
        }
        Returns: {
          candidate_birth_date: string
          candidate_id: string
          candidate_name: string
          candidate_status: string
          matched_on: string
        }[]
      }
      create_invitation_rpc: {
        Args: {
          p_email: string
          p_institution_id: string
          p_role_id: string
          p_unit_id: string
        }
        Returns: string
      }
      create_temporary_substitution: {
        Args: {
          p_ends_at?: string
          p_institution_id: string
          p_notes?: string
          p_reason?: string
          p_starts_at?: string
          p_substitute_user_id: string
          p_substituted_role_id?: string
          p_substituted_user_id?: string
          p_unit_id: string
        }
        Returns: string
      }
      current_user_has_institution_access: {
        Args: { target_institution_id: string }
        Returns: boolean
      }
      current_user_has_role: {
        Args: { required_role_code: string; target_institution_id?: string }
        Returns: boolean
      }
      initiate_patient_merge: {
        Args: {
          p_institution_id: string
          p_primary_patient_id: string
          p_reason: string
          p_secondary_patient_id: string
        }
        Returns: string
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity: string
          p_entity_id: string
          p_institution_id: string
          p_metadata?: Json
          p_new_version?: Json
          p_patient_id: string
          p_previous_version?: Json
          p_reason?: string
          p_unit_id: string
        }
        Returns: string
      }
      request_break_glass: {
        Args: {
          p_duration_hours?: number
          p_institution_id: string
          p_justification: string
          p_patient_id: string
          p_unit_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
