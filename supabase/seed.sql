-- Portal da CPA - dados iniciais
-- Rode depois do schema.sql. Pode ser executado mais de uma vez.
-- Para voltar a demonstração ao estado inicial, use scripts/restaurar-demo.mjs.
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
-- (Chat e Meet genéricos até a CPA enviar os links da sala; e-mail citado no Relatório de
-- Autoavaliação 2025)
insert into public.configuracoes (id, chat_url, meet_url, horario, email_cpa) values
  (1, 'https://chat.google.com', 'https://meet.google.com',
   'Segunda a sexta, das 14h às 19h (com agendamento ou no plantão online).',
   'cpa@impacta.edu.br')
on conflict (id) do nothing;
update public.configuracoes set email_cpa = 'cpa@impacta.edu.br' where id = 1 and email_cpa is null;

-- Relatórios oficiais anteriores, publicados pela Impacta em account.impacta.edu.br (página da CPA).
-- Ficam como link para o PDF oficial (não são copiados para o Storage).
-- Data: relatórios anuais = 31/03 do ano seguinte (prazo de postagem do relatório de
-- autoavaliação no e-MEC); Relato Institucional 2023 = data do arquivo no site oficial.
insert into public.relatorios (titulo, tipo, data, arquivo_url) values
  ('Relatório de Autoavaliação Institucional 2013', 'Relatório', '2014-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202013.pdf'),
  ('Relatório de Autoavaliação Institucional 2014', 'Relatório', '2015-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202014.pdf'),
  ('Relatório de Autoavaliação Institucional 2015', 'Relatório', '2016-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202015.pdf'),
  ('Relatório de Autoavaliação Institucional 2016', 'Relatório', '2017-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202016.pdf'),
  ('Relatório de Autoavaliação Institucional 2017', 'Relatório', '2018-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202017.pdf'),
  ('Relatório de Autoavaliação Institucional 2018', 'Relatório', '2019-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202018.pdf'),
  ('Relatório de Autoavaliação Institucional 2019', 'Relatório', '2020-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202019.pdf'),
  ('Relatório de Autoavaliação Institucional 2020', 'Relatório', '2021-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202020.pdf'),
  ('Relatório de Autoavaliação Institucional 2022', 'Relatório', '2023-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202022.pdf'),
  ('Relatório de Autoavaliação Institucional 2023', 'Relatório', '2024-03-31', 'https://account.impacta.edu.br/res/files/cpa/Relatorio%20de%20Autoavaliacao%20-%20Faculdade%20Impacta%20-%202023.pdf'),
  ('Relato Institucional 2023', 'Relatório', '2024-02-22', 'https://account.impacta.edu.br/res/files/cpa/Relato%20Institucional%20-%20Faculdade%20Impacta%20-%202023.pdf')
on conflict (arquivo_url) do update
  set titulo = excluded.titulo, tipo = excluded.tipo, data = excluded.data;


-- Primeira pessoa com perfil de administração da CPA
-- (protegida: não pode ser alterada nem apagada pela API, nem pela conta de demonstração)
insert into public.usuarios_cpa (email, nome, role, tipo, protegido) values
  ('marcos.pires@aluno.impacta.edu.br', 'Marcos Felipe Choppick Pires', 'cpa', 'sso', true)
on conflict (email) do update
  set nome = excluded.nome, role = excluded.role, tipo = excluded.tipo, expira_em = null, protegido = true;

-- Contas de demonstração para a avaliação do projeto (dados fictícios).
-- A senha é definida no Supabase Auth pelo script scripts/restaurar-demo.mjs.
insert into public.usuarios_cpa (email, nome, role, tipo, expira_em, protegido) values
  ('aluno.demo@cpa.marcosfc.site',     'Aluno Demonstração',         'aluno', 'sso',   null,         true),
  ('admin.demo@cpa.marcosfc.site',     'Administração Demonstração', 'cpa',   'sso',   null,         true),
  ('coord.demo@cpa.marcosfc.site',     'Coordenação Demonstração',   'coord', 'sso',   null,         true),
  ('avaliador.demo@cpa.marcosfc.site', 'Avaliador Demonstração',     'aval',  'token', '2027-12-31', true)
on conflict (email) do update
  set nome = excluded.nome, role = excluded.role, tipo = excluded.tipo,
      expira_em = excluded.expira_em, protegido = true;
