-- Portal da CPA - dados iniciais
-- Rode depois do schema.sql. Pode ser executado mais de uma vez.
-- Os relatórios em PDF entram pelo script scripts/upload-relatorios.mjs.

-- Dashboards do Looker Studio (dados fictícios enviados pela CPA)
insert into public.dashboards (id, titulo, descricao, roles, url, ordem) values
  ('pres', 'Aluno(a) Presencial',
   'Pesquisa institucional respondida pelos alunos dos cursos presenciais.',
   array['aluno','coord','cpa','aval'],
   'https://datastudio.google.com/embed/reporting/c6fac40f-46c9-489d-a63f-653537ca5719/page/p_k1tjc7bebd', 1),
  ('ead', 'Aluno(a) EAD',
   'Pesquisa institucional respondida pelos alunos dos cursos a distância.',
   array['aluno','coord','cpa','aval'],
   'https://datastudio.google.com/embed/reporting/a29dac9a-c940-4eec-9d63-7d811debf2ec/page/p_k1tjc7bebd', 2),
  ('prof', 'Professores',
   'Avaliação institucional do ponto de vista dos professores.',
   array['coord','cpa','aval'],
   'https://datastudio.google.com/embed/reporting/ee6a7999-c41a-41e7-9c73-2ac0fff59d49/page/p_k1tjc7bebd', 3),
  ('adm', 'Corpo técnico-administrativo',
   'Pesquisa respondida pelos colaboradores das áreas administrativas.',
   array['coord','cpa','aval'],
   'https://datastudio.google.com/embed/reporting/d1cfe171-e39a-47bd-abc1-c131be08d632/page/p_k1tjc7bebd', 4)
on conflict (id) do update
  set titulo = excluded.titulo,
      descricao = excluded.descricao,
      roles = excluded.roles,
      ordem = excluded.ordem;
-- A URL não é sobrescrita: se a CPA trocou o link pelo portal, ele é mantido.

-- Devolutivas iniciais do mural (só entram se ainda não existirem)
insert into public.mural (area, demanda, resposta, status, data)
select v.area, v.demanda, v.resposta, v.status, v.data::date
from (values
  ('Biblioteca',
   'Alunos solicitaram horário estendido nas semanas de avaliação.',
   'A biblioteca passou a operar até as 22h nas duas semanas anteriores às provas.',
   'Resolvido', '2026-10-20'),
  ('Secretaria Acadêmica',
   'Prazo elevado para emissão de declarações de matrícula e histórico.',
   'Emissão automatizada pelo portal do aluno com entrega em até 24 horas úteis.',
   'Resolvido', '2026-09-30'),
  ('Infraestrutura e TI',
   'Oscilação de sinal Wi-Fi nos laboratórios do 2º andar.',
   'Novos access points adquiridos; instalação agendada para a janela de manutenção de dezembro.',
   'Em andamento', '2026-11-05')
) as v(area, demanda, resposta, status, data)
where not exists (
  select 1 from public.mural m where m.area = v.area and m.demanda = v.demanda
);

-- Links de atendimento da página Contato
insert into public.configuracoes (id, chat_url, meet_url, horario) values
  (1, 'https://chat.google.com', 'https://meet.google.com',
   'Segunda a sexta, das 14h às 19h (com agendamento ou no plantão online).')
on conflict (id) do nothing;

-- Primeira pessoa com perfil de administração da CPA
insert into public.usuarios_cpa (email, nome, role, tipo) values
  ('marcos.pires@aluno.impacta.edu.br', 'Marcos Felipe Choppick Pires', 'cpa', 'sso')
on conflict (email) do update
  set nome = excluded.nome, role = excluded.role, tipo = excluded.tipo, expira_em = null;
