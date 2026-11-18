# Acessibilidade e desempenho

Verificações automáticas e por teclado feitas em **18/11/2026** no portal publicado (https://cpa.marcosfc.site), sem participação de usuários reais. Ferramentas: [axe-core](https://github.com/dequelabs/axe-core) 4.x pelo navegador (Edge, sem interface), um roteiro de navegação só por teclado e o Lighthouse 12.8.

Como repetir:

```
npm run testar:acessibilidade     # axe-core em todas as telas + teclado
npx lighthouse "https://cpa.marcosfc.site/#mural" --preset=desktop
npx lighthouse "https://cpa.marcosfc.site/#login"                  # perfil de celular
```

## 1. axe-core em todas as telas

Telas analisadas, em 1366 px **e** em 390 px (com os quadros de administração abertos, para incluir os formulários):

- Visitante: mural, relatórios, contato, login, acesso de demonstração, tela do código e (390 px) menu aberto.
- Aluno, coordenação e avaliador: Dashboards.
- Administração: Dashboards, mural, relatórios, contato e as 5 abas de Acessos e Perfis.

O painel do Looker é uma página do Google dentro de um quadro e fica fora da análise.

| Rodada | Violações sérias/críticas | Outras violações |
|---|---|---|
| 1ª (antes das correções) | **2 regras**: `label-content-name-mismatch` (logo do topo, 37 telas) e `scrollable-region-focusable` (tabelas com rolagem, 4 telas) | nenhuma |
| 2ª (depois das correções) | **0** | **0** |

Correções:
- **Logo do topo:** o nome acessível ("Portal da CPA, página inicial") não continha o texto visível ("Portal da CPA Faculdade Impacta"), o que atrapalha quem usa comando de voz. Agora o nome é o próprio texto visível + "(página inicial)" escondido.
- **Tabelas com rolagem** (Acessos e Perfis): não dava para rolar pelo teclado. Agora a área tem `tabindex="0"`, `role="region"` e nome.

Contraste: a regra `color-contrast` do axe passou em todas as telas (nenhum texto abaixo de 4,5:1, ou 3:1 nos textos grandes).

## 2. Navegação só por teclado

Resultado da última rodada: **todas as verificações OK** (ver a contagem total em [testes.md](testes.md)).

| Tela | Verificação | Resultado |
|---|---|---|
| Qualquer | 1º Tab mostra "Pular para o conteúdo"; Enter leva o foco ao conteúdo | OK |
| Mural | Tab chega na busca (foco visível), digitar filtra; Tab chega nos filtros; Enter aplica "Resolvidas" | OK |
| Login por código | Tab chega no e-mail; Enter envia; o foco vai para a 1ª caixa; digitar avança de caixa; Backspace volta | OK |
| Acesso de demonstração | Tab chega no link; Enter abre o formulário com o foco no e-mail; Tab até a senha; Enter entra | OK |
| Dashboards | Tab chega nas abas; seta → troca de painel | OK |
| Contato | Tab passa por nome, e-mail e mensagem; o campo-armadilha (anti-robô) fica fora do Tab; Enter no botão envia | OK |
| Menu do celular (390 px) | Tab chega no botão; Enter abre e o foco vai ao 1º link; `aria-expanded` muda; Esc fecha e devolve o foco ao botão | OK |

## 3. Lighthouse (mural e login)

Notas de 0 a 100. "Celular" é o perfil padrão do Lighthouse (aparelho médio, rede 4G lenta simulada); "computador" usa `--preset=desktop`.

| Página | Perfil | Desempenho | Acessibilidade | Boas práticas | SEO | FCP | LCP | CLS |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Mural | celular — antes | 88 | 100 | 100 | 100 | 2,8 s | 2,9 s | 0,101 |
| Mural | celular — depois | 85 | 100 | 100 | 100 | 3,1 s | 3,5 s | **0** |
| Mural | computador — depois | 98 | 100 | 100 | 100 | 0,9 s | 0,9 s | 0 |
| Login | celular — antes | 79 | 100 | 100 | 100 | 2,8 s | 2,8 s | 0,238 |
| Login | celular — depois | **90** | 100 | 100 | 100 | 2,8 s | 2,8 s | **0,083** |
| Login | computador — depois | 97 | 100 | 100 | 100 | 0,9 s | 1,2 s | 0,008 |

Melhorias aplicadas:
- **Deslocamento de layout (CLS):** o maior "pulo" vinha da troca da fonte de reserva pela Space Grotesk. Foi criada uma fonte de reserva com as medidas da Space Grotesk (`size-adjust`, `ascent-override`, `descent-override`, medidos no navegador), e a área de conteúdo reserva altura para o rodapé não subir e descer durante o carregamento.
- **Scripts com `defer`** e `preconnect` para o CDN da biblioteca do Supabase e para o Supabase.

A nota de desempenho no celular varia alguns pontos de uma rodada para outra (rede simulada). O que limita é o tempo até o primeiro conteúdo: a folha de fontes do Google e a biblioteca do Supabase (cerca de 220 KB, 57 KB compactada) vêm de outros servidores. Trocar isso exigiria hospedar as fontes e uma etapa de build, o que fica como melhoria futura.

## 4. Outros cuidados de acessibilidade do portal

- Idioma da página `pt-BR`, títulos de página por tela, um `h1` por tela.
- Abas com `role="tablist"`, `aria-selected` e setas; filtros com `aria-pressed`.
- Mensagens de erro com `role="alert"`; contagens e avisos com `aria-live`.
- Botões **A-** e **A+** (90% a 130%), com a escolha guardada.
- Animações curtas; nada pisca.
- Todos os campos têm rótulo visível.

## 5. Limites

- O conteúdo dos painéis do Looker Studio é do Google e não foi avaliado.
- Ferramentas automáticas encontram parte dos problemas. Ainda falta um teste com leitor de tela (NVDA ou TalkBack) feito por uma pessoa e um teste com usuários com deficiência; os dois estão no roteiro de [testes.md](testes.md#5-validação-com-pessoas).
