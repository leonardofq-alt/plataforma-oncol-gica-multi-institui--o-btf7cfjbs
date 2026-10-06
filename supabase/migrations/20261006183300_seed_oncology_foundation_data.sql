-- Migration: 20261006183300_seed_oncology_foundation_data.sql
-- Seed mandatory roles, institutions, units, users, relationships, substitutions, duplicate candidates, and patients

DO $$
DECLARE
  v_role_oncologista UUID;
  v_role_residente UUID;
  v_role_navegadora UUID;
  v_role_assistencial UUID;
  v_role_farmacia UUID;
  v_role_regulacao UUID;
  v_role_recepcao UUID;
  v_role_gestao UUID;
  v_role_admin UUID;
  v_role_paciente UUID;
  v_role_representante UUID;

  v_inst_norte UUID := '11111111-1111-1111-1111-111111111111'::uuid;
  v_inst_sul UUID   := '22222222-2222-2222-2222-222222222222'::uuid;

  v_unit_ambulatorio UUID := '11111111-aaaa-1111-1111-111111111111'::uuid;
  v_unit_quimio UUID      := '11111111-bbbb-1111-1111-111111111111'::uuid;
  v_unit_sul_central UUID := '22222222-aaaa-2222-2222-222222222222'::uuid;

  v_user_admin UUID;
  v_user_onco UUID;
  v_user_nav UUID;
  v_user_multi UUID;
  v_user_disabled UUID;
  v_user_recepcao UUID;

  v_spec_clinica UUID;
  v_spec_onco UUID;
  v_spec_mama UUID;

  v_team_onco_mama UUID;

  v_pat_1 UUID := 'aaaaaaaa-1111-1111-1111-111111111111'::uuid;
  v_pat_2 UUID := 'bbbbbbbb-1111-1111-1111-111111111111'::uuid;
  v_pat_3 UUID := 'cccccccc-1111-1111-1111-111111111111'::uuid;
  v_pat_dup_a UUID := 'dddddddd-1111-1111-1111-111111111111'::uuid;
  v_pat_dup_b UUID := 'eeeeeeee-1111-1111-1111-111111111111'::uuid;
  v_pat_sul UUID   := 'ffffffff-2222-2222-2222-222222222222'::uuid;
