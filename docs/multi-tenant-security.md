# Arquitetura de Segurança Multi-Instituição — Fase 1 (Fundação Oncológica)

Este documento detalha o modelo arquitetural de segurança, controle de acesso e isolamento multi-tenant implementado na **Fase 1** da plataforma oncológica.

---

## 1. Princípio Fundamental de Arquitetura

> **A interface NÃO é a camada de segurança.**  
> Toda autorização e validação ocorrem exclusivamente no backend via Supabase Auth, PostgreSQL, Row Level Security (RLS), Storage Policies e funções SQL com `SECURITY DEFINER`.  
> A política adotada é **deny-by-default**: qualquer tabela ou recurso sem autorização explícita é sumariamente negado a qualquer usuário regular. A chave `service_role` **nunca** é exposta ao navegador.

---

## 2. Modelo Multi-Instituição (Multi-Tenancy)

A **instituição é a fronteira primária de segurança**:

1. Todo registro institucional possui `institution_id`.
2. Um profissional pode possuir vínculos (`user_institution_memberships`) com mais de uma instituição/unidade.
3. Estar autenticado em uma instituição **nunca** concede acesso aos dados de outra instituição.
4. Trocar de instituição ou unidade ativa no cliente:
   - Limpa o contexto de paciente em memória;
   - Reseta a navegação para a raiz (`/`);
   - Previne vazamento cruzado de prontuários.
5. Pacientes de instituições diferentes nunca aparecem combinados em listagens ou consultas da API.

---

## 3. Modelo de Autorização Normalizado (Roles & Assignments)

A plataforma **não** armazena autorização em uma coluna fixa `role` na tabela `profiles`. A mesma pessoa pode exercer funções diferentes em unidades ou instituições distintas (ex.: médico assistente na Unidade Norte e gestor na Unidade Sul).

### Estrutura:

- `profiles`: Dados não sensíveis (nome de exibição, idioma, status).
- `roles`: Catálogo padronizado de papéis (código, descrição, bandeira `is_professional_role`).
- `user_institution_memberships`: Vínculo institucional do usuário (`active`, `ended`, `disabled`).
- `role_assignments`: Atribuição explícita de um papel a um usuário em determinada instituição e unidade.

### Papéis Padronizados na Fase 1:

- `oncologista_clinico`
- `medico_residente`
- `enfermeira_navegadora`
- `enfermagem_assistencial`
- `farmacia_clinica_hospitalar`
- `regulacao_faturamento`
- `recepcao_agendamento`
- `gestao_assistencial_operacional`
- `ti_administrador_institucional`
- `paciente` (papel não profissional)
- `representante_autorizado` (papel não profissional)

---

## 4. Funções Auxiliares Centrais de RLS (`SECURITY DEFINER`)

Para evitar lógica insegura duplicada em cada tabela, o banco utiliza 3 funções centrais:

1. `current_user_has_institution_access(target_institution_id UUID)`:
   - Valida se `auth.uid()` possui perfil ativo (`profiles.status = 'active'`);
   - Valida se possui vínculo profissional ativo na instituição (`starts_at <= now()` e `ends_at IS NULL OR ends_at > now()`);
   - Ou valida se possui substituição temporária ativa vigente como substituto.

2. `current_user_has_role(required_role_code TEXT, target_institution_id UUID)`:
   - Valida se o usuário autenticado possui atribuição ativa do papel (`role_assignments`) combinada ao vínculo institucional ativo;
   - Inclui verificação de substituição temporária ativa concedida.

3. `can_access_patient(target_patient_id UUID, target_institution_id UUID)`:
   - Garante que papéis puramente não profissionais (`paciente`, `representante_autorizado`) não tenham acesso à listagem institucional de prontuários;
   - Valida vínculo profissional ativo ou registro de acesso excepcional (`break_glass_access`) ativo e não expirado.

---

## 5. Provas Matemáticas de RLS do Banco de Dados

1. **Usuário da Instituição A não lê pacientes da Instituição B**:  
   A política `patients_select` impõe `can_access_patient(id, institution_id)`, que exige vínculo comprovado em `institution_id`.
2. **Usuário da Instituição A não altera pacientes da Instituição B**:  
   As políticas `patients_insert` e `patients_update` validam `current_user_has_institution_access(institution_id)`.
3. **Usuário desativado perde acesso imediatamente**:  
   `current_user_has_institution_access` exige `profiles.status = 'active'`. Se `profiles.status = 'disabled'`, todas as checagens retornam `false`.
