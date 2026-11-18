# Requisitos do Portal da CPA

Levantados a partir do edital do projeto de extensão ("Portal da CPA: Transparência e Comunicação na Avaliação Institucional"), das orientações da CPA (dashboards enviados em 30/09/2026) e do que foi implementado. A coluna **Situação** diz o que está pronto no portal publicado em https://cpa.marcosfc.site.

## Perfis

| Perfil | Quem é | Como entra |
|---|---|---|
| Visitante | qualquer pessoa, sem login | não entra; vê só as páginas públicas |
| Aluno | aluno com e-mail `@aluno.impacta.edu.br` | código por e-mail, sem cadastro prévio |
| Coordenador | coordenação de curso (`@impacta.edu.br`) | código por e-mail, depois de autorizado pela CPA |
| Avaliador externo | comissão do MEC/INEP (qualquer e-mail) | código por e-mail, autorizado pela CPA com data de validade |
| Administração (CPA) | membros da CPA | código por e-mail, autorizado pela CPA |

Para a avaliação do projeto existem também contas de demonstração (`@cpa.marcosfc.site`) que entram com e-mail e senha. Elas têm os mesmos perfis acima, com os limites descritos no RF13.

## Requisitos funcionais

| Nº | Requisito | Origem | Situação |
|---|---|---|---|
| RF01 | Login com níveis de acesso: aluno, coordenador, administrador (CPA) e avaliador externo. | edital | pronto |
| RF02 | Login sem senha: a pessoa informa o e-mail e recebe um código de 6 dígitos, válido por 10 minutos e de uso único. | equipe | pronto |
| RF03 | Alunos entram com o e-mail `@aluno.impacta.edu.br` sem cadastro prévio; os demais perfis só entram se autorizados pela CPA. | edital / equipe | pronto |
| RF04 | Acesso de avaliador externo com data de validade; depois dela o login é recusado com aviso. | equipe | pronto |
| RF05 | Página inicial com os dashboards do Looker Studio (antigo Google Data Studio) conforme o perfil: aluno vê a pesquisa da CPA; coordenador vê pesquisas da CPA, avaliação docente e egressos; avaliador externo e CPA veem tudo. | edital | pronto (o painel de egressos entra quando a CPA enviar o link, pelo RF06) |
| RF06 | A CPA adiciona, edita (link e perfis que veem) e remove painéis pela própria tela, sem mexer no código. | equipe | pronto |
| RF07 | Mural de devolutivas público, com busca por palavra e filtro por situação (resolvida / em andamento). | edital | pronto |
| RF08 | A CPA publica devolutivas, alterna a situação e remove devolutivas. | edital | pronto |
| RF09 | Área de relatórios e boletins pública, com leitura e download dos PDFs. | edital | pronto |
| RF10 | A CPA envia documentos em PDF (até 50 MB) e remove documentos (o arquivo também é apagado). | edital | pronto |
| RF11 | Página de contato com links do Google Chat e do Google Meet, horário de atendimento e formulário de mensagem; a CPA edita os links e o horário. | edital | pronto (os links reais de Chat/Meet dependem da CPA) |
| RF12 | Tela "Acessos e Perfis" (só CPA): autorizar e-mails da coordenação e da CPA, convidar avaliador externo por e-mail, revogar acessos, ver quem vê o quê, histórico dos últimos acessos e mensagens recebidas. | equipe | pronto |
| RF13 | Contas de demonstração com e-mail e senha para a avaliação do projeto. A conta de administração de demonstração não cria outro administrador, não envia e-mails de convite e só vê o histórico e as mensagens das próprias contas de demonstração. | equipe | pronto |
| RF14 | Acessos protegidos (dono do portal e contas de demonstração) não podem ser alterados nem revogados por ninguém pelo portal ou pela API. | equipe | pronto |
| RF15 | Registro de cada acesso (quem, perfil, quando e como entrou). | equipe | pronto |
| RF16 | Mensagens do formulário de contato chegam por e-mail à CPA e ficam guardadas no portal. | equipe | pronto |

