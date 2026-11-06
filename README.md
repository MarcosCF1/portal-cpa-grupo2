# Portal da CPA — Grupo 2

Projeto de extensão do Centro Universitário Impacta: portal web da **Comissão Própria de Avaliação (CPA)** com níveis de acesso, dashboards das pesquisas, mural de devolutivas e área de relatórios.

- **Prazo de execução:** 04/09/2026 a 19/11/2026 (120 h)
- **RPE:** Osvaldo Takai · **IPC:** Renato de Souza Santos (Presidente da CPA)
- **Equipe:** Beatriz Naomi Nishimura, Jiulia Paola Rossi Severi, Kaique da Silva Cunha, Marcos Felipe Choppick Pires, Vitória Claudia Furriel da Silva

## O que o portal precisa ter
1. **Login com perfis:** aluno, coordenador, administrador (CPA) e avaliador externo.
2. **Página inicial com dashboards** do Looker Studio (Google Data Studio), conforme o perfil:
   - aluno: pesquisa da CPA;
   - coordenador: pesquisas da CPA, avaliação docente e egressos;
   - avaliador externo: acesso total.
3. **Mural de devolutivas** (público): respostas das áreas às demandas das pesquisas.
4. **Relatórios e boletins:** repositório de documentos (upload e download).
5. **Contato:** links para Google Chat e Google Meet.
6. Tudo **responsivo**.

## Dashboards (dados fictícios, enviados pela CPA)
Os relatórios só abrem com a conta Google da Impacta logada no navegador. Lista em [`docs/dashboards.md`](docs/dashboards.md). Cores e fontes em [`docs/identidade-visual.md`](docs/identidade-visual.md); indicadores em [`docs/kpis-cpa.md`](docs/kpis-cpa.md).

Atenção: o login do portal **não** substitui a permissão do Looker. O avaliador do MEC não tem e-mail Impacta e vai precisar de uma solução própria (compartilhamento individual ou versão pública com dados agregados).

## Plano (6 fases)
Detalhe em [`docs/plano.md`](docs/plano.md).

| Fase | Tema |
|---|---|
| 1 | Levantamento de requisitos |
| 2 | Modelagem e design |
| 3 | Desenvolvimento do portal |
| 4 | Funcionalidades complementares |
| 5 | Testes e validação |
| 6 | Implantação e treinamento |

## Onde fica cada coisa
- **Código:** este repositório.
- **Documentos, planilhas e vídeos:** pasta da equipe no Google Drive (link na aba Execução do portal de extensão).

## Como contribuir
1. Crie uma branch a partir da `main` (`feature/nome-curto`).
2. Faça commits pequenos e com mensagem clara.
3. Abra um Pull Request e peça revisão de um colega antes de juntar na `main`.