4. **Vínculo encerrado cessa acesso**:  
   Se `ends_at < now()` ou `status = 'ended'`, a consulta de vínculo não retorna linhas.
5. **Profissional com dois vínculos**:  
   Acessa somente dados vinculados ao `institution_id` da query executada.
6. **Paciente com papel atribuído não ganha acesso profissional**:  
   Apenas papéis com `is_professional_role = true` concedem capacidade de consulta e alteração no prontuário administrativo.
7. **Suporte/TI não possui acesso clínico irrestrito**:  
   Para examinar registros de pacientes em situações de exceção, suporte e TI devem abrir requisição formal via `request_break_glass`, que exige justificativa e gera evento de auditoria.

---

## 6. Autenticação Multifator (MFA / Nível AAL2)

A plataforma integra Supabase Auth MFA (TOTP com autenticadores padrão RFC 6238):

- Cada instituição pode exigir MFA geral (`require_mfa_for_all`) ou específico para grupos de papéis sensíveis (ex.: oncologistas e administradores de TI) através da tabela `institution_security_settings`.
- Se o usuário pertence a um grupo protegido, o cliente valida se a sessão atual está no nível `aal2` (autenticação com dois fatores comprovada).
- Se a sessão for apenas `aal1`, o `AuthGuard` bloqueia as operações e exige o cumprimento do desafio MFA via overlay `MfaChallengeOverlay`.

---

## 7. Storage Privado e Políticas de Arquivos

- Bucket: `pacientes-documentos` (definido como estritamente **privado**, `public = false`).
- Acesso somente via **Signed URLs** de curta duração (120 segundos).
- As políticas de storage (`storage.objects`) verificam a existência de registro correspondente em `public.patient_files` e chamam `can_access_patient(patient_id, institution_id)`.
- Usuários de outras instituições **não conseguem baixar arquivos** mesmo conhecendo o caminho (`path`).

---

## 8. Trilha de Auditoria Append-Only (`audit_events`)

- A tabela `audit_events` possui RLS ativado com **negação total** de `UPDATE` e `DELETE`. Nem administradores de sistema conseguem apagar ou alterar eventos passados.
- Todo cadastro, edição, merge, substituição, convite e acesso excepcional dispara o registro server-side via `log_audit_event`, que amarra o autor diretamente em `auth.uid()`.

---

## 9. Governança de Duplicidades e Fusão de Pacientes

- **Nunca há merge automático**: O sistema detecta correspondências de CPF, nome fonético ou data de nascimento idêntica e registra na tabela `patient_duplicate_candidates` como `pending`.
- O usuário autorizado pode:
  1. Confirmar que são pessoas distintas (`confirm_different`);
  2. Iniciar a fusão governada (`initiate_patient_merge`).
- Durante a fusão:
  - O registro secundário **nunca é apagado** (é marcado como `status = 'merged'`);
  - Identificadores, contatos e arquivos são re-apontados para o registro primário;
  - Um snapshot JSONB completo do registro secundário e primário é gravado em `patient_merge_events` para rastreabilidade e reconstituição futura.

---

## 10. Acesso Excepcional (Break-Glass)

Para situações de emergência médica ou suporte técnico em que o profissional não possua vínculo rotineiro com determinado paciente:

- É acionada a RPC `request_break_glass`;
- Justificativa detalhada é **obrigatória**;
- O acesso tem validade máxima de 4 horas;
- O evento é registrado imediatamente na tabela `break_glass_access` e em `audit_events` para conferência posterior pela gestão e auditoria hospitalar.

---

## 11. Como Adicionar Novos Papéis Futuramente

Para adicionar um novo papel profissional ou assistencial:

1. Criar uma nova migration SQL em `supabase/migrations/`;
2. Inserir no catálogo `roles`:
   ```sql
   INSERT INTO public.roles (code, label, description, is_professional_role)
   VALUES ('genetica_oncologica', 'Geneticista Oncológico', 'Aconselhamento genético e hereditariedade', true)
   ON CONFLICT (code) DO NOTHING;
   ```
3. Atribuir o papel aos usuários desejados via `role_assignments`;
4. Se o papel exigir MFA obrigatório, atualizar `institution_security_settings.mfa_enforced_role_ids`.
5. Nenhuma alteração estrutural no código da aplicação é necessária para reconhecer o papel básico no catálogo.