## Requisitos não funcionais

| Nº | Requisito | Como foi atendido |
|---|---|---|
| RNF01 | Responsivo em celular, tablet e computador. | layout fluido, menu lateral no celular; testado em 390 px e 1366 px sem rolagem horizontal ([testes](testes.md)) |
| RNF02 | Segurança do controle de acesso no servidor, não no navegador. | perfil calculado no banco (`meu_perfil()`) e regras RLS em todas as tabelas ([modelo de dados](modelo-de-dados.md)) |
| RNF03 | Nenhum segredo no navegador ou no repositório. | só a chave pública (anon) fica em `assets/config.js`; a chave de serviço e a do Resend ficam nas variáveis da Vercel |
| RNF04 | Proteção contra abuso. | até 3 códigos por e-mail a cada 10 min (e 60 por IP), 5 mensagens de contato por e-mail por hora, campo-armadilha contra robôs, cadastro público desligado no Supabase |
| RNF05 | Acessibilidade. | navegação por teclado, foco visível, `aria-*` nas abas e mensagens, link "Pular para o conteúdo", botões A-/A+ para o tamanho da letra, contraste da identidade visual |
| RNF06 | Identidade visual da Impacta. | cores e fontes de [identidade-visual.md](identidade-visual.md) |
| RNF07 | Mensagens em português simples e erros explicados para a pessoa. | todas as mensagens de erro do Supabase são traduzidas na tela |
| RNF08 | Disponibilidade e custo baixo. | site estático + funções na Vercel e banco no Supabase, nos planos gratuitos |
| RNF09 | Manutenção documentada. | [documentação técnica](documentacao-tecnica.md), [manual do usuário](manual-do-usuario.md) e comentários nas funções principais |
| RNF10 | Privacidade: dados pessoais visíveis só para quem precisa. | e-mails autorizados, histórico de acessos e mensagens só para a CPA; a demonstração não vê dados de pessoas reais |

## Matriz de permissões (perfil × recurso)

"sim" = pode; "–" = não pode. A CPA sempre vê todos os painéis.

| Recurso | Visitante | Aluno | Coordenador | Avaliador externo | Administração (CPA) |
|---|:-:|:-:|:-:|:-:|:-:|
| Mural de devolutivas (ler) | sim | sim | sim | sim | sim |
| Relatórios e boletins (ler e baixar) | sim | sim | sim | sim | sim |
| Contato (Chat, Meet e formulário) | sim | sim | sim | sim | sim |
| Painel Aluno(a) Presencial | – | sim | sim | sim | sim |
| Painel Aluno(a) EAD | – | sim | sim | sim | sim |
| Painel Professores (avaliação docente) | – | – | sim | sim | sim |
| Painel Corpo técnico-administrativo | – | – | sim | sim | sim |
| Painel Egressos (quando a CPA enviar) | – | – | sim | sim | sim |
| Publicar, alternar e remover devolutivas | – | – | – | – | sim |
| Enviar e remover documentos | – | – | – | – | sim |
| Adicionar, editar e remover painéis | – | – | – | – | sim |
| Editar links e horário de atendimento | – | – | – | – | sim |
| Autorizar, convidar e revogar acessos | – | – | – | – | sim (menos acessos protegidos) |
| Histórico de acessos e mensagens recebidas | – | – | – | – | sim |

Os perfis de cada painel ficam na coluna `roles` da tabela `dashboards` e podem ser mudados pela CPA na tela Dashboards → "Editar este painel".

## Fora do escopo (por enquanto)

- Emissão de relatórios personalizados (citada no edital como expansão futura).
- Login único (SSO) com a conta Google da Impacta. O portal usa código por e-mail; os painéis do Looker continuam pedindo a conta Google da Impacta no navegador.