BEGIN

  -- ==========================================================================
  -- 1. SEED MANDATORY ROLES
  -- ==========================================================================
  INSERT INTO public.roles (code, label, description, is_professional_role)
  VALUES
    ('oncologista_clinico', 'Oncologista Clínico', 'Médico especialista em oncologia clínica', true),
    ('medico_residente', 'Médico Residente', 'Médico em especialização de oncologia', true),
    ('enfermeira_navegadora', 'Enfermeira Navegadora', 'Coordenação do fluxo e jornada do paciente', true),
    ('enfermagem_assistencial', 'Enfermagem Assistencial', 'Enfermagem de aplicação e cuidados gerais', true),
    ('farmacia_clinica_hospitalar', 'Farmácia Clínica/Hospitalar', 'Manipulação, checagem e dispensação de quimioterápicos', true),
    ('regulacao_faturamento', 'Regulação e Faturamento', 'Autorizações, convênios e conferência de guias', true),
    ('recepcao_agendamento', 'Recepção e Agendamento', 'Atendimento de balcão e marcação de consultas', true),
    ('gestao_assistencial_operacional', 'Gestão Assistencial/Operacional', 'Coordenação de equipe e processos de unidade', true),
    ('ti_administrador_institucional', 'TI / Administrador Institucional', 'Governança institucional, segurança e acessos', true),
    ('paciente', 'Paciente', 'Identidade do paciente no portal/acesso pessoal', false),
    ('representante_autorizado', 'Representante Autorizado', 'Familiar ou responsável legal do paciente', false)
  ON CONFLICT (code) DO UPDATE SET 
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_professional_role = EXCLUDED.is_professional_role;

  SELECT id INTO v_role_oncologista FROM public.roles WHERE code = 'oncologista_clinico';
  SELECT id INTO v_role_residente FROM public.roles WHERE code = 'medico_residente';
  SELECT id INTO v_role_navegadora FROM public.roles WHERE code = 'enfermeira_navegadora';
  SELECT id INTO v_role_assistencial FROM public.roles WHERE code = 'enfermagem_assistencial';
  SELECT id INTO v_role_farmacia FROM public.roles WHERE code = 'farmacia_clinica_hospitalar';
  SELECT id INTO v_role_regulacao FROM public.roles WHERE code = 'regulacao_faturamento';
  SELECT id INTO v_role_recepcao FROM public.roles WHERE code = 'recepcao_agendamento';
  SELECT id INTO v_role_gestao FROM public.roles WHERE code = 'gestao_assistencial_operacional';
  SELECT id INTO v_role_admin FROM public.roles WHERE code = 'ti_administrador_institucional';
  SELECT id INTO v_role_paciente FROM public.roles WHERE code = 'paciente';
  SELECT id INTO v_role_representante FROM public.roles WHERE code = 'representante_autorizado';

  -- ==========================================================================
  -- 2. SEED INSTITUTIONS & UNITS
  -- ==========================================================================
  INSERT INTO public.institutions (id, name, code, status)
  VALUES 
    (v_inst_norte, 'Instituto de Oncologia Avançada Norte', 'IOA-NORTE', 'active'),
    (v_inst_sul, 'Centro Oncológico Regional Sul', 'CORS-SUL', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

  INSERT INTO public.units (id, institution_id, name, code, status)
  VALUES
    (v_unit_ambulatorio, v_inst_norte, 'Unidade Ambulatorial e Consultórios', 'AMB-01', 'active'),
    (v_unit_quimio, v_inst_norte, 'Centro de Infusão e Quimioterapia', 'INF-02', 'active'),
    (v_unit_sul_central, v_inst_sul, 'Unidade Central Sul', 'SUL-01', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

  -- Default security settings
  INSERT INTO public.institution_security_settings (institution_id, require_mfa_for_all, mfa_enforced_role_ids)
  VALUES 
    (v_inst_norte, false, ARRAY[v_role_admin, v_role_oncologista]::uuid[]),
    (v_inst_sul, false, ARRAY[v_role_admin]::uuid[])
  ON CONFLICT (institution_id) DO NOTHING;

  -- Specialties
  INSERT INTO public.specialties (name, description)
  VALUES
    ('Oncologia Clínica', 'Tratamento medicamentoso de neoplasias malignas'),
    ('Mastologia Oncológica', 'Prevenção e tratamento de tumores mamários'),
    ('Hematologia', 'Doenças onco-hematológicas'),
    ('Radioterapia', 'Planejamento e aplicação de radiação ionizante')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_spec_onco FROM public.specialties WHERE name = 'Oncologia Clínica';
  SELECT id INTO v_spec_mama FROM public.specialties WHERE name = 'Mastologia Oncológica';

  -- Teams
  INSERT INTO public.teams (id, institution_id, unit_id, name, specialty_id, status)
  VALUES (
    '33333333-3333-3333-3333-333333333333'::uuid,
    v_inst_norte,
    v_unit_ambulatorio,
    'Equipe Multidisciplinar de Mama Norte',
    v_spec_mama,
    'active'
  ) ON CONFLICT (id) DO NOTHING;

  v_team_onco_mama := '33333333-3333-3333-3333-333333333333'::uuid;

  -- ==========================================================================
  -- 3. SEED USERS IN AUTH.USERS (Idempotent, tokens as '', phone as NULL)
  -- ==========================================================================
  -- User 1: leonardofq@gmail.com (TI / Administrador Institucional)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'leonardofq@gmail.com') THEN
    v_user_admin := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_admin,
      '00000000-0000-0000-0000-000000000000',
      'leonardofq@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Leonardo Quintana (TI Admin)"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  ELSE
    SELECT id INTO v_user_admin FROM auth.users WHERE email = 'leonardofq@gmail.com';
  END IF;

  -- Profile and Membership for admin
  INSERT INTO public.profiles (id, display_name, contact_email, status)
  VALUES (v_user_admin, 'Leonardo Quintana', 'leonardofq@gmail.com', 'active')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, status = 'active';

  INSERT INTO public.user_institution_memberships (user_id, institution_id, unit_id, status)
  VALUES (v_user_admin, v_inst_norte, v_unit_ambulatorio, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_assignments (role_id, user_id, institution_id, unit_id, status)
  VALUES (v_role_admin, v_user_admin, v_inst_norte, v_unit_ambulatorio, 'active')
  ON CONFLICT DO NOTHING;

  -- User 2: Oncologista Clínico (Dra. Camila Siqueira)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'camila.oncologista@oncohub.internal') THEN
    v_user_onco := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_onco,
      '00000000-0000-0000-0000-000000000000',
      'camila.oncologista@oncohub.internal',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Dra. Camila Siqueira"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  ELSE
    SELECT id INTO v_user_onco FROM auth.users WHERE email = 'camila.oncologista@oncohub.internal';
  END IF;

  INSERT INTO public.profiles (id, display_name, contact_email, status)
  VALUES (v_user_onco, 'Dra. Camila Siqueira', 'camila.oncologista@oncohub.internal', 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_institution_memberships (user_id, institution_id, unit_id, status)
  VALUES (v_user_onco, v_inst_norte, v_unit_quimio, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_assignments (role_id, user_id, institution_id, unit_id, status)
  VALUES (v_role_oncologista, v_user_onco, v_inst_norte, v_unit_quimio, 'active')
  ON CONFLICT DO NOTHING;

  -- Add onco to team
  INSERT INTO public.team_members (team_id, user_id, role_in_team, status)
  VALUES (v_team_onco_mama, v_user_onco, 'Médica Titular', 'active')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- User 3: Enfermeira Navegadora (Juliana Ramos)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'juliana.navegadora@oncohub.internal') THEN
    v_user_nav := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_nav,
      '00000000-0000-0000-0000-000000000000',
      'juliana.navegadora@oncohub.internal',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Juliana Ramos (Navegadora)"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  ELSE
    SELECT id INTO v_user_nav FROM auth.users WHERE email = 'juliana.navegadora@oncohub.internal';
  END IF;

  INSERT INTO public.profiles (id, display_name, contact_email, status)
  VALUES (v_user_nav, 'Juliana Ramos', 'juliana.navegadora@oncohub.internal', 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_institution_memberships (user_id, institution_id, unit_id, status)
  VALUES (v_user_nav, v_inst_norte, v_unit_ambulatorio, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_assignments (role_id, user_id, institution_id, unit_id, status)
  VALUES (v_role_navegadora, v_user_nav, v_inst_norte, v_unit_ambulatorio, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.team_members (team_id, user_id, role_in_team, status)
  VALUES (v_team_onco_mama, v_user_nav, 'Navegadora de Linha de Cuidado', 'active')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- User 4: Multi-Institution Professional (Dr. Marcos Valente - Atua em Norte e Sul)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'marcos.valente@oncohub.internal') THEN
    v_user_multi := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_multi,
      '00000000-0000-0000-0000-000000000000',
      'marcos.valente@oncohub.internal',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Dr. Marcos Valente"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  ELSE
    SELECT id INTO v_user_multi FROM auth.users WHERE email = 'marcos.valente@oncohub.internal';
  END IF;

  INSERT INTO public.profiles (id, display_name, contact_email, status)
  VALUES (v_user_multi, 'Dr. Marcos Valente', 'marcos.valente@oncohub.internal', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Link 1: Norte (Oncologista Clínico)
  INSERT INTO public.user_institution_memberships (user_id, institution_id, unit_id, status)
  VALUES (v_user_multi, v_inst_norte, v_unit_ambulatorio, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_assignments (role_id, user_id, institution_id, unit_id, status)
  VALUES (v_role_oncologista, v_user_multi, v_inst_norte, v_unit_ambulatorio, 'active')
  ON CONFLICT DO NOTHING;

  -- Link 2: Sul (Gestão Operacional)
  INSERT INTO public.user_institution_memberships (user_id, institution_id, unit_id, status)
  VALUES (v_user_multi, v_inst_sul, v_unit_sul_central, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_assignments (role_id, user_id, institution_id, unit_id, status)
  VALUES (v_role_gestao, v_user_multi, v_inst_sul, v_unit_sul_central, 'active')
  ON CONFLICT DO NOTHING;

  -- User 5: Disabled User (Dr. Rodrigo Inativo)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rodrigo.desativado@oncohub.internal') THEN
    v_user_disabled := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_disabled,
      '00000000-0000-0000-0000-000000000000',
      'rodrigo.desativado@oncohub.internal',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Dr. Rodrigo (Desativado)"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  ELSE
    SELECT id INTO v_user_disabled FROM auth.users WHERE email = 'rodrigo.desativado@oncohub.internal';
  END IF;

  INSERT INTO public.profiles (id, display_name, contact_email, status)
  VALUES (v_user_disabled, 'Dr. Rodrigo Medeiros (Inativo)', 'rodrigo.desativado@oncohub.internal', 'disabled')
  ON CONFLICT (id) DO UPDATE SET status = 'disabled';

  INSERT INTO public.user_institution_memberships (user_id, institution_id, unit_id, status, ends_at)
  VALUES (v_user_disabled, v_inst_norte, v_unit_quimio, 'ended', NOW() - INTERVAL '10 days')
  ON CONFLICT DO NOTHING;

  -- User 6: Recepção e Agendamento
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tatiane.recepcao@oncohub.internal') THEN
    v_user_recepcao := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_recepcao,
      '00000000-0000-0000-0000-000000000000',
      'tatiane.recepcao@oncohub.internal',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Tatiane Silva (Recepção)"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  ELSE
    SELECT id INTO v_user_recepcao FROM auth.users WHERE email = 'tatiane.recepcao@oncohub.internal';
  END IF;

  INSERT INTO public.profiles (id, display_name, contact_email, status)
  VALUES (v_user_recepcao, 'Tatiane Silva', 'tatiane.recepcao@oncohub.internal', 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_institution_memberships (user_id, institution_id, unit_id, status)
  VALUES (v_user_recepcao, v_inst_norte, v_unit_ambulatorio, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_assignments (role_id, user_id, institution_id, unit_id, status)
  VALUES (v_role_recepcao, v_user_recepcao, v_inst_norte, v_unit_ambulatorio, 'active')
  ON CONFLICT DO NOTHING;

  -- ==========================================================================
  -- 4. SEED ACTIVE TEMPORARY SUBSTITUTION
  -- ==========================================================================
  -- Dr. Marcos Valente substitutes Dra. Camila Siqueira during medical congress
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
    v_inst_norte,
    v_unit_quimio,
    v_user_onco,
    v_role_oncologista,
    v_user_multi,
    v_user_admin,
    'Cobertura de plantão oncológico durante Congresso Brasileiro de Oncologia Clínica',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '6 days',
    'active',
    'Substituição integral de consultas e liberações da infusão.'
  ) ON CONFLICT DO NOTHING;

  -- ==========================================================================
  -- 5. SEED FICTIONAL PATIENTS (Phase 1 Administrative Identity ONLY)
  -- ==========================================================================
  -- Patient 1: Maria das Dores Silva (Norte - Ambulatório)
  INSERT INTO public.patients (id, institution_id, unit_id, name, birth_date, sex, mother_name, status, communication_channel, registration_number, created_by)
  VALUES (
    v_pat_1,
    v_inst_norte,
    v_unit_ambulatorio,
    'Maria das Dores Silva',
    '1968-04-12',
    'F',
    'Ana Francisca da Silva',
    'active',
    'whatsapp',
    'REG-2026-0012',
    v_user_admin
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.patient_identifiers (patient_id, institution_id, identifier_type, identifier_value)
  VALUES 
    (v_pat_1, v_inst_norte, 'CPF', '123.456.789-00'),
    (v_pat_1, v_inst_norte, 'CNS_SUS', '700100200300400'),
    (v_pat_1, v_inst_norte, 'PRONTUARIO', 'PR-08819')
  ON CONFLICT (patient_id, identifier_type, identifier_value) DO NOTHING;

  INSERT INTO public.patient_contacts (patient_id, institution_id, phone, email, address, is_primary)
  VALUES (v_pat_1, v_inst_norte, '(11) 98765-4321', 'maria.silva@exemplo.com.br', 'Av. Paulista, 1000, Apto 42 - SP', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.patient_representatives (patient_id, institution_id, name, relationship, phone, authorization_level)
  VALUES (v_pat_1, v_inst_norte, 'Carlos Eduardo Silva', 'Filho', '(11) 97777-1111', 'legal_guardian')
  ON CONFLICT DO NOTHING;

  -- Patient 2: José Roberto Almeida (Norte - Quimio)
  INSERT INTO public.patients (id, institution_id, unit_id, name, birth_date, sex, mother_name, status, communication_channel, registration_number, created_by)
  VALUES (
    v_pat_2,
    v_inst_norte,
    v_unit_quimio,
    'José Roberto de Almeida',
    '1955-09-23',
    'M',
    'Helena Ferreira Almeida',
    'active',
    'telefone',
    'REG-2026-0045',
    v_user_admin
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.patient_identifiers (patient_id, institution_id, identifier_type, identifier_value)
  VALUES 
    (v_pat_2, v_inst_norte, 'CPF', '234.567.890-11'),
    (v_pat_2, v_inst_norte, 'PRONTUARIO', 'PR-09102')
  ON CONFLICT (patient_id, identifier_type, identifier_value) DO NOTHING;

  -- Patient 3: Beatriz Mendes Castro (Norte)
  INSERT INTO public.patients (id, institution_id, unit_id, name, birth_date, sex, mother_name, status, communication_channel, registration_number, created_by)
  VALUES (
    v_pat_3,
    v_inst_norte,
    v_unit_ambulatorio,
    'Beatriz Mendes Castro',
    '1982-11-05',
    'F',
    'Lucia Helena Castro',
    'active',
    'email',
    'REG-2026-0078',
    v_user_admin
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.patient_identifiers (patient_id, institution_id, identifier_type, identifier_value)
  VALUES 
    (v_pat_3, v_inst_norte, 'CPF', '345.678.901-22')
  ON CONFLICT (patient_id, identifier_type, identifier_value) DO NOTHING;

  -- ==========================================================================
  -- 6. SEED TWO PATIENT DUPLICATE CANDIDATES
  -- ==========================================================================
  -- Candidate A: Antonio Carlos Albuquerque (Original)
  INSERT INTO public.patients (id, institution_id, unit_id, name, birth_date, sex, mother_name, status, communication_channel, registration_number, created_by)
  VALUES (
    v_pat_dup_a,
    v_inst_norte,
    v_unit_ambulatorio,
    'Antonio Carlos Albuquerque',
    '1974-06-18',
    'M',
    'Maria da Gloria Albuquerque',
    'active',
    'whatsapp',
    'REG-2026-0101',
    v_user_admin
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.patient_identifiers (patient_id, institution_id, identifier_type, identifier_value)
  VALUES 
    (v_pat_dup_a, v_inst_norte, 'CPF', '456.789.012-33'),
    (v_pat_dup_a, v_inst_norte, 'PRONTUARIO', 'PR-0101')
  ON CONFLICT (patient_id, identifier_type, identifier_value) DO NOTHING;

  -- Candidate B: Antonio C. Albuquerque (Duplicate candidate entered from regulation)
  INSERT INTO public.patients (id, institution_id, unit_id, name, birth_date, sex, mother_name, status, communication_channel, registration_number, created_by)
  VALUES (
    v_pat_dup_b,
    v_inst_norte,
    v_unit_ambulatorio,
    'Antonio C Albuquerque',
    '1974-06-18',
    'M',
    'Maria Gloria Albuquerque',
    'active',
    'telefone',
    'REG-2026-0102',
    v_user_admin
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.patient_identifiers (patient_id, institution_id, identifier_type, identifier_value)
  VALUES 
    (v_pat_dup_b, v_inst_norte, 'CPF', '456.789.012-33'),
    (v_pat_dup_b, v_inst_norte, 'PRONTUARIO', 'PR-0102')
  ON CONFLICT (patient_id, identifier_type, identifier_value) DO NOTHING;

  -- Link as duplicate candidate pair in pending state
  INSERT INTO public.patient_duplicate_candidates (
    patient_id,
    candidate_patient_id,
    institution_id,
    matched_on,
    status
  ) VALUES (
    v_pat_dup_a,
    v_pat_dup_b,
    v_inst_norte,
    'CPF idêntico (456.789.012-33) e data de nascimento idêntica (18/06/1974)',
    'pending'
  ) ON CONFLICT DO NOTHING;

  -- ==========================================================================
  -- 7. PATIENT IN REGIONAL SUL (PROVE ISOLATION)
  -- ==========================================================================
  INSERT INTO public.patients (id, institution_id, unit_id, name, birth_date, sex, mother_name, status, communication_channel, registration_number, created_by)
  VALUES (
    v_pat_sul,
    v_inst_sul,
    v_unit_sul_central,
    'Claudio Fernando Guimarães',
    '1961-02-14',
    'M',
    'Teresa Guimarães',
    'active',
    'whatsapp',
    'SUL-REG-0001',
    v_user_multi
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.patient_identifiers (patient_id, institution_id, identifier_type, identifier_value)
  VALUES 
    (v_pat_sul, v_inst_sul, 'CPF', '567.890.123-44')
  ON CONFLICT (patient_id, identifier_type, identifier_value) DO NOTHING;

  -- Initial Audit Event inserted directly as migration seed
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
    v_inst_norte,
    v_unit_ambulatorio,
    v_user_admin,
    v_pat_1,
    'SYSTEM_BOOTSTRAP',
    'system',
    'seed',
    NULL,
    jsonb_build_object('version', 'Phase-1-Foundation'),
    'Carga inicial de dados de fundação oncológica',
    NULL
  );

END $$;
