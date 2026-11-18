-- Portal da CPA - Faculdade Impacta
-- Esquema do banco (Supabase / Postgres). Pode ser executado mais de uma vez.

-- ------------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------------

create table if not exists public.dashboards (
  id          text primary key,
  titulo      text not null,
  descricao   text,
  roles       text[] not null default '{}',
  url         text not null,
  ordem       int  not null default 0
);

create table if not exists public.mural (
  id         bigint generated always as identity primary key,
  area       text not null,
  demanda    text not null,
  resposta   text not null,
  status     text not null default 'Em andamento' check (status in ('Resolvido','Em andamento')),
  data       date not null default current_date,
  criado_por text
);

create table if not exists public.relatorios (
  id          bigint generated always as identity primary key,
  titulo      text not null,
  tipo        text not null default 'Relatório' check (tipo in ('Relatório','Boletim','Ata')),
  data        date not null default current_date,
  arquivo_url text not null
);

-- Pessoas com acesso além dos alunos (coordenação, CPA e avaliadores externos).
-- Alunos @aluno.impacta.edu.br entram sem cadastro prévio, com perfil "aluno".
create table if not exists public.usuarios_cpa (
  email      text primary key check (email = lower(email)),
  nome       text,
  role       text not null check (role in ('coord','cpa','aval')),
  tipo       text not null default 'sso' check (tipo in ('sso','token')),
  token      text,               -- legado (versão anterior usava token); não é mais usado no login
  expira_em  date,
  criado_em  timestamptz not null default now()
);

create table if not exists public.configuracoes (
  id        int primary key default 1 check (id = 1),
  chat_url  text,
  meet_url  text,
  horario   text
);

create table if not exists public.logs_acesso (
  id          bigint generated always as identity primary key,
  email       text not null,
  nome        text,
  role        text,
  metodo      text,
  acessado_em timestamptz not null default now()
);

create table if not exists public.mensagens_contato (
  id        bigint generated always as identity primary key,
  nome      text not null,
  email     text not null,
  mensagem  text not null,
  enviada_em timestamptz not null default now()
);

-- Controle de envio de códigos (limita tentativas por e-mail)
create table if not exists public.envios_codigo (
  id        bigint generated always as identity primary key,
  email     text not null,
  enviado_em timestamptz not null default now()
);
alter table public.envios_codigo add column if not exists ip text;
create index if not exists envios_codigo_email_idx on public.envios_codigo (email, enviado_em desc);
create index if not exists envios_codigo_ip_idx on public.envios_codigo (ip, enviado_em desc);

-- Um registro por arquivo (permite o script de envio rodar mais de uma vez)
create unique index if not exists relatorios_arquivo_url_key on public.relatorios (arquivo_url);

-- ------------------------------------------------------------------
-- Perfil do usuário logado (calculado no banco, nunca no navegador)
-- ------------------------------------------------------------------

create or replace function public.meu_perfil()
returns text
language sql
stable
security definer
set search_path = public
as $$
  with e as (select lower(coalesce(auth.jwt() ->> 'email', '')) as email)
  select coalesce(
    (select u.role from public.usuarios_cpa u, e
      where u.email = e.email
        and (u.expira_em is null or u.expira_em >= current_date)),
    (select 'aluno' from e
      where e.email ~ '^[a-z0-9_.-]+@aluno\.impacta\.edu\.br$'),
    'vis'
  );
$$;

grant execute on function public.meu_perfil() to anon, authenticated;

create or replace function public.eh_cpa()
returns boolean language sql stable security definer set search_path = public
as $$ select public.meu_perfil() = 'cpa' $$;

grant execute on function public.eh_cpa() to anon, authenticated;

-- Perfil e nome do usuário logado (coordenação e avaliadores não podem ler usuarios_cpa)
create or replace function public.meus_dados()
returns json language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'perfil', public.meu_perfil(),
    'nome', (select u.nome from public.usuarios_cpa u
              where u.email = lower(coalesce(auth.jwt() ->> 'email', '')))
  )
$$;

grant execute on function public.meus_dados() to authenticated;

