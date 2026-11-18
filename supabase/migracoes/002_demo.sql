-- Portal da CPA - migração 002: contas de demonstração e gestão de painéis
-- Rode depois do schema.sql (já aplicado) e antes do seed.sql. Pode ser executada mais de uma vez.
--
-- O que muda:
-- 1. usuarios_cpa aceita o perfil "aluno" (para a conta de demonstração de aluno) e ganha a
--    coluna "protegido": linhas protegidas não podem ser alteradas nem apagadas pela API.
-- 2. Contas de demonstração (@cpa.marcosfc.site) têm limites próprios: não criam outro
--    administrador e não veem o histórico de acesso nem as mensagens de pessoas reais.
-- 3. A CPA pode adicionar e remover painéis (antes só podia trocar a URL).
-- 4. As tabelas editáveis guardam quem criou e quem alterou cada linha, para o script
--    scripts/restaurar-demo.mjs desfazer só o que as contas de demonstração mexeram.

-- ------------------------------------------------------------------
-- 1. Perfil aluno e linhas protegidas em usuarios_cpa
-- ------------------------------------------------------------------
alter table public.usuarios_cpa drop constraint if exists usuarios_cpa_role_check;
alter table public.usuarios_cpa add constraint usuarios_cpa_role_check
  check (role in ('aluno','coord','cpa','aval'));
alter table public.usuarios_cpa add column if not exists protegido boolean not null default false;

-- ------------------------------------------------------------------
-- 2. Conta de demonstração
-- ------------------------------------------------------------------
create or replace function public.eh_demo()
returns boolean language sql stable security definer set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) ~ '^[a-z0-9._-]+@cpa\.marcosfc\.site$'
$$;
grant execute on function public.eh_demo() to anon, authenticated;

-- ------------------------------------------------------------------
-- 3. Autoria das alterações
-- ------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['dashboards','mural','relatorios','configuracoes','usuarios_cpa'] loop
    execute format('alter table public.%I add column if not exists criado_por text', t);
    execute format('alter table public.%I add column if not exists atualizado_por text', t);
  end loop;
end $$;

-- Preenche criado_por (na criação) e atualizado_por (sempre) com o e-mail de quem está
-- logado. Quando a escrita vem do servidor (chave de serviço, sem e-mail no token),
-- mantém o valor enviado.
create or replace function public.registrar_autor()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  quem text := nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(quem, new.criado_por);
  end if;
  new.atualizado_por := coalesce(quem, new.atualizado_por);
  return new;
end
$$;

drop trigger if exists autor on public.dashboards;
create trigger autor before insert or update on public.dashboards
  for each row execute function public.registrar_autor();
drop trigger if exists autor on public.mural;
create trigger autor before insert or update on public.mural
  for each row execute function public.registrar_autor();
drop trigger if exists autor on public.relatorios;
create trigger autor before insert or update on public.relatorios
  for each row execute function public.registrar_autor();
drop trigger if exists autor on public.configuracoes;
create trigger autor before insert or update on public.configuracoes
  for each row execute function public.registrar_autor();
drop trigger if exists autor on public.usuarios_cpa;
create trigger autor before insert or update on public.usuarios_cpa
  for each row execute function public.registrar_autor();

-- ------------------------------------------------------------------
-- 4. Painéis: só endereços do Looker Studio; CPA adiciona e remove
-- ------------------------------------------------------------------
alter table public.dashboards drop constraint if exists dashboards_url_looker;
alter table public.dashboards add constraint dashboards_url_looker
  check (url ~ '^https://(lookerstudio|datastudio)\.google\.com/');

grant insert, update, delete on public.dashboards to authenticated;

drop policy if exists dashboards_inserir on public.dashboards;
create policy dashboards_inserir on public.dashboards for insert
  with check (public.eh_cpa());
drop policy if exists dashboards_apagar on public.dashboards;
create policy dashboards_apagar on public.dashboards for delete
  using (public.eh_cpa());

-- ------------------------------------------------------------------
-- 5. usuarios_cpa: uma política por operação
-- ------------------------------------------------------------------
drop policy if exists usuarios_cpa_admin on public.usuarios_cpa;

drop policy if exists usuarios_cpa_ler on public.usuarios_cpa;
create policy usuarios_cpa_ler on public.usuarios_cpa for select
  using (public.eh_cpa());

-- Ninguém cria linha protegida pela API; conta de demonstração não cria administrador
drop policy if exists usuarios_cpa_inserir on public.usuarios_cpa;
create policy usuarios_cpa_inserir on public.usuarios_cpa for insert
  with check (public.eh_cpa() and not protegido
              and (not public.eh_demo() or role <> 'cpa'));

drop policy if exists usuarios_cpa_alterar on public.usuarios_cpa;
create policy usuarios_cpa_alterar on public.usuarios_cpa for update
  using (public.eh_cpa() and not protegido)
  with check (public.eh_cpa() and not protegido
              and (not public.eh_demo() or role <> 'cpa'));

drop policy if exists usuarios_cpa_apagar on public.usuarios_cpa;
create policy usuarios_cpa_apagar on public.usuarios_cpa for delete
  using (public.eh_cpa() and not protegido);

-- ------------------------------------------------------------------
-- 6. Histórico e mensagens: a conta de demonstração só vê o que é de demonstração
-- ------------------------------------------------------------------
drop policy if exists logs_ler on public.logs_acesso;
create policy logs_ler on public.logs_acesso for select
  using (public.eh_cpa() and (not public.eh_demo() or email like '%@cpa.marcosfc.site'));

drop policy if exists mensagens_ler on public.mensagens_contato;
create policy mensagens_ler on public.mensagens_contato for select
  using (public.eh_cpa() and (not public.eh_demo() or email like '%@cpa.marcosfc.site'));
drop policy if exists mensagens_apagar on public.mensagens_contato;
create policy mensagens_apagar on public.mensagens_contato for delete
  using (public.eh_cpa() and (not public.eh_demo() or email like '%@cpa.marcosfc.site'));

-- ------------------------------------------------------------------
-- 7. Contas protegidas (o dono do portal e as contas de demonstração)
-- ------------------------------------------------------------------
insert into public.usuarios_cpa (email, nome, role, tipo, expira_em, protegido) values
  ('aluno.demo@cpa.marcosfc.site',     'Aluno Demonstração',       'aluno', 'sso',   null,         true),
  ('admin.demo@cpa.marcosfc.site',     'Administração Demonstração','cpa',  'sso',   null,         true),
  ('coord.demo@cpa.marcosfc.site',     'Coordenação Demonstração', 'coord', 'sso',   null,         true),
  ('avaliador.demo@cpa.marcosfc.site', 'Avaliador Demonstração',   'aval',  'token', '2027-12-31', true)
on conflict (email) do update
  set nome = excluded.nome, role = excluded.role, tipo = excluded.tipo,
      expira_em = excluded.expira_em, protegido = true;

update public.usuarios_cpa set protegido = true
 where email = 'marcos.pires@aluno.impacta.edu.br';
