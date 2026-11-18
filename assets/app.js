/* Portal da CPA · Faculdade Impacta
   Página única com rotas por "#". O login usa a sessão do Supabase Auth;
   o que cada perfil pode ver ou alterar é decidido pelas regras do banco (RLS). */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Configuração e conexão
  // ------------------------------------------------------------------
  var CFG = window.CPA_CONFIG || {};
  var SUPA_URL = String(CFG.supabaseUrl || '').replace(/\/+$/, '');
  var SUPA_KEY = String(CFG.supabaseAnonKey || '');
  var configurado = /^https:\/\//.test(SUPA_URL) && SUPA_KEY && SUPA_KEY.indexOf('__') !== 0;
  var sb = null;
  if (configurado && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
    } catch (e) {
      console.error('Falha ao iniciar o Supabase', e);
      sb = null;
    }
  }

  var RE_ALUNO = /^[a-z0-9_.-]+@aluno\.impacta\.edu\.br$/;
  var RE_IMPACTA = /^[a-z0-9_.+-]+@impacta\.edu\.br$/;
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Contas de demonstração (avaliação do projeto): entram com e-mail e senha
  var RE_DEMO = /^[a-z0-9._-]+@cpa\.marcosfc\.site$/;
  // Só painéis do Looker Studio (o banco tem a mesma regra)
  var RE_LOOKER = /^https:\/\/(lookerstudio|datastudio)\.google\.com\//i;
  var BUCKET = 'relatorios';
  var ESPERA_REENVIO = 60;

  var PERFIS = ['aluno', 'coord', 'cpa', 'aval'];
  var ROLE = { aluno: 'Aluno', coord: 'Coordenador', cpa: 'Admin CPA', aval: 'Avaliador externo', vis: 'Sem perfil' };
  var ROTAS = ['login', 'dashboards', 'mural', 'relatorios', 'contato', 'acessos'];
  var TITULOS = {
    login: 'Entrar', dashboards: 'Dashboards', mural: 'Mural de devolutivas',
    relatorios: 'Relatórios', contato: 'Contato', acessos: 'Acessos e Perfis'
  };

  // Adesão ao questionário (Relatório de Autoavaliação 2025, tabela 1)
  var ADESAO = [
    { seg: 'Presencial', a25: 46, a24: 62, resp: '631 de 1.378' },
    { seg: 'EAD', a25: 30, a24: 38, resp: '1.566 de 4.654' },
    { seg: 'Docentes', a25: 49, a24: 76, resp: '31 de 63' },
    { seg: 'Técnico-adm.', a25: 59, a24: 46, resp: '43 de 73' }
  ];

  // ------------------------------------------------------------------
  // Estado
  // ------------------------------------------------------------------
  var S = {
    pronto: false,
    sessao: null,
    email: '',
    perfil: 'vis',
    nome: '',
    dash: { estado: 'ocioso', itens: [] },
    mural: { estado: 'carregando', itens: [] },
    rels: { estado: 'carregando', itens: [] },
    cfg: { estado: 'carregando', dados: null },
    usuarios: { estado: 'ocioso', itens: [] },
    logs: { estado: 'ocioso', itens: [] },
    msgs: { estado: 'ocioso', itens: [] }
  };

  var UI = {
    view: null,
    dash: null,
    muralFiltro: 'Todos',
    muralBusca: '',
    relBusca: '',
    aba: 'pessoas',
    confirmar: null,
    contatoEnviado: false,
    avisoAutorizar: '',
    login: { etapa: 'email', email: '', liberaEm: 0, verificando: false }
  };
  var timerReenvio = null;

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  function $(s, raiz) { return (raiz || document).querySelector(s); }
  function $$(s, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function seguro(u) { return /^https:\/\//i.test(String(u || '')) ? String(u) : ''; }
  function fmt(d) {
    if (!d) return '';
    var p = String(d).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(d);
  }
  function fmtDataHora(iso) {
    if (!iso) return '';
    var dt = new Date(iso);
    if (isNaN(dt)) return '';
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function maisDias(n) {
    var d = new Date(Date.now() + n * 864e5);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function nomeDoEmail(email) {
    return String(email || '').split('@')[0].split(/[._-]+/).filter(Boolean).map(function (p) {
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    }).join(' ');
  }
  function slug(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'documento';
  }
  function logado() { return !!S.sessao; }
  function temPerfil() { return logado() && S.perfil !== 'vis'; }
  function ehCpa() { return logado() && S.perfil === 'cpa'; }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  var ICONE = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    busca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
    relogio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  function toast(msg, tipo) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (tipo === 'ok' ? ' ok' : '');
    void t.offsetWidth;
    t.classList.add('on');
    clearTimeout(toast.h);
    toast.h = setTimeout(function () { t.classList.remove('on'); }, 3800);
  }

  function ocupado(btn, sim) {
    if (!btn) return;
    btn.disabled = !!sim;
    btn.classList.toggle('ocupado', !!sim);
    btn.setAttribute('aria-busy', sim ? 'true' : 'false');
  }

  // Tradução das mensagens do Supabase para algo que a pessoa entenda
  function msgErro(err, padrao) {
    var m = String((err && (err.message || err.error_description)) || '');
    if (err) console.warn(err);
    if (/row-level security|permission denied|not allowed|unauthorized/i.test(m)) return 'Você não tem permissão para fazer isso.';
    if (/failed to fetch|network|load failed/i.test(m)) return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
    if (/jwt|session/i.test(m)) return 'Sua sessão expirou. Entre de novo.';
    if (/payload too large|exceeded the maximum/i.test(m)) return 'Arquivo grande demais (máximo 50 MB).';
    if (/duplicate|already exists/i.test(m)) return 'Já existe um item igual.';
    return padrao || 'Algo deu errado. Tente de novo.';
  }

  async function postJSON(url, corpo, token) {
    var cab = { 'Content-Type': 'application/json' };
    if (token) cab.Authorization = 'Bearer ' + token;
    var resp;
    try {
      resp = await fetch(url, { method: 'POST', headers: cab, body: JSON.stringify(corpo || {}) });
    } catch (e) {
      throw new Error('Sem conexão. Confira a internet e tente de novo.');
    }
    var dados = null;
    try { dados = await resp.json(); } catch (e) { dados = null; }
    if (!dados || typeof dados !== 'object') {
      throw new Error('O serviço do portal não respondeu. Tente de novo em instantes.');
    }
    if (!resp.ok || dados.ok === false) {
      var erro = new Error(dados.erro || 'Algo deu errado. Tente de novo.');
      erro.status = resp.status;
      erro.dados = dados;
      throw erro;
    }
    return dados;
  }

  async function tokenAtual() {
    if (!sb) return '';
    var r = await sb.auth.getSession();
    return (r && r.data && r.data.session && r.data.session.access_token) || '';
  }

  // ------------------------------------------------------------------
  // Tamanho da fonte (A- / A+)
  // ------------------------------------------------------------------
  var ESCALAS = [0.9, 1, 1.1, 1.2, 1.3];
  var escala = 1;
  try { var salvo = parseFloat(localStorage.getItem('cpa_escala')); if (ESCALAS.indexOf(salvo) > -1) escala = salvo; } catch (e) { /* sem armazenamento */ }
  function aplicarEscala() {
    document.documentElement.style.setProperty('--escala', String(escala));
    try { localStorage.setItem('cpa_escala', String(escala)); } catch (e) { /* sem armazenamento */ }
  }
  function mudarEscala(passo) {
    var i = ESCALAS.indexOf(escala) + passo;
    if (i < 0 || i >= ESCALAS.length) { toast(passo > 0 ? 'Este é o maior tamanho de letra.' : 'Este é o menor tamanho de letra.'); return; }
    escala = ESCALAS[i];
    aplicarEscala();
  }
  aplicarEscala();

  // ------------------------------------------------------------------
  // Topo e menu
  // ------------------------------------------------------------------
  function menu() {
    var m = [];
    if (temPerfil()) m.push(['dashboards', 'Dashboards']);
    m.push(['mural', 'Mural de devolutivas'], ['relatorios', 'Relatórios'], ['contato', 'Contato']);
    if (ehCpa()) m.push(['acessos', 'Acessos e Perfis']);
    return m;
  }

  function htmlLinks() {
    return menu().map(function (i) {
      return '<a href="#' + i[0] + '"' + (UI.view === i[0] ? ' aria-current="page"' : '') + '>' + i[1] + '</a>';
    }).join('');
  }

  function htmlQuem() {
    if (logado()) {
      var nome = S.nome || nomeDoEmail(S.email);
      return '<span class="selo" title="' + esc(S.email) + '"><b>' + esc(nome) + '</b><span>' + esc(ROLE[S.perfil] || S.perfil) + '</span></span>' +
        '<button type="button" class="alt sm" data-act="sair">Sair</button>';
    }
    return '<a class="btn sm" href="#login">Entrar</a>';
  }

  function htmlFonte() {
    return '<span class="fonte" role="group" aria-label="Tamanho da letra">' +
      '<button type="button" data-act="fonte-menos" aria-label="Diminuir a letra">A-</button>' +
      '<button type="button" data-act="fonte-mais" aria-label="Aumentar a letra">A+</button></span>';
  }

  function renderBarra() {
    var barra = $('#barra');
    barra.classList.toggle('logado', logado());
    barra.classList.toggle('longa', menu().length >= 5);
    barra.innerHTML =
      '<a class="logo" href="#' + (temPerfil() ? 'dashboards' : 'mural') + '" ><span class="marca" aria-hidden="true"></span><span>Portal da CPA<small> Faculdade Impacta</small><span class="escondido"> (página inicial)</span></span></a>' +
      '<nav class="menu" aria-label="Principal">' + htmlLinks() + '</nav>' +
      htmlFonte() +
      '<div class="quem">' + htmlQuem() + '</div>' +
      '<button type="button" class="icone abrir-menu" data-act="menu-abrir" aria-label="Abrir menu" aria-expanded="false" aria-controls="gaveta">' + ICONE.menu + '</button>';

    $('#gaveta').innerHTML =
      '<div class="gaveta-topo"><strong>Menu</strong><button type="button" class="icone" data-act="menu-fechar" aria-label="Fechar menu">' + ICONE.fechar + '</button></div>' +
      '<nav aria-label="Principal (celular)">' + htmlLinks() + '</nav>' +
      '<div class="gaveta-pe">' +
        '<div class="linha-fonte"><span>Tamanho da letra</span>' + htmlFonte() + '</div>' +
        '<div class="quem">' + htmlQuem() + '</div>' +
      '</div>';
  }

  function abrirMenu() {
    var g = $('#gaveta'), f = $('#gaveta-fundo');
    g.hidden = false; f.hidden = false;
    requestAnimationFrame(function () { g.classList.add('aberta'); f.classList.add('aberta'); });
    document.body.classList.add('travado');
    var b = $('.abrir-menu'); if (b) b.setAttribute('aria-expanded', 'true');
    var primeiro = $('#gaveta nav a'); if (primeiro) primeiro.focus();
  }
  function fecharMenu(devolverFoco) {
    var g = $('#gaveta'), f = $('#gaveta-fundo');
    if (g.hidden) return;
    g.classList.remove('aberta'); f.classList.remove('aberta');
    document.body.classList.remove('travado');
    var b = $('.abrir-menu'); if (b) b.setAttribute('aria-expanded', 'false');
    setTimeout(function () { g.hidden = true; f.hidden = true; }, 230);
    if (devolverFoco && b) b.focus();
  }

  // ------------------------------------------------------------------
  // Rotas
  // ------------------------------------------------------------------
  // Decide a tela pelo endereço (#mural, #login...). Telas restritas voltam para o login
  // ou para os painéis; a proteção de verdade está no banco (RLS), não aqui.
  function rotaAtual() {
    var v = (location.hash || '').slice(1);
    if (ROTAS.indexOf(v) < 0) v = temPerfil() ? 'dashboards' : 'mural';
    if (v === 'login' && logado()) v = 'dashboards';
    if (v === 'dashboards' && !logado()) v = 'login';
    if (v === 'acessos' && !ehCpa()) v = logado() ? 'dashboards' : 'login';
    return v;
  }

  // Desenha o topo e a tela atual. Chamada a cada troca de rota e depois de cada ação.
  function render() {
    var v = rotaAtual();
    var mudou = v !== UI.view;
    if (mudou) { UI.confirmar = null; UI.contatoEnviado = false; UI.avisoAutorizar = ''; }
    UI.view = v;
    renderBarra();
    fecharMenu(false);
    if (v !== 'login') pararTimer();

    var app = $('#app');
    if (!S.pronto) {
      app.innerHTML = '<div class="carregando"><span class="sk sk-titulo"></span><span class="sk sk-linha"></span><span class="sk sk-linha curta"></span></div>';
      return;
    }
    var html = ({ login: vLogin, dashboards: vDash, mural: vMural, relatorios: vRel, contato: vContato, acessos: vAcessos })[v]();
    app.innerHTML = '<div class="' + (mudou ? 'view anima' : '') + '">' + html + '</div>';
    app.setAttribute('aria-busy', 'false');
    document.title = TITULOS[v] + ' · Portal da CPA – Faculdade Impacta';

    if (v === 'mural') renderListaMural();
    if (v === 'relatorios') renderListaRel();
    if (v === 'login') aoMostrarLogin(mudou);
    if (v === 'acessos' && mudou) carregarAcessos();

    if (mudou) {
      window.scrollTo(0, 0);
      var foco = v === 'login' ? null : $('#app h1');
      if (foco) { foco.setAttribute('tabindex', '-1'); foco.focus({ preventScroll: true }); }
    }
  }

  // Re-renderiza só a área de conteúdo, sem animação de entrada
  function atualizar() { if (S.pronto) render(); }

  // ------------------------------------------------------------------
  // Carregamento de dados
  // ------------------------------------------------------------------
  function semConexao() {
    ['mural', 'rels', 'cfg', 'dash'].forEach(function (k) { S[k].estado = 'erro'; });
  }

  async function carregarPublicos() {
    if (!sb) { semConexao(); return; }
    await Promise.all([carregarMural(), carregarRelatorios(), carregarConfig()]);
  }

  async function carregarMural() {
    S.mural.estado = 'carregando';
    var r = await sb.from('mural').select('id, area, demanda, resposta, status, data').order('data', { ascending: false }).order('id', { ascending: false });
    if (r.error) { console.error(r.error); S.mural.estado = 'erro'; return; }
    S.mural.itens = r.data || [];
    S.mural.estado = 'ok';
  }

  async function carregarRelatorios() {
    S.rels.estado = 'carregando';
    var r = await sb.from('relatorios').select('id, titulo, tipo, data, arquivo_url').order('data', { ascending: false }).order('id', { ascending: false });
    if (r.error) { console.error(r.error); S.rels.estado = 'erro'; return; }
    S.rels.itens = r.data || [];
    S.rels.estado = 'ok';
  }

  async function carregarConfig() {
    S.cfg.estado = 'carregando';
    var r = await sb.from('configuracoes').select('chat_url, meet_url, horario, email_cpa').eq('id', 1).maybeSingle();
    if (r.error) { console.error(r.error); S.cfg.estado = 'erro'; return; }
    S.cfg.dados = r.data || {};
    S.cfg.estado = 'ok';
  }

  async function carregarDashboards() {
    if (!sb || !temPerfil()) { S.dash = { estado: 'ok', itens: [] }; return; }
    S.dash.estado = 'carregando';
    var r = await sb.from('dashboards').select('id, titulo, descricao, roles, url, ordem').order('ordem', { ascending: true });
    if (r.error) { console.error(r.error); S.dash.estado = 'erro'; return; }
    S.dash.itens = r.data || [];
    S.dash.estado = 'ok';
  }

  // Pergunta ao banco quem é a pessoa logada (perfil e nome) e carrega os painéis do perfil.
  async function carregarPerfil() {
    if (!sb || !S.sessao) return;
    S.email = String((S.sessao.user && S.sessao.user.email) || '').toLowerCase();
    var r = await sb.rpc('meus_dados');
    if (!r.error && r.data) {
      S.perfil = r.data.perfil || 'vis';
      S.nome = r.data.nome || '';
    } else {
      var p = await sb.rpc('meu_perfil');
      if (p.error) { console.error(p.error); S.perfil = 'vis'; }
      else S.perfil = p.data || 'vis';
      S.nome = '';
    }
    if (!S.nome) S.nome = nomeDoEmail(S.email);
    await carregarDashboards();
  }

  // Tela Acessos e Perfis: pessoas autorizadas, últimos acessos e mensagens (só CPA).
  async function carregarAcessos() {
    if (!ehCpa()) return;
    S.usuarios.estado = S.logs.estado = S.msgs.estado = 'carregando';
    atualizar();
    var res = await Promise.all([
      sb.from('usuarios_cpa').select('email, nome, role, tipo, expira_em, protegido, criado_em').order('criado_em', { ascending: false }),
      sb.from('logs_acesso').select('email, nome, role, metodo, acessado_em').order('acessado_em', { ascending: false }).limit(100),
      sb.from('mensagens_contato').select('id, nome, email, mensagem, enviada_em').order('enviada_em', { ascending: false }).limit(100)
    ]);
    [['usuarios', res[0]], ['logs', res[1]], ['msgs', res[2]]].forEach(function (par) {
      if (par[1].error) { console.error(par[1].error); S[par[0]].estado = 'erro'; }
      else { S[par[0]].itens = par[1].data || []; S[par[0]].estado = 'ok'; }
    });
    if (UI.view === 'acessos') atualizar();
  }

  function limparSessao() {
    S.sessao = null; S.email = ''; S.perfil = 'vis'; S.nome = '';
    S.dash = { estado: 'ocioso', itens: [] };
    S.usuarios = { estado: 'ocioso', itens: [] };
    S.logs = { estado: 'ocioso', itens: [] };
    S.msgs = { estado: 'ocioso', itens: [] };
  }

  // ------------------------------------------------------------------
  // Blocos reutilizáveis
  // ------------------------------------------------------------------
  function blocoVazio(titulo, texto, acao) {
    return '<div class="vazio"><strong>' + titulo + '</strong>' + (texto ? '<p>' + texto + '</p>' : '') + (acao ? '<div class="acoes">' + acao + '</div>' : '') + '</div>';
  }
  function blocoFalha(oque, acao) {
    var texto = configurado
      ? 'Confira a sua conexão e tente de novo em instantes.'
      : 'O portal ainda não está ligado ao banco de dados.';
    return '<div class="vazio falha" role="status"><strong>Não foi possível carregar ' + oque + '.</strong><p>' + texto + '</p>' +
      (configurado && acao ? '<div class="acoes"><button type="button" class="alt sm" data-act="' + acao + '">Tentar de novo</button></div>' : '') + '</div>';
  }
  function skCartoes(n) {
    var h = '<div class="grade g2" aria-hidden="true">';
    for (var i = 0; i < n; i++) h += '<span class="sk sk-cartao"></span>';
    return h + '</div>';
  }
  function skFilas(n) {
    var h = '<div aria-hidden="true">';
    for (var i = 0; i < n; i++) h += '<span class="sk sk-fila"></span>';
    return h + '</div>';
  }
  function confirmaHtml(chave, pergunta, rotulo) {
    return '<span class="confirma" role="group" aria-label="Confirmar">' + pergunta +
      ' <button type="button" class="perigo cheio sm" data-act="confirmar" data-chave="' + esc(chave) + '">' + (rotulo || 'Remover') + '</button>' +
      '<button type="button" class="alt sm" data-act="cancelar">Cancelar</button></span>';
  }

  // ------------------------------------------------------------------
  // View: login
  // ------------------------------------------------------------------
  function vLogin() {
    var lado = '<section class="acesso-lado" aria-label="Sobre a CPA">' +
      '<div><p class="olho">Comissão Própria de Avaliação</p>' +
      '<h1>Os resultados da avaliação institucional, abertos à comunidade.</h1>' +
      '<p>A CPA aplica o questionário uma vez por ano a alunos, professores e equipe técnica. Aqui ficam os painéis, as respostas das áreas e os relatórios oficiais.</p></div>' +
      '<div class="adesao"><div class="adesao-titulo"><strong>Quem respondeu em 2025</strong><span>Relatório 2025</span></div><ul>' +
      ADESAO.map(function (a) {
        return '<li><span>' + a.seg + '</span><span class="trilho" role="img" aria-label="' + a.seg + ': ' + a.a25 + '% em 2025, ' + a.a24 + '% em 2024 (' + a.resp + ')"><i style="width:' + a.a25 + '%"></i><b style="left:' + a.a24 + '%"></b></span><span>' + a.a25 + '%</span></li>';
      }).join('') +
      '</ul><div class="legenda"><span><i></i>Adesão 2025</span><span><b></b>2024</span></div>' +
      '<p style="margin-top:14px;font-size:.85rem">A participação caiu em três dos quatro públicos. Responder é o que dá peso às devolutivas do mural.</p></div>' +
      '</section>';

    var L = UI.login;
    var form;
    if (L.etapa === 'senha') {
      form = '<form class="acesso-form" data-form="senha" novalidate>' +
        '<h2 id="titulo-login">Acesso de demonstração</h2>' +
        '<p class="regra">Para a avaliação do projeto. As contas e a senha estão no README do repositório; os dados são fictícios.</p>' +
        '<label for="demo-email" style="margin-top:22px">E-mail da conta de demonstração</label>' +
        '<input id="demo-email" type="email" inputmode="email" autocomplete="username" placeholder="aluno.demo@cpa.marcosfc.site" value="' + esc(L.email) + '" required aria-describedby="login-erro">' +
        '<label for="demo-senha">Senha</label>' +
        '<input id="demo-senha" type="password" autocomplete="current-password" required aria-describedby="login-erro">' +
        '<p class="erro" id="login-erro" role="alert" aria-live="assertive"></p>' +
        '<button type="submit" id="btn-senha">Entrar</button>' +
        '<p class="demo-contas">Contas: <code>aluno.demo</code>, <code>coord.demo</code>, <code>avaliador.demo</code> e <code>admin.demo</code>, todas <code>@cpa.marcosfc.site</code>.</p>' +
        '<div class="linha-reenvio"><span></span><button type="button" class="link" data-act="login-codigo">Voltar para o código por e-mail</button></div>' +
        '</form>';
    } else if (L.etapa === 'codigo') {
      var caixas = '';
      for (var i = 0; i < 6; i++) {
        caixas += '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" ' + (i === 0 ? 'autocomplete="one-time-code" ' : 'autocomplete="off" ') +
          'aria-label="Dígito ' + (i + 1) + ' de 6" data-i="' + i + '">';
      }
      form = '<form class="acesso-form" data-form="codigo" novalidate>' +
        '<h2 id="titulo-login">Digite o código</h2>' +
        '<div class="enviado-para">Enviamos 6 números para <strong>' + esc(L.email) + '</strong>. Se não chegar em 1 minuto, confira o spam.</div>' +
        '<fieldset style="border:0;margin:0;padding:0"><legend class="escondido">Código de acesso de 6 dígitos</legend><div class="codigo" id="codigo">' + caixas + '</div></fieldset>' +
        '<p class="erro" id="login-erro" role="alert" aria-live="assertive"></p>' +
        '<button type="submit" id="btn-entrar">Entrar</button>' +
        '<div class="linha-reenvio"><span id="reenvio-info" aria-live="polite"></span>' +
        '<span><button type="button" class="link" data-act="reenviar-codigo" id="btn-reenviar" disabled>Reenviar código</button> · ' +
        '<button type="button" class="link" data-act="trocar-email">Usar outro e-mail</button></span></div>' +
        '</form>';
    } else {
      form = '<form class="acesso-form" data-form="email" novalidate>' +
        '<h2 id="titulo-login">Entrar no portal</h2>' +
        '<p class="regra">Alunos usam o e-mail <code>@aluno.impacta.edu.br</code>. Coordenação, CPA e avaliadores externos precisam estar autorizados pela CPA.</p>' +
        '<label for="login-email" style="margin-top:22px">E-mail</label>' +
        '<input id="login-email" type="email" inputmode="email" autocomplete="email" placeholder="nome@aluno.impacta.edu.br" value="' + esc(L.email) + '" required aria-describedby="login-erro">' +
        '<p class="erro" id="login-erro" role="alert" aria-live="assertive"></p>' +
        '<button type="submit" id="btn-codigo">Receber código</button>' +
        '<p class="publico">Sem login você já pode ver o <a href="#mural">mural de devolutivas</a> e os <a href="#relatorios">relatórios</a>.</p>' +
        '<p class="demo-link"><button type="button" class="link" data-act="login-demo">Acesso de demonstração (avaliação do projeto)</button></p>' +
        '</form>';
    }
    return '<div class="acesso">' + form + lado + '</div>';
  }

  function aoMostrarLogin(mudou) {
    if (UI.login.etapa === 'senha') {
      var d = $('#demo-email');
      if (d && mudou && window.matchMedia('(min-width: 821px)').matches) d.focus();
    } else if (UI.login.etapa === 'codigo') {
      var primeiro = $('#codigo input');
      if (primeiro) primeiro.focus();
      iniciarTimer();
    } else if (mudou) {
      var campo = $('#login-email');
      if (campo && window.matchMedia('(min-width: 821px)').matches) campo.focus();
    }
  }

  function erroLogin(msg, sucesso) {
    var el = $('#login-erro');
    if (!el) { toast(msg); return; }
    el.classList.toggle('sucesso', !!sucesso);
    el.textContent = msg;
  }

  function iniciarTimer() {
    pararTimer();
    function passo() {
      var info = $('#reenvio-info'), btn = $('#btn-reenviar');
      if (!info || !btn) { pararTimer(); return; }
      var falta = Math.ceil((UI.login.liberaEm - Date.now()) / 1000);
      if (falta > 0) {
        info.textContent = 'Novo código em ' + falta + 's';
        btn.disabled = true;
      } else {
        info.textContent = 'Não chegou?';
        btn.disabled = false;
        pararTimer();
      }
    }
    passo();
    timerReenvio = setInterval(passo, 1000);
  }
  function pararTimer() { if (timerReenvio) { clearInterval(timerReenvio); timerReenvio = null; } }

  // Login, etapa 1: confere o formato e pede ao servidor (/api/send-code) o código por e-mail.
  async function pedirCodigo(email, btn) {
    email = String(email || '').trim().toLowerCase();
    var campo = $('#login-email');
    if (campo) campo.removeAttribute('aria-invalid');
    if (!email || !RE_EMAIL.test(email)) {
      if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
      erroLogin('Informe um e-mail válido.');
      return false;
    }
    if (/@aluno\.impacta\.edu\.br$/.test(email) && !RE_ALUNO.test(email)) {
      if (campo) campo.setAttribute('aria-invalid', 'true');
      erroLogin('Este e-mail de aluno não está no formato esperado. Use o endereço fornecido pela faculdade, sem acentos ou espaços.');
      return false;
    }
    if (!sb) { erroLogin('O acesso está indisponível no momento. Tente mais tarde.'); return false; }
    ocupado(btn, true);
    erroLogin('');
    try {
      await postJSON('/api/send-code', { email: email });
      UI.login = { etapa: 'codigo', email: email, liberaEm: Date.now() + ESPERA_REENVIO * 1000, verificando: false };
      return true;
    } catch (e) {
      if (campo && e.status === 403) campo.setAttribute('aria-invalid', 'true');
      erroLogin(e.message);
      return false;
    } finally {
      ocupado(btn, false);
    }
  }

  function lerCodigo() {
    return $$('#codigo input').map(function (i) { return i.value; }).join('');
  }

  function preencherCodigo(desde, digitos) {
    var caixas = $$('#codigo input');
    var j = desde;
    for (var k = 0; k < digitos.length && j < caixas.length; k++, j++) caixas[j].value = digitos[k];
    caixas.forEach(function (c) { c.classList.toggle('cheio', !!c.value); });
    var prox = caixas[Math.min(j, caixas.length - 1)];
    if (prox) prox.focus();
    if (lerCodigo().length === 6) verificarCodigo();
  }

  // Login, etapa 2: confirma os 6 dígitos com o Supabase Auth, que devolve a sessão.
  async function verificarCodigo() {
    var L = UI.login;
    if (L.verificando) return;
    var codigo = lerCodigo();
    if (!/^\d{6}$/.test(codigo)) { erroLogin('Digite os 6 números do código.'); return; }
    L.verificando = true;
    var btn = $('#btn-entrar');
    ocupado(btn, true);
    erroLogin('');
    $$('#codigo input').forEach(function (c) { c.disabled = true; });

    var r = await sb.auth.verifyOtp({ email: L.email, token: codigo, type: 'email' });
    if (r.error) {
      var r2 = await sb.auth.verifyOtp({ email: L.email, token: codigo, type: 'magiclink' });
      if (!r2.error) r = r2;
    }
    L.verificando = false;

    if (r.error || !r.data || !r.data.session) {
      ocupado(btn, false);
      var caixas = $$('#codigo input');
      caixas.forEach(function (c) { c.disabled = false; c.value = ''; c.classList.remove('cheio'); });
      var box = $('#codigo');
      if (box) { box.classList.remove('tremer'); void box.offsetWidth; box.classList.add('tremer'); }
      var m = String((r.error && r.error.message) || '');
      erroLogin(/rate|too many|429/i.test(m) || (r.error && r.error.status === 429)
        ? 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
        : 'Código incorreto ou vencido. Confira os números ou peça um novo código.');
      if (caixas[0]) caixas[0].focus();
      return;
    }

    await concluirLogin(r.data.session, 'Código por e-mail');
  }

  // Entrada com e-mail e senha, só para as contas de demonstração da avaliação do projeto
  async function entrarComSenha(form) {
    var campo = $('#demo-email'), senha = $('#demo-senha');
    var email = String(campo.value || '').trim().toLowerCase();
    campo.removeAttribute('aria-invalid');
    if (!RE_DEMO.test(email)) {
      campo.setAttribute('aria-invalid', 'true'); campo.focus();
      erroLogin('Use uma das contas de demonstração (@cpa.marcosfc.site). Alunos e equipe entram com o código por e-mail.');
      return;
    }
    if (!senha.value) { senha.focus(); erroLogin('Digite a senha.'); return; }
    if (!sb) { erroLogin('O acesso está indisponível no momento. Tente mais tarde.'); return; }
    var btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    erroLogin('');
    UI.login.email = email;
    UI.login.verificando = true;
    var r;
    try {
      r = await sb.auth.signInWithPassword({ email: email, password: senha.value });
    } catch (e) {
      r = { error: e };
    }
    UI.login.verificando = false;
    if (r.error || !r.data || !r.data.session) {
      ocupado(btn, false);
      var m = String((r.error && r.error.message) || '');
      erroLogin(/rate|too many/i.test(m) || (r.error && r.error.status === 429)
        ? 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
        : /fetch|network/i.test(m) ? 'Sem conexão com o servidor. Confira a internet e tente de novo.'
        : 'E-mail ou senha incorretos.');
      senha.value = ''; senha.focus();
      return;
    }
    await concluirLogin(r.data.session, 'Senha (demonstração)');
  }

  // Passos comuns depois de qualquer login: perfil calculado no banco, registro do acesso
  // e ida para os painéis.
  async function concluirLogin(sessao, metodo) {
    S.sessao = sessao;
    await carregarPerfil();
    registrarAcesso(metodo);
    UI.login = { etapa: 'email', email: '', liberaEm: 0, verificando: false };
    toast(temPerfil() ? 'Bem-vindo(a), ' + S.nome + '.' : 'Você entrou, mas o seu e-mail não tem perfil liberado.', temPerfil() ? 'ok' : '');
    if (location.hash === '#dashboards') render(); else location.hash = 'dashboards';
  }

  // Grava o acesso em logs_acesso (o banco confere se e-mail e perfil são mesmo os da sessão)
  function registrarAcesso(metodo) {
    if (!sb || !S.email) return;
    sb.from('logs_acesso').insert({ email: S.email, nome: S.nome, role: S.perfil, metodo: metodo })
      .then(function (r) { if (r.error) console.warn('Registro de acesso não gravado', r.error.message); });
  }

  async function sair() {
    if (sb) {
      try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { console.error(e); }
    }
    limparSessao();
    toast('Você saiu do portal.');
    if (location.hash === '#mural') render(); else location.hash = 'mural';
  }

  // ------------------------------------------------------------------
  // View: dashboards
  // ------------------------------------------------------------------
  function vSemPerfil() {
    return '<p class="olho">Acesso</p><h1>Seu e-mail ainda não tem acesso aos painéis</h1>' +
      '<p class="lead">Você entrou como <strong>' + esc(S.email) + '</strong>, mas este endereço não está autorizado no momento. ' +
      'Se a sua autorização venceu ou você faz parte da coordenação, peça a liberação à CPA.</p>' +
      '<div class="acoes"><a class="btn" href="#contato">Falar com a CPA</a><a class="btn alt" href="#mural">Ver o mural</a><button type="button" class="alt" data-act="sair">Sair</button></div>';
  }

  function vDash() {
    if (!temPerfil()) return vSemPerfil();
    var cab = '<p class="olho">Pesquisa institucional</p><h1>Dashboards</h1>';
    var D = S.dash;
    if (D.estado === 'carregando' || D.estado === 'ocioso') {
      return cab + '<p class="lead"><span class="sk sk-linha" style="display:inline-block;width:280px"></span></p><span class="sk" style="height:46px;width:min(560px,100%);margin-bottom:22px"></span><div class="quadro"><span class="sk"></span></div>';
    }
    if (D.estado === 'erro') return cab + blocoFalha('os painéis', 'recarregar-dash');
    var L = D.itens.filter(function (d) { return (d.roles || []).indexOf(S.perfil) > -1 || ehCpa(); });
    if (!L.length) {
      return cab + (ehCpa()
        ? blocoVazio('Nenhum painel cadastrado.', 'Adicione o primeiro painel no formulário abaixo.') + formNovoPainel()
        : blocoVazio('Nenhum painel liberado para o seu perfil.', 'Fale com a CPA se você precisa de acesso a outra pesquisa.'));
    }
    if (!L.some(function (d) { return d.id === UI.dash; })) UI.dash = L[0].id;
    var cur = L.filter(function (d) { return d.id === UI.dash; })[0];
    var src = seguro(cur.url);

    var h = cab + '<p class="lead">' + plural(L.length, 'painel liberado', 'painéis liberados') + ' para o perfil <strong>' + esc(ROLE[S.perfil]) + '</strong>. Os dados são da pesquisa aplicada pela CPA.</p>';
    if (L.length > 1) {
      h += '<div class="abas" role="tablist" aria-label="Painéis">' + L.map(function (d) {
        return '<button type="button" role="tab" id="aba-' + esc(d.id) + '" aria-controls="painel-dash" aria-selected="' + (d.id === UI.dash) + '" tabindex="' + (d.id === UI.dash ? '0' : '-1') + '" data-act="dash" data-id="' + esc(d.id) + '">' + esc(d.titulo) + '</button>';
      }).join('') + '</div>';
    }
    if (ehCpa()) h += '<p class="atalho-admin"><a href="#ferramentas-paineis" data-act="ir-ferramentas">Adicionar, editar ou remover painéis</a></p>';
    h += '<section id="painel-dash" role="tabpanel" aria-labelledby="aba-' + esc(cur.id) + '">';
    h += '<div class="dash-cab"><div><h2>' + esc(cur.titulo) + '</h2><p class="meta">' + esc(cur.descricao || '') + '</p></div></div>';
    var abrir = src ? '<a class="btn alt sm" href="' + esc(src) + '" target="_blank" rel="noopener">Abrir em nova aba</a>' : '';
    h += S.perfil === 'aval'
      ? '<div class="aviso atencao"><p><strong>Avaliador externo:</strong> o painel é do Looker Studio e pode pedir login Google. Se aparecer "acesso negado", peça à CPA o compartilhamento com o seu e-mail.</p>' + abrir + '</div>'
      : '<div class="aviso"><p><strong>Use a sua conta Google Impacta</strong> (não a pessoal) neste navegador. Sem ela, o Looker Studio mostra "acesso negado".</p>' + abrir + '</div>';
    h += src
      ? '<div class="quadro"><span class="sk" aria-hidden="true"></span><iframe title="Painel: ' + esc(cur.titulo) + '" src="' + esc(src) + '" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe></div>'
      : blocoVazio('Este painel está sem endereço válido.', 'A CPA precisa cadastrar um link https do Looker Studio.');
    h += '</section>';

    if (ehCpa()) {
      var chave = 'dash:' + cur.id;
      h += '<details class="painel admin" id="ferramentas-paineis" style="margin-top:20px"' + (UI.confirmar === chave ? ' open' : '') + '><summary>Editar este painel</summary>' +
        '<form data-form="dash-url" data-id="' + esc(cur.id) + '" novalidate><label for="dash-url">Link de incorporação do Looker Studio</label>' +
        '<input id="dash-url" type="url" value="' + esc(cur.url) + '" placeholder="https://lookerstudio.google.com/embed/reporting/..." required>' +
        '<p class="ajuda">No Looker Studio: Compartilhar → Incorporar relatório → copie o endereço que começa com https.</p>' +
        checksPerfis('dash-edit', cur.roles || []) +
        '<p class="erro" id="dash-erro" role="alert"></p>' +
        '<div class="acoes"><button type="submit">Salvar alterações</button>' +
        (UI.confirmar === chave
          ? confirmaHtml(chave, 'Remover o painel "' + esc(cur.titulo) + '"?')
          : '<button type="button" class="perigo" data-act="pedir-confirmacao" data-chave="' + esc(chave) + '">Remover painel</button>') +
        '</div></form></details>' + formNovoPainel();
    }
    return h;
  }

  // Caixas de seleção dos perfis que veem um painel (a CPA sempre vê todos)
  function checksPerfis(prefixo, marcados) {
    return '<fieldset class="perfis"><legend>Quem vê este painel (a CPA sempre vê)</legend>' +
      [['aluno', 'Alunos'], ['coord', 'Coordenação'], ['aval', 'Avaliadores externos']].map(function (p) {
        return '<label class="check" for="' + prefixo + '-' + p[0] + '"><input type="checkbox" id="' + prefixo + '-' + p[0] + '" value="' + p[0] + '"' +
          (marcados.indexOf(p[0]) > -1 ? ' checked' : '') + '> ' + p[1] + '</label>';
      }).join('') + '</fieldset>';
  }

  function lerPerfis(prefixo) {
    var roles = ['cpa'];
    ['aluno', 'coord', 'aval'].forEach(function (p) { var c = $('#' + prefixo + '-' + p); if (c && c.checked) roles.push(p); });
    return roles;
  }

  function formNovoPainel() {
    return '<details class="painel admin" style="margin-top:14px"><summary>Adicionar painel</summary>' +
      '<form data-form="dash-novo" novalidate>' +
      '<label for="dn-titulo">Título</label><input id="dn-titulo" maxlength="80" placeholder="Ex.: Egressos" required>' +
      '<label for="dn-desc">Descrição</label><input id="dn-desc" maxlength="200" placeholder="Ex.: Pesquisa respondida pelos ex-alunos.">' +
      '<label for="dn-url">Link de incorporação do Looker Studio</label><input id="dn-url" type="url" placeholder="https://lookerstudio.google.com/embed/reporting/..." required>' +
      checksPerfis('dn', ['coord', 'aval']) +
      '<p class="ajuda">O painel de egressos entra por aqui assim que a CPA enviar o link.</p>' +
      '<p class="erro" id="dn-erro" role="alert"></p>' +
      '<div class="acoes"><button type="submit" class="escuro">Adicionar painel</button></div></form></details>';
  }

  // ------------------------------------------------------------------
  // View: mural
  // ------------------------------------------------------------------
  function vMural() {
    var M = S.mural;
    var h = '<div class="cabeca"><div><p class="olho">Devolutivas</p><h1>Mural de devolutivas</h1>' +
      '<p class="lead">O que cada área fez a partir do que alunos, professores e equipe apontaram na pesquisa da CPA.</p></div></div>';
    if (M.estado === 'ok' && M.itens.length) {
      var feitos = M.itens.filter(function (m) { return m.status === 'Resolvido'; }).length;
      h += '<div class="resumo" aria-label="Resumo do mural"><div><b>' + M.itens.length + '</b> publicadas</div><div><b>' + feitos + '</b> resolvidas</div><div><b>' + (M.itens.length - feitos) + '</b> em andamento</div></div>';
    }
    if (!temPerfil() && M.estado !== 'erro') {
      h += '<div class="aviso"><p>Faz parte da comunidade acadêmica ou da comissão do MEC? Entre para ver os painéis das pesquisas.</p><a class="btn sm" href="#login">Entrar</a></div>';
    }
    if (ehCpa()) {
      h += '<details class="painel admin"><summary>Publicar devolutiva</summary><form data-form="mural-novo" novalidate>' +
        '<label for="m-area">Área responsável</label><input id="m-area" maxlength="120" placeholder="Ex.: Biblioteca, TI, Coordenação de ADS" required>' +
        '<label for="m-dem">Demanda apontada na pesquisa</label><textarea id="m-dem" rows="2" maxlength="1000" required></textarea>' +
        '<label for="m-res">Resposta ou ação da área</label><textarea id="m-res" rows="3" maxlength="2000" required></textarea>' +
        '<div class="duas"><div><label for="m-st">Situação</label><select id="m-st"><option>Em andamento</option><option>Resolvido</option></select></div>' +
        '<div><label for="m-data">Data da resposta</label><input id="m-data" type="date" value="' + hoje() + '"></div></div>' +
        '<p class="erro" id="m-erro" role="alert"></p>' +
        '<div class="acoes"><button type="submit" class="escuro">Publicar no mural</button></div></form></details>';
    }
    if (M.estado === 'carregando') return h + skCartoes(4);
    if (M.estado === 'erro') return h + blocoFalha('o mural', 'recarregar-mural');
    if (!M.itens.length) return h + blocoVazio('Nenhuma devolutiva publicada ainda.', 'Assim que as áreas responderem às demandas da pesquisa, as respostas aparecem aqui.');

    h += '<div class="filtros"><div class="busca">' + ICONE.busca + '<label for="busca-mural" class="escondido">Buscar no mural</label>' +
      '<input id="busca-mural" type="search" placeholder="Buscar por área ou palavra" value="' + esc(UI.muralBusca) + '" autocomplete="off"></div>' +
      '<div class="abas" role="group" aria-label="Filtrar por situação">' +
      ['Todos', 'Resolvido', 'Em andamento'].map(function (st) {
        return '<button type="button" class="sm" aria-pressed="' + (UI.muralFiltro === st) + '" data-act="filtro" data-id="' + st + '">' + (st === 'Todos' ? 'Todas' : st === 'Resolvido' ? 'Resolvidas' : st) + '</button>';
      }).join('') + '</div></div>' +
      '<p class="escondido" id="mural-contagem" aria-live="polite"></p>' +
      '<div class="grade g2" id="mural-grade"></div>';
    return h;
  }

  function renderListaMural() {
    var grade = $('#mural-grade');
    if (!grade) return;
    var q = UI.muralBusca.trim().toLowerCase();
    var lista = S.mural.itens.filter(function (m) {
      var st = UI.muralFiltro === 'Todos' || m.status === UI.muralFiltro;
      var tx = !q || (m.area + ' ' + m.demanda + ' ' + m.resposta).toLowerCase().indexOf(q) > -1;
      return st && tx;
    });
    var cont = $('#mural-contagem');
    if (cont) cont.textContent = plural(lista.length, 'devolutiva encontrada', 'devolutivas encontradas');
    if (!lista.length) {
      grade.innerHTML = '<div style="grid-column:1/-1">' + blocoVazio('Nada encontrado.', 'Tente outra palavra ou troque o filtro de situação.') + '</div>';
      return;
    }
    grade.innerHTML = lista.map(function (m, i) {
      var feito = m.status === 'Resolvido';
      var chave = 'mural:' + m.id;
      var acoes = '';
      if (ehCpa()) {
        acoes = '<footer>' + (UI.confirmar === chave
          ? confirmaHtml(chave, 'Remover esta devolutiva?')
          : '<button type="button" class="alt sm" data-act="mural-status" data-id="' + m.id + '">Marcar como ' + (feito ? 'em andamento' : 'resolvida') + '</button>' +
            '<button type="button" class="perigo sm" data-act="pedir-confirmacao" data-chave="' + chave + '">Remover</button>') + '</footer>';
      }
      return '<article class="painel devolutiva' + (feito ? ' feito' : '') + '" style="--i:' + Math.min(i, 8) + '">' +
        '<header><span class="area">' + esc(m.area) + '</span><span class="tag ' + (feito ? 'ok' : 'wip') + '">' + esc(m.status) + '</span></header>' +
        '<div><span class="rotulo">Demanda</span><p>' + esc(m.demanda) + '</p></div>' +
        '<div class="resposta"><span class="rotulo">Resposta · ' + fmt(m.data) + '</span><p>' + esc(m.resposta) + '</p></div>' +
        acoes + '</article>';
    }).join('');
  }

  // ------------------------------------------------------------------
  // View: relatórios
  // ------------------------------------------------------------------
  function linkDownload(url) {
    var u = seguro(url);
    if (!u) return '';
    return u.indexOf('/storage/v1/object/public/') > -1 ? u + (u.indexOf('?') > -1 ? '&' : '?') + 'download=' : u;
  }

  function caminhoNoBucket(url) {
    var base = SUPA_URL + '/storage/v1/object/public/' + BUCKET + '/';
    if (!url || String(url).indexOf(base) !== 0) return null;
    try { return decodeURIComponent(String(url).slice(base.length).split('?')[0]); } catch (e) { return null; }
  }

  function vRel() {
    var R = S.rels;
    var h = '<div class="cabeca"><div><p class="olho">Documentos</p><h1>Relatórios e boletins</h1>' +
      '<p class="lead">Relatórios de autoavaliação e projetos da CPA, abertos para leitura e download.</p></div></div>';
    if (ehCpa()) {
      h += '<details class="painel admin"><summary>Enviar documento</summary><form data-form="rel-novo" novalidate>' +
        '<label for="r-titulo">Título</label><input id="r-titulo" maxlength="200" placeholder="Ex.: Relatório de Autoavaliação Institucional 2026" required>' +
        '<div class="duas"><div><label for="r-tipo">Tipo</label><select id="r-tipo"><option>Relatório</option><option>Boletim</option><option>Ata</option></select></div>' +
        '<div><label for="r-data">Data de publicação</label><input id="r-data" type="date" value="' + hoje() + '"></div></div>' +
        '<label for="r-arquivo">Arquivo em PDF (até 50 MB)</label><input id="r-arquivo" type="file" accept="application/pdf,.pdf" required>' +
        '<p class="erro" id="r-erro" role="alert"></p>' +
        '<div class="acoes"><button type="submit" class="escuro">Enviar e publicar</button></div></form></details>';
    }
    if (R.estado === 'carregando') return h + '<div class="painel lista">' + skFilas(3) + '</div>';
    if (R.estado === 'erro') return h + blocoFalha('os relatórios', 'recarregar-rels');
    if (!R.itens.length) return h + blocoVazio('Nenhum documento publicado ainda.', 'Os relatórios da CPA aparecem aqui assim que forem enviados.');

    h += '<div class="filtros"><div class="busca">' + ICONE.busca + '<label for="busca-rel" class="escondido">Buscar documento por título ou ano</label>' +
      '<input id="busca-rel" type="search" placeholder="Buscar por título ou ano (ex.: 2019)" value="' + esc(UI.relBusca) + '" autocomplete="off"></div></div>' +
      '<p class="escondido" id="rel-contagem" aria-live="polite"></p>' +
      '<div id="rel-lista"></div>';
    return h;
  }

  // Lista de documentos filtrada pela busca (redesenha só a lista, sem perder o que foi digitado)
  function renderListaRel() {
    var caixa = $('#rel-lista');
    if (!caixa) return;
    var q = UI.relBusca.trim().toLowerCase();
    var lista = S.rels.itens.filter(function (r) {
      // busca no título e no tipo (o ano de referência faz parte do título)
      return !q || (r.titulo + ' ' + r.tipo).toLowerCase().indexOf(q) > -1;
    });
    var cont = $('#rel-contagem');
    if (cont) cont.textContent = plural(lista.length, 'documento encontrado', 'documentos encontrados');
    if (!lista.length) {
      caixa.innerHTML = blocoVazio('Nenhum documento encontrado.', 'Tente outra palavra ou outro ano.');
      return;
    }
    var h = '<div class="painel lista">';
    lista.forEach(function (r, i) {
      var url = seguro(r.arquivo_url);
      var chave = 'rel:' + r.id;
      var externo = url && !caminhoNoBucket(url);
      var botoes = !url ? '<span class="meta">Arquivo indisponível</span>'
        : externo
        ? '<a class="btn sm" href="' + esc(url) + '" target="_blank" rel="noopener">Abrir PDF<span class="escondido"> ' + esc(r.titulo) + ' no site da Impacta, em nova aba</span></a>'
        : '<a class="btn sm" href="' + esc(linkDownload(url)) + '" download>Baixar PDF<span class="escondido"> ' + esc(r.titulo) + '</span></a><a class="btn alt sm" href="' + esc(url) + '" target="_blank" rel="noopener">Abrir<span class="escondido"> ' + esc(r.titulo) + ' em nova aba</span></a>';
      if (ehCpa()) {
        botoes = UI.confirmar === chave
          ? confirmaHtml(chave, 'Remover o documento e o arquivo?')
          : botoes + '<button type="button" class="perigo sm" data-act="pedir-confirmacao" data-chave="' + chave + '">Remover</button>';
      }
      h += '<div class="doc" style="--i:' + Math.min(i, 8) + '"><span class="pdf" aria-hidden="true">PDF</span>' +
        '<div><strong>' + esc(r.titulo) + '</strong><div class="meta"><span class="tag">' + esc(r.tipo) + '</span><span>Publicado em ' + fmt(r.data) + '</span>' + (externo ? '<span>Site oficial da Impacta</span>' : '') + '</div></div>' +
        '<div class="botoes">' + botoes + '</div></div>';
    });
    caixa.innerHTML = h + '</div>';
  }

  // ------------------------------------------------------------------
  // View: contato
  // ------------------------------------------------------------------
  function vContato() {
    var C = S.cfg.dados || {};
    var chat = seguro(C.chat_url), meet = seguro(C.meet_url);
    var emailCpa = RE_EMAIL.test(String(C.email_cpa || '')) ? String(C.email_cpa) : '';
    var h = '<p class="olho">Atendimento</p><h1>Contato com a CPA</h1>' +
      '<p class="lead">Dúvidas sobre a pesquisa, sugestões ou críticas: fale com a equipe da Comissão Própria de Avaliação.</p><div class="grade g2">';

    h += '<section class="painel"><h2>Atendimento online</h2>';
    if (S.cfg.estado === 'carregando') {
      h += '<span class="sk sk-linha"></span><span class="sk" style="height:42px;width:260px;margin-top:16px"></span>';
    } else if (S.cfg.estado === 'erro') {
      h += '<p class="meta">Os links de atendimento não carregaram agora. Você ainda pode mandar a mensagem ao lado.</p>';
    } else {
      h += C.horario ? '<p class="horario">' + ICONE.relogio + '<span>' + esc(C.horario) + '</span></p>' : '';
      h += (chat || meet)
        ? '<div class="canais">' + (chat ? '<a class="btn" href="' + esc(chat) + '" target="_blank" rel="noopener">Abrir o Google Chat</a>' : '') +
          (meet ? '<a class="btn alt" href="' + esc(meet) + '" target="_blank" rel="noopener">Entrar na sala do Meet</a>' : '') + '</div>'
        : '<p class="meta">Os links de atendimento ainda não foram cadastrados.</p>';
      h += '<p class="ajuda" style="margin-top:14px">Chat e Meet abrem com a sua conta Google Impacta.</p>';
      if (emailCpa) {
        h += '<p class="email-cpa">E-mail da CPA: <a href="mailto:' + esc(emailCpa) + '">' + esc(emailCpa) + '</a></p>';
      }
    }
    if (ehCpa() && S.cfg.estado === 'ok') {
      h += '<form class="separa" data-form="cfg" novalidate><h3>Editar atendimento</h3>' +
        '<label for="c-chat">Link do Google Chat</label><input id="c-chat" type="url" value="' + esc(C.chat_url || '') + '" placeholder="https://chat.google.com/...">' +
        '<label for="c-meet">Link do Google Meet</label><input id="c-meet" type="url" value="' + esc(C.meet_url || '') + '" placeholder="https://meet.google.com/...">' +
        '<label for="c-hor">Horário de atendimento</label><input id="c-hor" maxlength="200" value="' + esc(C.horario || '') + '">' +
        '<label for="c-email">E-mail da CPA</label><input id="c-email" type="email" maxlength="254" value="' + esc(C.email_cpa || '') + '" placeholder="cpa@impacta.edu.br">' +
        '<p class="erro" id="c-erro" role="alert"></p>' +
        '<div class="acoes"><button type="submit" class="sm">Salvar</button></div></form>';
    }
    h += '</section>';

    h += '<section class="painel"><h2>Envie uma mensagem</h2>';
    if (UI.contatoEnviado) {
      h += '<div class="obrigado" role="status"><span class="marca-ok">' + ICONE.ok + '</span><h3>Mensagem enviada</h3>' +
        '<p class="meta">A CPA recebeu a sua mensagem e responde pelo e-mail informado.</p>' +
        '<div class="acoes" style="justify-content:center"><button type="button" class="alt sm" data-act="nova-mensagem">Escrever outra</button></div></div>';
    } else {
      h += '<p class="meta" style="margin-top:0">A resposta chega no e-mail que você informar.</p>' +
        '<form data-form="contato" novalidate>' +
        '<label for="f-nome">Seu nome</label><input id="f-nome" autocomplete="name" maxlength="120" value="' + esc(logado() ? S.nome : '') + '" required>' +
        '<label for="f-email">E-mail para resposta</label><input id="f-email" type="email" autocomplete="email" maxlength="254" value="' + esc(S.email) + '" required>' +
        '<label for="f-msg">Mensagem</label><textarea id="f-msg" rows="5" maxlength="4000" required></textarea>' +
        '<div class="escondido" aria-hidden="true"><label for="f-site">Site</label><input id="f-site" tabindex="-1" autocomplete="off"></div>' +
        '<p class="erro" id="f-erro" role="alert" aria-live="assertive"></p>' +
        '<div class="acoes"><button type="submit">Enviar mensagem</button></div></form>';
    }
    h += '</section></div>';
    return h;
  }

  // ------------------------------------------------------------------
  // View: acessos (só CPA)
  // ------------------------------------------------------------------
  var ABAS = [
    ['pessoas', 'Coordenação e CPA'],
    ['avaliadores', 'Avaliadores externos'],
    ['visibilidade', 'Quem vê o quê'],
    ['historico', 'Histórico de acessos'],
    ['mensagens', 'Mensagens']
  ];

  function vAcessos() {
    var h = '<p class="olho">Administração</p><h1>Acessos e Perfis</h1>' +
      '<p class="lead">Alunos entram sozinhos com o <code>@aluno.impacta.edu.br</code>. Aqui você libera coordenação, CPA e avaliadores externos, e acompanha quem entrou.</p>';
    h += '<div class="abas" role="tablist" aria-label="Seções de acesso">' + ABAS.map(function (a) {
      var extra = a[0] === 'mensagens' && S.msgs.estado === 'ok' && S.msgs.itens.length ? ' (' + S.msgs.itens.length + ')' : '';
      return '<button type="button" role="tab" id="aba-' + a[0] + '" aria-controls="painel-acessos" aria-selected="' + (UI.aba === a[0]) + '" tabindex="' + (UI.aba === a[0] ? '0' : '-1') + '" data-act="aba" data-id="' + a[0] + '">' + a[1] + extra + '</button>';
    }).join('') + '</div>';
    h += '<section id="painel-acessos" role="tabpanel" aria-labelledby="aba-' + UI.aba + '">';
    h += ({ pessoas: abaPessoas, avaliadores: abaAvaliadores, visibilidade: abaVisibilidade, historico: abaHistorico, mensagens: abaMensagens })[UI.aba]();
    return h + '</section>';
  }

  function tabelaUsuarios(lista, avaliador) {
    if (S.usuarios.estado === 'carregando' || S.usuarios.estado === 'ocioso') return skFilas(3);
    if (S.usuarios.estado === 'erro') return blocoFalha('a lista', 'recarregar-acessos');
    if (!lista.length) return blocoVazio(avaliador ? 'Nenhum avaliador cadastrado.' : 'Ninguém autorizado ainda.', avaliador ? 'Use o formulário acima para convidar a comissão do MEC.' : 'Autorize os e-mails da coordenação e da CPA no formulário acima.');
    var h = '<div class="rolar" tabindex="0" role="region" aria-label="Tabela (role para o lado se precisar)"><table><thead><tr><th>Nome</th><th>E-mail</th>' + (avaliador ? '<th>Validade</th>' : '<th>Perfil</th>') + '<th><span class="escondido">Ações</span></th></tr></thead><tbody>';
    lista.forEach(function (u) {
      var chave = 'usuario:' + u.email;
      var proprio = u.email === S.email;
      var vencido = u.expira_em && u.expira_em < hoje();
      var acoes;
      if (proprio) acoes = '<span class="meta">Você</span>';
      else if (u.protegido) acoes = '<span class="tag cinza" title="Acesso protegido: não pode ser alterado nem revogado pelo portal">Protegido</span>';
      else if (UI.confirmar === chave) acoes = confirmaHtml(chave, 'Revogar?', 'Revogar');
      else acoes = (avaliador ? '<button type="button" class="alt sm" data-act="reenviar-convite" data-email="' + esc(u.email) + '">Reenviar convite</button> ' : '') +
        '<button type="button" class="perigo sm" data-act="pedir-confirmacao" data-chave="' + esc(chave) + '">Revogar</button>';
      h += '<tr><td>' + esc(u.nome || nomeDoEmail(u.email)) + '</td><td class="quebra">' + esc(u.email) + '</td>' +
        (avaliador
          ? '<td class="nowrap">' + (u.expira_em ? fmt(u.expira_em) : 'Sem prazo') + (vencido ? ' <span class="tag">vencido</span>' : '') + '</td>'
          : '<td><span class="tag ' + (u.role === 'cpa' ? '' : 'cinza') + '">' + esc(ROLE[u.role] || u.role) + '</span></td>') +
        '<td style="text-align:right;white-space:nowrap">' + acoes + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  function abaPessoas() {
    var lista = S.usuarios.itens.filter(function (u) { return u.role === 'coord' || u.role === 'cpa'; });
    return '<div class="grade" style="gap:22px">' +
      '<form class="painel" data-form="autorizar" novalidate><h2>Autorizar e-mails</h2>' +
      '<p class="meta" style="margin-top:0">Um e-mail por linha. Coordenação usa <code>@impacta.edu.br</code>; a CPA também aceita representantes com <code>@aluno.impacta.edu.br</code>.</p>' +
      '<label for="a-emails">E-mails</label><textarea id="a-emails" rows="3" placeholder="nome.sobrenome@impacta.edu.br" required></textarea>' +
      '<div class="duas"><div><label for="a-role">Perfil</label><select id="a-role"><option value="coord">Coordenador (painéis da coordenação)</option><option value="cpa">Admin CPA (vê tudo e administra)</option></select></div>' +
      '<div style="display:flex;align-items:flex-end"><label class="check" for="a-convite"><input type="checkbox" id="a-convite"> Enviar convite por e-mail</label></div></div>' +
      '<p class="erro" id="a-erro" role="alert">' + esc(UI.avisoAutorizar) + '</p>' +
      '<div class="acoes"><button type="submit" class="escuro">Autorizar</button></div></form>' +
      '<section class="painel"><div class="painel-cab"><h2>Pessoas autorizadas</h2><span class="meta">' + (S.usuarios.estado === 'ok' ? plural(lista.length, 'pessoa', 'pessoas') : '') + '</span></div>' +
      tabelaUsuarios(lista, false) + '</section></div>';
  }

  function abaAvaliadores() {
    var lista = S.usuarios.itens.filter(function (u) { return u.role === 'aval'; });
    return '<div class="grade" style="gap:22px">' +
      '<form class="painel" data-form="convidar" novalidate><h2>Convidar avaliador externo</h2>' +
      '<p class="meta" style="margin-top:0">A pessoa recebe um e-mail com o link do portal e entra com código, como todo mundo. O acesso termina na data escolhida.</p>' +
      '<div class="duas"><div><label for="v-nome">Nome</label><input id="v-nome" maxlength="120" placeholder="Ex.: Profa. Ana Souza (INEP/MEC)" required></div>' +
      '<div><label for="v-email">E-mail</label><input id="v-email" type="email" maxlength="254" placeholder="nome@exemplo.gov.br" required></div></div>' +
      '<label for="v-validade">Acesso até</label><input id="v-validade" type="date" min="' + hoje() + '" value="' + maisDias(60) + '" required style="max-width:220px">' +
      '<p class="erro" id="v-erro" role="alert"></p>' +
      '<div class="acoes"><button type="submit" class="escuro">Salvar e enviar convite</button></div></form>' +
      '<section class="painel"><div class="painel-cab"><h2>Avaliadores cadastrados</h2></div>' + tabelaUsuarios(lista, true) + '</section></div>';
  }

  function abaVisibilidade() {
    var h = '<div class="painel"><h2>Quem vê o quê</h2><p class="meta" style="margin-top:0">A tabela segue as regras gravadas no banco. Para mudar quem vê um painel, use <a href="#dashboards">Dashboards</a> → Editar este painel.</p>' +
      '<div class="rolar" tabindex="0" role="region" aria-label="Tabela (role para o lado se precisar)"><table><thead><tr><th>Recurso</th>' + PERFIS.map(function (p) { return '<th class="c">' + ROLE[p] + '</th>'; }).join('') + '</tr></thead><tbody>';
    S.dash.itens.forEach(function (d) {
      h += '<tr><td>Painel: ' + esc(d.titulo) + '</td>' + PERFIS.map(function (p) {
        var ok = (d.roles || []).indexOf(p) > -1 || p === 'cpa';
        return '<td class="c ' + (ok ? 'sim' : 'nao') + '">' + (ok ? 'sim' : '–') + '</td>';
      }).join('') + '</tr>';
    });
    [['Mural de devolutivas', [1, 1, 1, 1]], ['Relatórios e boletins', [1, 1, 1, 1]], ['Administração do portal', [0, 0, 1, 0]]].forEach(function (r) {
      h += '<tr><td>' + r[0] + '</td>' + r[1].map(function (ok) { return '<td class="c ' + (ok ? 'sim' : 'nao') + '">' + (ok ? 'sim' : '–') + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div><p class="ajuda">Mural e relatórios também ficam abertos para quem não entrou no portal.</p></div>';
  }

  function abaHistorico() {
    var L = S.logs;
    var h = '<section class="painel"><div class="painel-cab"><h2>Últimos 100 acessos</h2><button type="button" class="alt sm" data-act="recarregar-logs">Atualizar</button></div>';
    if (L.estado === 'carregando' || L.estado === 'ocioso') return h + skFilas(4) + '</section>';
    if (L.estado === 'erro') return h + blocoFalha('o histórico', 'recarregar-logs') + '</section>';
    if (!L.itens.length) return h + blocoVazio('Nenhum acesso registrado ainda.', '') + '</section>';
    h += '<div class="rolar" tabindex="0" role="region" aria-label="Tabela (role para o lado se precisar)"><table><thead><tr><th>Quando</th><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Como entrou</th></tr></thead><tbody>';
    L.itens.forEach(function (l) {
      h += '<tr><td class="nowrap">' + fmtDataHora(l.acessado_em) + '</td><td>' + esc(l.nome || '–') + '</td><td class="quebra">' + esc(l.email) + '</td>' +
        '<td><span class="tag cinza">' + esc(ROLE[l.role] || l.role || '–') + '</span></td><td>' + esc(l.metodo || '–') + '</td></tr>';
    });
    return h + '</tbody></table></div></section>';
  }

  function abaMensagens() {
    var M = S.msgs;
    var h = '<section class="painel"><div class="painel-cab"><h2>Mensagens do formulário de contato</h2><button type="button" class="alt sm" data-act="recarregar-acessos">Atualizar</button></div>';
    if (M.estado === 'carregando' || M.estado === 'ocioso') return h + skFilas(3) + '</section>';
    if (M.estado === 'erro') return h + blocoFalha('as mensagens', 'recarregar-acessos') + '</section>';
    if (!M.itens.length) return h + blocoVazio('Nenhuma mensagem recebida.', 'O que for enviado pela página Contato aparece aqui e também chega por e-mail.') + '</section>';
    M.itens.forEach(function (m) {
      var chave = 'msg:' + m.id;
      h += '<article class="mensagem"><div class="painel-cab" style="margin:0"><div><strong>' + esc(m.nome) + '</strong> <span class="meta">' + esc(m.email) + ' · ' + fmtDataHora(m.enviada_em) + '</span></div>' +
        '<div class="acoes" style="margin:0">' + (UI.confirmar === chave ? confirmaHtml(chave, 'Apagar?', 'Apagar')
          : '<a class="btn alt sm" href="mailto:' + encodeURIComponent(m.email) + '?subject=' + encodeURIComponent('Resposta da CPA') + '">Responder</a>' +
            '<button type="button" class="perigo sm" data-act="pedir-confirmacao" data-chave="' + chave + '">Apagar</button>') + '</div></div>' +
        '<p>' + esc(m.mensagem) + '</p></article>';
    });
    return h + '</section>';
  }

  // ------------------------------------------------------------------
  // Ações de administração
  // ------------------------------------------------------------------
  // Painéis (só CPA): trocar link e perfis, adicionar e remover
  function erroUrlPainel(url) {
    if (!/^https:\/\//i.test(url)) return 'O link precisa começar com https://';
    if (!RE_LOOKER.test(url)) return 'Use o link de incorporação do Looker Studio (lookerstudio.google.com).';
    return '';
  }

  async function salvarUrlDash(form) {
    var id = form.getAttribute('data-id');
    var url = $('#dash-url').value.trim();
    var roles = lerPerfis('dash-edit');
    var err = $('#dash-erro');
    var problema = erroUrlPainel(url);
    if (problema) { err.textContent = problema; $('#dash-url').focus(); return; }
    err.textContent = '';
    var btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    var r = await sb.from('dashboards').update({ url: url, roles: roles }).eq('id', id).select('id');
    ocupado(btn, false);
    if (r.error || !r.data || !r.data.length) { err.textContent = msgErro(r.error, 'Você não tem permissão para alterar este painel.'); return; }
    S.dash.itens.forEach(function (d) { if (d.id === id) { d.url = url; d.roles = roles; } });
    toast('Painel atualizado.', 'ok');
    atualizar();
  }

  async function adicionarPainel(form) {
    var titulo = $('#dn-titulo').value.trim(), desc = $('#dn-desc').value.trim(), url = $('#dn-url').value.trim();
    var roles = lerPerfis('dn');
    var err = $('#dn-erro');
    if (!titulo) { err.textContent = 'Informe o título do painel.'; $('#dn-titulo').focus(); return; }
    var problema = erroUrlPainel(url);
    if (problema) { err.textContent = problema; $('#dn-url').focus(); return; }
    err.textContent = '';
    // id curto a partir do título, sem repetir os que já existem
    var base = slug(titulo).slice(0, 40), id = base, n = 2;
    while (S.dash.itens.some(function (d) { return d.id === id; })) id = base + '-' + (n++);
    var ordem = S.dash.itens.reduce(function (m, d) { return Math.max(m, d.ordem || 0); }, 0) + 1;
    var btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    var r = await sb.from('dashboards').insert({ id: id, titulo: titulo, descricao: desc || null, url: url, roles: roles, ordem: ordem })
      .select('id, titulo, descricao, roles, url, ordem').single();
    ocupado(btn, false);
    if (r.error) { err.textContent = msgErro(r.error, 'Não foi possível adicionar o painel.'); return; }
    S.dash.itens.push(r.data);
    UI.dash = r.data.id;
    toast('Painel adicionado.', 'ok');
    atualizar();
  }

  async function publicarMural(form) {
    var area = $('#m-area').value.trim(), dem = $('#m-dem').value.trim(), res = $('#m-res').value.trim();
    var st = $('#m-st').value, data = $('#m-data').value || hoje();
    var err = $('#m-erro');
    if (!area || !dem || !res) { err.textContent = 'Preencha a área, a demanda e a resposta.'; return; }
    err.textContent = '';
    var btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    var r = await sb.from('mural').insert({ area: area, demanda: dem, resposta: res, status: st, data: data, criado_por: S.email })
      .select('id, area, demanda, resposta, status, data').single();
    ocupado(btn, false);
    if (r.error) { err.textContent = msgErro(r.error, 'Não foi possível publicar.'); return; }
    S.mural.itens.unshift(r.data);
    S.mural.itens.sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id; });
    toast('Devolutiva publicada.', 'ok');
    atualizar();
  }

  async function alternarMural(id, btn) {
    var item = S.mural.itens.filter(function (m) { return String(m.id) === String(id); })[0];
    if (!item) return;
    var novo = item.status === 'Resolvido' ? 'Em andamento' : 'Resolvido';
    ocupado(btn, true);
    var r = await sb.from('mural').update({ status: novo }).eq('id', item.id).select('id');
    ocupado(btn, false);
    if (r.error || !r.data || !r.data.length) { toast(msgErro(r.error, 'Não foi possível mudar a situação.')); return; }
    item.status = novo;
    toast('Situação atualizada: ' + novo.toLowerCase() + '.', 'ok');
    atualizar();
  }

  // Envia o PDF ao Storage e cadastra o documento; se o cadastro falhar, apaga o arquivo.
  async function enviarRelatorio(form) {
    var titulo = $('#r-titulo').value.trim(), tipo = $('#r-tipo').value, data = $('#r-data').value || hoje();
    var arquivo = $('#r-arquivo').files[0];
    var err = $('#r-erro');
    err.textContent = '';
    if (!titulo) { err.textContent = 'Informe o título do documento.'; return; }
    if (!arquivo) { err.textContent = 'Escolha o arquivo em PDF.'; return; }
    if (!(arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name))) { err.textContent = 'O arquivo precisa ser um PDF.'; return; }
    if (arquivo.size > 50 * 1024 * 1024) { err.textContent = 'O arquivo passa de 50 MB.'; return; }

    var btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    var caminho = 'envios/' + Date.now() + '-' + slug(arquivo.name.replace(/\.pdf$/i, '')) + '.pdf';
    var up = await sb.storage.from(BUCKET).upload(caminho, arquivo, { contentType: 'application/pdf', cacheControl: '86400', upsert: false });
    if (up.error) { ocupado(btn, false); err.textContent = msgErro(up.error, 'Não foi possível enviar o arquivo.'); return; }
    var publico = sb.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
    var r = await sb.from('relatorios').insert({ titulo: titulo, tipo: tipo, data: data, arquivo_url: publico })
      .select('id, titulo, tipo, data, arquivo_url').single();
    ocupado(btn, false);
    if (r.error) {
      await sb.storage.from(BUCKET).remove([caminho]);
      err.textContent = msgErro(r.error, 'O arquivo subiu, mas o documento não foi cadastrado. Tente de novo.');
      return;
    }
    S.rels.itens.unshift(r.data);
    S.rels.itens.sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id; });
    toast('Documento publicado.', 'ok');
    atualizar();
  }

  async function salvarConfig(form) {
    var chat = $('#c-chat').value.trim(), meet = $('#c-meet').value.trim(), hor = $('#c-hor').value.trim();
    var emailCpa = $('#c-email').value.trim().toLowerCase();
    var err = $('#c-erro');
    if ((chat && !/^https:\/\//i.test(chat)) || (meet && !/^https:\/\//i.test(meet))) { err.textContent = 'Os links precisam começar com https://'; return; }
    if (emailCpa && !RE_EMAIL.test(emailCpa)) { err.textContent = 'Informe um e-mail válido para a CPA.'; $('#c-email').focus(); return; }
    err.textContent = '';
    var btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    var dados = { chat_url: chat || null, meet_url: meet || null, horario: hor || null, email_cpa: emailCpa || null };
    var r = await sb.from('configuracoes').update(dados).eq('id', 1).select('id');
    ocupado(btn, false);
    if (r.error || !r.data || !r.data.length) { err.textContent = msgErro(r.error, 'Não foi possível salvar.'); return; }
    S.cfg.dados = dados;
    toast('Atendimento atualizado.', 'ok');
    atualizar();
  }

  async function enviarContato(form) {
    var nome = $('#f-nome').value.trim(), email = $('#f-email').value.trim().toLowerCase(), msg = $('#f-msg').value.trim();
    var err = $('#f-erro');
    if (!nome) { err.textContent = 'Informe o seu nome.'; $('#f-nome').focus(); return; }
    if (!RE_EMAIL.test(email)) { err.textContent = 'Informe um e-mail válido para a resposta.'; $('#f-email').focus(); return; }
    if (msg.length < 5) { err.textContent = 'Escreva a sua mensagem.'; $('#f-msg').focus(); return; }
    err.textContent = '';
    var btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    try {
      await postJSON('/api/contato', { nome: nome, email: email, mensagem: msg, site: $('#f-site').value });
      UI.contatoEnviado = true;
      toast('Mensagem enviada para a CPA.', 'ok');
      atualizar();
    } catch (e) {
      err.textContent = e.message;
    } finally {
      ocupado(btn, false);
    }
  }

  // Libera e-mails da coordenação ou da CPA (com ou sem convite por e-mail).
  async function autorizar(form) {
    var linhas = $('#a-emails').value.split(/[\n,;\s]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    var role = $('#a-role').value, convite = $('#a-convite').checked;
    var err = $('#a-erro');
    err.textContent = '';
    UI.avisoAutorizar = '';
    if (!linhas.length) { err.textContent = 'Cole pelo menos um e-mail.'; return; }
    var validos = [], invalidos = [], protegidos = [], proprio = false;
    linhas.forEach(function (e) {
      if (e === S.email) { proprio = true; return; }
      if (S.usuarios.itens.some(function (u) { return u.email === e && u.protegido; })) { protegidos.push(e); return; }
      var ok = RE_IMPACTA.test(e) || (role === 'cpa' && RE_ALUNO.test(e));
      (ok ? validos : invalidos).push(e);
    });
    validos = validos.filter(function (e, i) { return validos.indexOf(e) === i; });
    if (!validos.length) {
      err.textContent = protegidos.length && !invalidos.length
        ? 'Este acesso é protegido e não pode ser alterado.'
        : proprio && !invalidos.length
        ? 'Você não pode mudar o próprio perfil por aqui.'
        : 'Nenhum e-mail aceito. ' + (role === 'coord' ? 'Coordenação precisa de @impacta.edu.br.' : 'Use um e-mail da Impacta.');
      return;
    }
    var btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    var falhas = [];
    if (convite) {
      var token = await tokenAtual();
      for (var i = 0; i < validos.length; i++) {
        try { await postJSON('/api/convite', { email: validos[i], role: role, nome: nomeDoEmail(validos[i]) }, token); }
        catch (e) { falhas.push(validos[i] + ': ' + e.message); }
      }
    } else {
      var linhasDb = validos.map(function (e) { return { email: e, nome: nomeDoEmail(e), role: role, tipo: 'sso', token: null, expira_em: null }; });
      var r = await sb.from('usuarios_cpa').upsert(linhasDb, { onConflict: 'email' });
      if (r.error) falhas.push(msgErro(r.error, 'Não foi possível salvar.'));
    }
    ocupado(btn, false);
    var feitos = convite ? validos.length - falhas.length : (falhas.length ? 0 : validos.length);
    var aviso = [];
    if (proprio) aviso.push('O seu próprio e-mail foi ignorado (para não perder o acesso de administração).');
    if (invalidos.length) aviso.push('Ignorados (domínio não aceito): ' + invalidos.join(', ') + '.');
    if (protegidos.length) aviso.push('Acesso protegido, não alterado: ' + protegidos.join(', ') + '.');
    if (falhas.length) aviso.push(falhas.join(' '));
    UI.avisoAutorizar = aviso.join(' ');
    err.textContent = UI.avisoAutorizar;
    if (feitos) {
      toast(plural(feitos, 'e-mail autorizado', 'e-mails autorizados') + (convite ? ' e convidado(s).' : '.'), 'ok');
      if (!aviso.length) $('#a-emails').value = '';
      await recarregarUsuarios();
    }
  }

  async function convidarAvaliador(form) {
    var nome = $('#v-nome').value.trim(), email = $('#v-email').value.trim().toLowerCase(), ate = $('#v-validade').value;
    var err = $('#v-erro');
    err.textContent = '';
    if (!nome) { err.textContent = 'Informe o nome do avaliador.'; return; }
    if (!RE_EMAIL.test(email)) { err.textContent = 'Informe um e-mail válido.'; return; }
    if (email === S.email) { err.textContent = 'Você não pode convidar o próprio e-mail.'; return; }
    if (!ate || ate < hoje()) { err.textContent = 'Escolha uma data de validade a partir de hoje.'; return; }
    var btn = form.querySelector('[type=submit]');
    ocupado(btn, true);
    try {
      var r = await postJSON('/api/convite', { email: email, nome: nome, role: 'aval', expira_em: ate }, await tokenAtual());
      toast(r.aviso || 'Convite enviado para ' + email + '.', r.aviso ? '' : 'ok');
      form.reset();
      $('#v-validade').value = maisDias(60);
      await recarregarUsuarios();
    } catch (e) {
      err.textContent = e.message;
    } finally {
      ocupado(btn, false);
    }
  }

  async function reenviarConvite(email, btn) {
    var u = S.usuarios.itens.filter(function (x) { return x.email === email; })[0];
    if (!u) return;
    var ate = u.expira_em && u.expira_em >= hoje() ? u.expira_em : maisDias(60);
    ocupado(btn, true);
    try {
      var r = await postJSON('/api/convite', { email: u.email, nome: u.nome, role: u.role, expira_em: ate }, await tokenAtual());
      toast(r.aviso || ('Convite reenviado' + (ate !== u.expira_em ? ', com acesso até ' + fmt(ate) : '') + '.'), r.aviso ? '' : 'ok');
      await recarregarUsuarios();
    } catch (e) {
      toast(e.message);
    } finally {
      ocupado(btn, false);
    }
  }

  async function recarregarUsuarios() {
    var r = await sb.from('usuarios_cpa').select('email, nome, role, tipo, expira_em, protegido, criado_em').order('criado_em', { ascending: false });
    if (r.error) { console.error(r.error); S.usuarios.estado = 'erro'; }
    else { S.usuarios.itens = r.data || []; S.usuarios.estado = 'ok'; }
    atualizar();
  }

  async function recarregarLogs() {
    S.logs.estado = 'carregando';
    atualizar();
    var r = await sb.from('logs_acesso').select('email, nome, role, metodo, acessado_em').order('acessado_em', { ascending: false }).limit(100);
    if (r.error) { console.error(r.error); S.logs.estado = 'erro'; }
    else { S.logs.itens = r.data || []; S.logs.estado = 'ok'; }
    atualizar();
  }

  // Remoções confirmadas na própria tela
  async function confirmar(chave, btn) {
    var i = chave.indexOf(':');
    var tipo = chave.slice(0, i), id = chave.slice(i + 1);
    ocupado(btn, true);
    var r;
    if (tipo === 'mural') {
      r = await sb.from('mural').delete().eq('id', id).select('id');
      if (!r.error && r.data && r.data.length) {
        S.mural.itens = S.mural.itens.filter(function (m) { return String(m.id) !== id; });
        toast('Devolutiva removida.', 'ok');
      } else toast(msgErro(r.error, 'Não foi possível remover.'));
    } else if (tipo === 'rel') {
      var doc = S.rels.itens.filter(function (x) { return String(x.id) === id; })[0];
      r = await sb.from('relatorios').delete().eq('id', id).select('id');
      if (!r.error && r.data && r.data.length) {
        S.rels.itens = S.rels.itens.filter(function (x) { return String(x.id) !== id; });
        var caminho = doc && caminhoNoBucket(doc.arquivo_url);
        if (caminho) {
          var rm = await sb.storage.from(BUCKET).remove([caminho]);
          if (rm.error) console.warn('Arquivo não removido do Storage', rm.error);
        }
        toast('Documento removido.', 'ok');
      } else toast(msgErro(r.error, 'Não foi possível remover.'));
    } else if (tipo === 'dash') {
      r = await sb.from('dashboards').delete().eq('id', id).select('id');
      if (!r.error && r.data && r.data.length) {
        S.dash.itens = S.dash.itens.filter(function (d) { return d.id !== id; });
        if (UI.dash === id) UI.dash = null;
        toast('Painel removido.', 'ok');
      } else toast(msgErro(r.error, 'Não foi possível remover o painel.'));
    } else if (tipo === 'usuario') {
      if (id === S.email) { toast('Você não pode revogar o próprio acesso.'); ocupado(btn, false); return; }
      r = await sb.from('usuarios_cpa').delete().eq('email', id).select('email');
      if (!r.error && r.data && r.data.length) {
        S.usuarios.itens = S.usuarios.itens.filter(function (u) { return u.email !== id; });
        toast('Acesso revogado.', 'ok');
      } else toast(msgErro(r.error, 'Não foi possível revogar.'));
    } else if (tipo === 'msg') {
      r = await sb.from('mensagens_contato').delete().eq('id', id).select('id');
      if (!r.error && r.data && r.data.length) {
        S.msgs.itens = S.msgs.itens.filter(function (m) { return String(m.id) !== id; });
        toast('Mensagem apagada.', 'ok');
      } else toast(msgErro(r.error, 'Não foi possível apagar.'));
    }
    UI.confirmar = null;
    atualizar();
  }

  function mostrarConfirmacao(chave) {
    UI.confirmar = chave;
    if (UI.view === 'mural') renderListaMural();
    else if (UI.view === 'relatorios') renderListaRel();
    else atualizar();
    var b = $('[data-act="confirmar"]');
    if (b) b.focus();
  }

  // ------------------------------------------------------------------
  // Eventos (delegados)
  // ------------------------------------------------------------------
  document.addEventListener('click', function (ev) {
    var alvo = ev.target.closest('[data-act]');
    if (!alvo) {
      if (ev.target.closest('#gaveta-fundo')) fecharMenu(true);
      return;
    }
    var act = alvo.getAttribute('data-act');
    var id = alvo.getAttribute('data-id');
    switch (act) {
      case 'menu-abrir': abrirMenu(); break;
      case 'menu-fechar': fecharMenu(true); break;
      case 'fonte-mais': mudarEscala(1); break;
      case 'fonte-menos': mudarEscala(-1); break;
      case 'sair': sair(); break;
      case 'dash': UI.dash = id; atualizar(); var aba = $('#aba-' + id); if (aba) aba.focus(); break;
      case 'filtro': UI.muralFiltro = id; $$('[data-act="filtro"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === alvo)); }); renderListaMural(); break;
      case 'aba': UI.aba = id; UI.confirmar = null; UI.avisoAutorizar = ''; atualizar(); var a2 = $('#aba-' + id); if (a2) a2.focus(); break;
      case 'ir-ferramentas':
        ev.preventDefault();
        var fp = $('#ferramentas-paineis');
        if (fp) { fp.open = true; fp.scrollIntoView({ behavior: 'smooth', block: 'start' }); var cu = $('#dash-url'); if (cu) cu.focus({ preventScroll: true }); }
        break;
      case 'pedir-confirmacao': mostrarConfirmacao(alvo.getAttribute('data-chave')); break;
      case 'cancelar': UI.confirmar = null; if (UI.view === 'mural') renderListaMural(); else if (UI.view === 'relatorios') renderListaRel(); else atualizar(); break;
      case 'confirmar': confirmar(alvo.getAttribute('data-chave'), alvo); break;
      case 'mural-status': alternarMural(id, alvo); break;
      case 'reenviar-convite': reenviarConvite(alvo.getAttribute('data-email'), alvo); break;
      case 'nova-mensagem': UI.contatoEnviado = false; atualizar(); var n = $('#f-msg'); if (n) n.focus(); break;
      case 'login-demo': UI.login = { etapa: 'senha', email: '', liberaEm: 0, verificando: false }; pararTimer(); atualizar(); var de = $('#demo-email'); if (de) de.focus(); break;
      case 'login-codigo': UI.login = { etapa: 'email', email: '', liberaEm: 0, verificando: false }; atualizar(); var le = $('#login-email'); if (le) le.focus(); break;
      case 'trocar-email': UI.login.etapa = 'email'; pararTimer(); atualizar(); var c = $('#login-email'); if (c) c.focus(); break;
      case 'reenviar-codigo':
        pedirCodigo(UI.login.email, alvo).then(function (ok) {
          if (ok) { erroLogin('Enviamos um novo código.', true); iniciarTimer(); $$('#codigo input').forEach(function (x) { x.value = ''; x.classList.remove('cheio'); }); var p = $('#codigo input'); if (p) p.focus(); }
        });
        break;
      case 'recarregar-mural': S.mural.estado = 'carregando'; atualizar(); carregarMural().then(atualizar); break;
      case 'recarregar-rels': S.rels.estado = 'carregando'; atualizar(); carregarRelatorios().then(atualizar); break;
      case 'recarregar-dash': S.dash.estado = 'carregando'; atualizar(); carregarDashboards().then(atualizar); break;
      case 'recarregar-acessos': carregarAcessos(); break;
      case 'recarregar-logs': recarregarLogs(); break;
    }
  });

  document.addEventListener('submit', function (ev) {
    var form = ev.target.closest('form[data-form]');
    if (!form) return;
    ev.preventDefault();
    var f = form.getAttribute('data-form');
    if (f === 'email') {
      pedirCodigo($('#login-email').value, $('#btn-codigo')).then(function (ok) { if (ok) atualizar(); });
    } else if (f === 'codigo') verificarCodigo();
    else if (f === 'senha') entrarComSenha(form);
    else if (f === 'dash-url') salvarUrlDash(form);
    else if (f === 'dash-novo') adicionarPainel(form);
    else if (f === 'mural-novo') publicarMural(form);
    else if (f === 'rel-novo') enviarRelatorio(form);
    else if (f === 'cfg') salvarConfig(form);
    else if (f === 'contato') enviarContato(form);
    else if (f === 'autorizar') autorizar(form);
    else if (f === 'convidar') convidarAvaliador(form);
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'busca-mural') { UI.muralBusca = t.value; renderListaMural(); return; }
    if (t.id === 'busca-rel') { UI.relBusca = t.value; renderListaRel(); return; }
    if (t.closest && t.closest('#codigo')) {
      var digitos = t.value.replace(/\D/g, '');
      var i = parseInt(t.getAttribute('data-i'), 10);
      if (digitos.length > 1) { t.value = ''; preencherCodigo(i, digitos.slice(0, 6 - i)); return; }
      t.value = digitos;
      t.classList.toggle('cheio', !!digitos);
      if (digitos) {
        var prox = $('#codigo input[data-i="' + (i + 1) + '"]');
        if (prox) prox.focus();
        if (lerCodigo().length === 6) verificarCodigo();
      }
    }
  });

  // Ao escolher outro arquivo, apaga o erro do arquivo anterior
  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'r-arquivo') { var e = $('#r-erro'); if (e) e.textContent = ''; }
  });

  document.addEventListener('paste', function (ev) {
    var t = ev.target;
    if (!t.closest || !t.closest('#codigo')) return;
    var texto = (ev.clipboardData || window.clipboardData).getData('text') || '';
    var digitos = texto.replace(/\D/g, '').slice(0, 6);
    if (!digitos) return;
    ev.preventDefault();
    $$('#codigo input').forEach(function (c) { c.value = ''; });
    preencherCodigo(0, digitos);
  });

  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if (ev.key === 'Escape' && !$('#gaveta').hidden) { fecharMenu(true); return; }
    if (t.closest && t.closest('#codigo')) {
      var i = parseInt(t.getAttribute('data-i'), 10);
      if (ev.key === 'Backspace' && !t.value && i > 0) {
        var ant = $('#codigo input[data-i="' + (i - 1) + '"]');
        ant.value = ''; ant.classList.remove('cheio'); ant.focus(); ev.preventDefault();
      } else if (ev.key === 'ArrowLeft' && i > 0) { $('#codigo input[data-i="' + (i - 1) + '"]').focus(); ev.preventDefault(); }
      else if (ev.key === 'ArrowRight' && i < 5) { $('#codigo input[data-i="' + (i + 1) + '"]').focus(); ev.preventDefault(); }
      return;
    }
    // Setas nas abas (padrão de tablist)
    if (t.getAttribute && t.getAttribute('role') === 'tab' && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
      var abas = $$('[role="tab"]', t.parentNode);
      var k = abas.indexOf(t) + (ev.key === 'ArrowRight' ? 1 : -1);
      if (k < 0) k = abas.length - 1;
      if (k >= abas.length) k = 0;
      abas[k].click();
      ev.preventDefault();
    }
  });

  // Esconde o esqueleto quando o painel do Looker termina de carregar
  document.addEventListener('load', function (ev) {
    if (ev.target.tagName === 'IFRAME' && ev.target.parentNode.classList.contains('quadro')) {
      var sk = ev.target.parentNode.querySelector('.sk');
      if (sk) sk.remove();
    }
  }, true);

  window.addEventListener('hashchange', render);
  window.addEventListener('resize', function () {
    var b = $('.abrir-menu');
    if (b && getComputedStyle(b).display === 'none') fecharMenu(false);
  });

  // ------------------------------------------------------------------
  // Início
  // ------------------------------------------------------------------
  // Abre o portal: carrega o que é público, recupera a sessão salva e escuta login/logout.
  async function iniciar() {
    render();
    if (!sb) {
      if (configurado) console.error('Biblioteca do Supabase não carregou.');
      semConexao();
      S.pronto = true;
      render();
      return;
    }
    // Quando os dados públicos chegam depois, só redesenha telas que dependem deles
    // (sem apagar o que a pessoa já digitou)
    var publicos = carregarPublicos().then(function () {
      if (!S.pronto) return;
      if (UI.view === 'mural' || UI.view === 'relatorios') atualizar();
      else if (UI.view === 'contato') {
        var m = $('#f-msg');
        if (!m || !m.value) atualizar();
      }
    });
    try {
      var r = await sb.auth.getSession();
      if (r.data && r.data.session) {
        S.sessao = r.data.session;
        await carregarPerfil();
      }
    } catch (e) {
      console.error(e);
    }
    S.pronto = true;
    render();

    // Nunca consultar o banco direto dentro deste callback (trava o cliente do Supabase)
    sb.auth.onAuthStateChange(function (evento, sessao) {
      setTimeout(function () {
        if (evento === 'SIGNED_OUT') {
          if (S.sessao) { limparSessao(); render(); }
        } else if (evento === 'TOKEN_REFRESHED' && sessao) {
          S.sessao = sessao;
        } else if (evento === 'SIGNED_IN' && sessao && !S.sessao && !UI.login.verificando) {
          // Login feito em outra aba
          S.sessao = sessao;
          carregarPerfil().then(render);
        }
      }, 0);
    });
    await publicos;
  }

  iniciar();
})();
