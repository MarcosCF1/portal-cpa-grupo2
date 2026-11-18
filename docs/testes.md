# Testes

Plano e resultado dos testes do Portal da CPA, rodados no portal publicado (https://cpa.marcosfc.site) em **18/11/2026**.

| Bateria | Como rodar | Resultado em 18/11/2026 |
|---|---|---|
| API: permissões, segurança e casos de erro | `npm run testar:api` ([scripts/testar-api.mjs](../scripts/testar-api.mjs)) | **104 de 104 OK** (sem `--com-email`; uma rodada anterior, com `--com-email` e antes do teste do acesso liberado pela demonstração, também passou inteira) |
| Telas no navegador (Edge, 1366 px e 390 px), prints e erros de JavaScript | `npm run testar:telas` ([scripts/testar-telas.mjs](../scripts/testar-telas.mjs)) | **188 de 188 OK** (inclui 0 erros de JavaScript e 0 telas com rolagem horizontal em 390 px) |
| Sintaxe de todos os `.js`/`.mjs` | `npm run check` | **15 de 15 arquivos OK** |

Os dois scripts entram pelas contas de demonstração, criam só dados de teste e apagam tudo no final. Não enviam e-mails: o envio do código e o do formulário de contato nas telas são simulados no navegador, e a bateria da API só manda uma mensagem de contato real com `--com-email` (foi usado uma vez, em 18/11, e gerou 1 e-mail para a caixa da CPA). Onde um teste depende do envio de e-mail, a conferência real foi feita pela API do Supabase (código errado, senha errada).

Legenda: **OK** = passou na data indicada.

## 1. Testes funcionais por perfil

### Visitante (sem login)
| Verificação | Resultado |
|---|---|
| Lê o mural, com resumo, filtro "Resolvidas" e busca (sem resultado mostra "Nada encontrado") | OK |
| Lê os 3 relatórios oficiais; o PDF público abre (HTTP 200) | OK |
| Página de contato mostra horário, Chat e Meet; formulário vazio mostra erro; envio mostra confirmação | OK |
| Não vê nenhum painel (consulta a `dashboards` volta vazia) | OK |
| Não aparece "Dashboards" nem "Acessos e Perfis" no menu | OK |

### Aluno (`aluno.demo`)
| Verificação | Resultado |
|---|---|
| Login pela tela com e-mail e senha | OK |
| Perfil calculado no banco = `aluno` | OK |
| Vê só as abas Aluno(a) Presencial e Aluno(a) EAD | OK |
| Mural sem botões de administração; `#acessos` volta para Dashboards | OK |
| Não publica no mural, não cadastra relatório, não cria nem altera painel, não envia PDF (bloqueado pelo banco) | OK |
| Não lê `usuarios_cpa` nem o histórico | OK |
| Registra o próprio acesso; não consegue registrar acesso em nome de outra pessoa | OK |
| `/api/convite` recusa (403) | OK |
| Sair apaga a sessão do navegador | OK |

### Coordenação (`coord.demo`) e avaliador externo (`avaliador.demo`)
| Verificação | Coord | Avaliador |
|---|:-:|:-:|
| Login pela tela com e-mail e senha | OK | OK |
| Perfil = `coord` / `aval` | OK | OK |
| Vê as 4 abas: Presencial, EAD, Professores, Corpo técnico-administrativo | OK | OK |
| Aviso sobre a conta Google do Looker aparece (o do avaliador explica o compartilhamento) | OK | OK |
| Mesmos bloqueios de escrita e leitura do aluno | OK | OK |
| Sair | OK | OK |

### Administração (`admin.demo`)
| Verificação | Resultado |
|---|---|
| Vê os 4 painéis e o menu "Acessos e Perfis" | OK |
| **Painéis**: adiciona "Painel de teste" pela tela (vira aba nova; gravado com perfis cpa, coord, aval); coordenação vê, aluno não vê; edita link e perfis; remove com confirmação | OK |
| Painel com link sem `https` é recusado na tela e no banco | OK |
| Painel com link fora do Looker Studio é recusado na tela e no banco | OK |
| **Mural**: publica devolutiva, alterna para "Resolvido", remove com confirmação; o banco grava quem criou | OK |
| **Relatórios**: envia PDF pela tela, o documento aparece e o PDF abre; remove o documento e o arquivo some do Storage | OK |
| **Contato**: edita links e horário | OK |
| **Acessos**: autoriza `coordenacao.teste@impacta.edu.br` e revoga | OK |
| **Acessos**: convida avaliador externo com validade (na demo o e-mail não é enviado e a tela avisa) | OK |
| **Acessos**: o dono do portal aparece como "Protegido", sem botão Revogar | OK |
| **Tentar revogar o dono** pela API com a sessão da demo (delete, update, upsert e `/api/convite`): nada muda; a linha continua igual no banco | OK |
| Não consegue rebaixar o próprio perfil nem revogar outra conta de demonstração | OK |
| Não cria linha protegida nem outro administrador (tela, banco e `/api/convite`) | OK |
| Histórico de acessos mostra só contas de demonstração e registra "Senha (demonstração)" | OK |
| Mensagens recebidas aparecem; a demo só vê mensagens de contas de demonstração | OK |
| Sair | OK |

### Modelos de e-mail
| Verificação | Resultado |
|---|---|
| Código, convite e contato renderizados (prints em `docs/img/email-*.png`), com assunto e versão em texto | OK |

## 2. Segurança

| Verificação | Resultado |
|---|---|
| Acesso liberado pela conta de demonstração não recebe código por e-mail (`/api/send-code` → 403) | OK |
| Visitante (chave pública, sem sessão) não escreve no mural, não cria painel, não envia PDF | OK |
| Visitante não lê `usuarios_cpa`, `logs_acesso` nem `mensagens_contato` | OK |
| Cadastro público bloqueado: `signUp` devolve `signup_disabled` | OK |
| Perfis sem CPA não escrevem em nenhuma tabela nem no Storage | OK |
| Acessos protegidos não podem ser alterados nem apagados (RLS e `/api/convite`) | OK |
| A demonstração não cria administrador nem vê dados de pessoas reais | OK |
| `/api/convite` sem sessão → 401; sessão de quem não é CPA → 403 | OK |
| Storage recusa arquivo que não é PDF (`text/plain`) | OK |
| Storage recusa PDF acima de 50 MB (arquivo de 51 MB) | OK |
| `GET` em `/api/send-code` → 405 | OK |
| Nenhum segredo no repositório (só a chave pública em `assets/config.js`) e nenhum erro de JavaScript em todas as telas testadas | OK |

## 3. Casos de erro e de borda

| Caso | Comportamento esperado | Resultado |
|---|---|---|
| E-mail vazio no login | tela pede "Informe um e-mail válido"; servidor responde 400 | OK |
| E-mail inválido (`sem-arroba`) | 400 "Informe um e-mail válido." | OK |
| Aluno com formato errado (`joão.silva@aluno.impacta.edu.br`) | tela avisa antes de enviar; servidor responde 403 (`formato`) | OK |
| E-mail externo não autorizado (`@gmail.com`) | 403 "Este e-mail não tem acesso ao portal..." (print 11) | OK |
| `@impacta.edu.br` não autorizado | 403 "ainda não foi autorizado. Peça a liberação à CPA." | OK |
| Avaliador com validade vencida | 403 "O seu acesso terminou em 31/01/2026. Peça a renovação à CPA." | OK |
| Conta de demonstração pedindo código | 403 orienta usar "Acesso de demonstração" (essas contas não têm caixa de e-mail) | OK |
| Código errado | "Código incorreto ou vencido", caixas limpas e campo tremendo (print 14); Supabase devolve `otp_expired` | OK |
| Validade do código (10 min) | configuração do Supabase Auth (Email OTP Expiration = 600 s, conforme o README de instalação) | não conferida por teste nem no painel do Supabase nesta rodada |
| Código vencido | mesma mensagem do código errado (o Supabase devolve o mesmo erro `otp_expired`) | não testado separadamente: exigiria esperar 10 min com um código real enviado por e-mail; o caminho na tela é o mesmo do código errado |
| Reenviar antes de 60 s | botão "Reenviar código" desabilitado com contagem "Novo código em Ns" (print 13) | OK |
| Limite de envios (4º pedido em 10 min) | 429 "Você já pediu vários códigos. Espere 10 minutos..." | OK |
| Senha errada na demonstração | "E-mail ou senha incorretos." (Supabase: `invalid_credentials`) | OK |
| Contato vazio | "Informe o seu nome." (tela) / 400 (servidor) | OK |
| Contato com e-mail inválido ou mensagem curta | 400 com mensagem específica | OK |
| Contato com o campo-armadilha preenchido (robô) | responde 200 e não grava nada | OK |
| 6ª mensagem do mesmo e-mail na mesma hora | 429 "Recebemos várias mensagens deste e-mail na última hora." | OK |
| Upload de arquivo que não é PDF | tela: "O arquivo precisa ser um PDF."; Storage também recusa | OK (tela e Storage) |
| Upload acima de 50 MB (arquivo de 51 MB) | tela: "O arquivo passa de 50 MB."; Storage também recusa | OK (tela e Storage) |
| URL de painel sem `https` / fora do Looker | mensagem na tela e recusa no banco | OK |
| Admin tentando se rebaixar | tela ignora o próprio e-mail; banco recusa (linha protegida) | OK |
| Admin tentando revogar acesso protegido | sem botão na tela; banco e `/api/convite` recusam | OK |
| Logout | sessão apagada; volta ao mural com o botão Entrar | OK |
| Sessão vencida (token e renovação inválidos) | o portal descarta a sessão e mostra a tela de login | OK |
| Sem internet / Supabase fora do ar | "Não foi possível carregar o mural" com "Tentar de novo" (print 80) | OK |
| Painel do Looker sem conta Google Impacta | aviso acima do painel; o iframe mostra "Não é possível acessar o relatório" (prints 20, 30, 40) | OK (limite do Looker, documentado) |

Correções feitas durante esta rodada:
- Em 390 px, a tela Acessos e Perfis tinha rolagem horizontal (468 px) por causa do texto longo de uma opção do campo Perfil. Corrigido no CSS (`min-width: 0` nas grades e `max-width` nos `select`) e com um texto mais curto. Depois da correção, todas as telas ficaram em 390 px.
- Recusas esperadas do banco (por exemplo, a demo tentando criar administrador) apareciam como erro no console. Passaram a ser registradas como aviso; a pessoa continua vendo a mensagem na tela.

### Restauração da demonstração
| Verificação | Resultado |
|---|---|
| Com a sessão de `admin.demo`: apagar uma devolutiva do seed, trocar o link do painel Professores, mudar o horário de atendimento, autorizar um e-mail e enviar um PDF sem cadastro. Depois, `node scripts/restaurar-demo.mjs` | OK: devolutiva de volta, link e horário originais, e-mail removido, PDF órfão apagado do Storage |

## 4. Responsividade

Todas as telas da seção 1 foram abertas em 390 × 844 (celular) e conferidas pelo script: a largura da página nunca passou de 390 px (sem rolagem horizontal). Prints em [`img/mobile/`](img/mobile).

## 5. A realizar pela equipe

Os itens abaixo dependem de pessoas e **ainda não foram feitos**. Ficam com um roteiro sugerido.

### Usabilidade com alunos, coordenadores e avaliadores (Fase 5)
- Participantes: 3 a 5 alunos (presencial e EAD), 2 coordenadores e, se possível, 1 membro da CPA no papel de avaliador externo.
- Tarefas (cronometrar e anotar onde a pessoa travou):
  1. Achar no mural o que foi feito sobre a biblioteca.
  2. Baixar o Relatório de Autoavaliação 2025.
  3. Entrar no portal com o próprio e-mail e abrir o painel do seu público.
  4. Mandar uma dúvida para a CPA pelo formulário.
  5. (Coordenação) Abrir o painel Professores.
- Ao final: nota de 1 a 5 para "foi fácil" e uma pergunta aberta ("o que mudaria?").
- Registrar as respostas numa planilha na pasta da equipe e as correções numa nova versão.

### Validação com a CPA
- Apresentar ao Presidente da CPA o portal com a conta de administração real.
- Conferir: perfis de cada painel, textos do mural, links reais de Chat e Meet, e-mail que recebe as mensagens, remetente dos e-mails.
- Pedir o link do painel de **egressos** e cadastrá-lo (Dashboards → Adicionar painel).

### Treinamento da CPA (Fase 6)
- Sessão de 30 a 40 minutos usando o [manual do usuário](manual-do-usuario.md), seção 6.
- Roteiro: publicar e marcar uma devolutiva; enviar e remover um PDF; adicionar um painel; autorizar uma coordenadora; convidar um avaliador; ler o histórico e responder uma mensagem.
- Combinar quem da CPA fica responsável por cada tarefa e onde pedir ajuda técnica.

### Acompanhamento de uso
- Olhar o histórico de acessos uma vez por semana no primeiro mês e anotar dúvidas que chegarem pelo contato.