-- ------------------------------------------------------------------
-- Permissões de acesso às tabelas (o RLS abaixo decide as linhas)
-- ------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant select on public.dashboards, public.mural, public.relatorios, public.configuracoes to anon, authenticated;
grant update on public.dashboards, public.configuracoes to authenticated;
grant insert, update, delete on public.mural, public.relatorios to authenticated;
grant select, insert, update, delete on public.usuarios_cpa to authenticated;
grant select, insert on public.logs_acesso to authenticated;
grant select, delete on public.mensagens_contato to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- ------------------------------------------------------------------
-- Segurança por linha (RLS)
-- ------------------------------------------------------------------

alter table public.dashboards        enable row level security;
alter table public.mural             enable row level security;
alter table public.relatorios        enable row level security;
alter table public.usuarios_cpa      enable row level security;
alter table public.configuracoes     enable row level security;
alter table public.logs_acesso       enable row level security;
alter table public.mensagens_contato enable row level security;
alter table public.envios_codigo     enable row level security;

-- Dashboards: cada perfil vê apenas os painéis liberados para ele
drop policy if exists dashboards_ler on public.dashboards;
create policy dashboards_ler on public.dashboards for select
  using (public.meu_perfil() = any (roles) or public.eh_cpa());
drop policy if exists dashboards_editar on public.dashboards;
create policy dashboards_editar on public.dashboards for update
  using (public.eh_cpa()) with check (public.eh_cpa());

-- Mural e relatórios: leitura pública, escrita só da CPA
drop policy if exists mural_ler on public.mural;
create policy mural_ler on public.mural for select using (true);
drop policy if exists mural_escrever on public.mural;
create policy mural_escrever on public.mural for all
  using (public.eh_cpa()) with check (public.eh_cpa());

drop policy if exists relatorios_ler on public.relatorios;
create policy relatorios_ler on public.relatorios for select using (true);
drop policy if exists relatorios_escrever on public.relatorios;
create policy relatorios_escrever on public.relatorios for all
  using (public.eh_cpa()) with check (public.eh_cpa());

-- Configurações (links de contato): leitura pública, edição da CPA
drop policy if exists config_ler on public.configuracoes;
create policy config_ler on public.configuracoes for select using (true);
drop policy if exists config_editar on public.configuracoes;
create policy config_editar on public.configuracoes for update
  using (public.eh_cpa()) with check (public.eh_cpa());

-- Usuários autorizados: só a CPA vê e altera
drop policy if exists usuarios_cpa_admin on public.usuarios_cpa;
create policy usuarios_cpa_admin on public.usuarios_cpa for all
  using (public.eh_cpa()) with check (public.eh_cpa());

-- Logs: cada pessoa registra o próprio acesso; só a CPA consulta
drop policy if exists logs_inserir on public.logs_acesso;
create policy logs_inserir on public.logs_acesso for insert to authenticated
  with check (lower(email) = lower(auth.jwt() ->> 'email') and role = public.meu_perfil());
drop policy if exists logs_ler on public.logs_acesso;
create policy logs_ler on public.logs_acesso for select using (public.eh_cpa());

-- Mensagens de contato: gravadas pelo servidor; só a CPA lê e apaga
drop policy if exists mensagens_ler on public.mensagens_contato;
create policy mensagens_ler on public.mensagens_contato for select using (public.eh_cpa());
drop policy if exists mensagens_apagar on public.mensagens_contato;
create policy mensagens_apagar on public.mensagens_contato for delete using (public.eh_cpa());

-- envios_codigo: sem políticas = acesso apenas pelo servidor (service role)

-- ------------------------------------------------------------------
-- Armazenamento dos PDFs de relatórios
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('relatorios', 'relatorios', true, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = true, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

drop policy if exists relatorios_arquivos_ler on storage.objects;
create policy relatorios_arquivos_ler on storage.objects for select
  using (bucket_id = 'relatorios');
drop policy if exists relatorios_arquivos_enviar on storage.objects;
create policy relatorios_arquivos_enviar on storage.objects for insert
  with check (bucket_id = 'relatorios' and public.eh_cpa());
drop policy if exists relatorios_arquivos_apagar on storage.objects;
create policy relatorios_arquivos_apagar on storage.objects for delete
  using (bucket_id = 'relatorios' and public.eh_cpa());
