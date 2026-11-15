// Área administrativa: login, cadastros, aprovação, usuários, histórico e backup.
//
// Toda regra (quem edita o quê, quem publica, validação) mora em
// dados/db.js e dados/auth.js. Esta tela só esconde o que o perfil não pode
// fazer — se esconder falhar, o banco recusa do mesmo jeito.

import * as db from '../dados/db.js';
import * as auth from '../dados/auth.js';
import { COLECOES, PERFIS, PUBLICACAO, podeEditar, pode, TIPOS_ARQUIVO } from '../dados/esquema.js';
import { esc, fmtMoeda, fmtData, fmtDataHora, fmtNum, norm, baixar, hojeISO, tamanhoArquivo } from '../util.js';
import { $, $$, aviso, modal, confirmar, opcoes, montarTabela, seloPublicacao, verDocumento } from '../ui/componentes.js';
import { lerRota } from '../app.js';

const SECOES = [
  ['Visão geral', [['painel', 'Painel'], ['aprovacoes', 'Aprovações']]],
  ['Financeiro', [['receitas', 'Receitas'], ['despesas', 'Despesas'], ['orcamentos', 'Orçamento aprovado'], ['parceiros', 'Parceiros'], ['contratos', 'Contratos e parcerias']]],
  ['Projetos', [['projetos', 'Projetos'], ['metas', 'Metas'], ['atendimentos', 'Atendimentos mensais']]],
  ['Publicações', [['documentos', 'Documentos']]],
  ['Sistema', [['usuarios', 'Usuários', 'usuarios'], ['historico', 'Histórico de alterações', 'auditoria'], ['backup', 'Backup e dados', 'backup'], ['conta', 'Minha conta']]],
];

const pendentes = () => Object.keys(COLECOES).reduce((a, c) => a + db.colecao(c).filter(r => r.publicacao === 'pendente').length, 0);

export async function render(main) {
  const u = auth.usuarioAtual();
  if (!u) return auth.precisaPrimeiroAdmin() ? telaPrimeiroAdmin(main) : telaLogin(main);
  const { partes } = lerRota();
  const secao = partes[0] || 'painel';
  const visiveis = SECOES.map(([g, itens]) => [g, itens.filter(([, , req]) => !req || pode(u, req))]).filter(([, i]) => i.length);
  const n = pendentes();
  main.innerHTML = `
    <div class="admin">
      <nav class="admin-menu" aria-label="Menu administrativo">
        <div class="usuario-caixa"><b>${esc(u.nome)}</b><span class="mudo">${esc(PERFIS[u.perfil].nome)} · ${esc(u.login)}</span><br><button class="link-doc pequeno" type="button" id="sair">Sair</button></div>
        ${visiveis.map(([g, itens]) => `<div class="grupo">${esc(g)}</div>${itens.map(([k, r]) => `<a href="#/admin/${k}"${k === secao ? ' class="ativo" aria-current="page"' : ''}>${esc(r)}${k === 'aprovacoes' && n ? `<span class="contador">${n}</span>` : ''}</a>`).join('')}`).join('')}
      </nav>
      <div id="admin-corpo"></div>
    </div>`;
  $('#sair', main).onclick = async () => { await auth.sair(); aviso('Sessão encerrada.'); location.hash = '#/admin'; };
  const corpo = $('#admin-corpo', main);
  if (COLECOES[secao]) return telaColecao(corpo, secao, u);
  const telas = { painel: telaPainel, aprovacoes: telaAprovacoes, usuarios: telaUsuarios, historico: telaHistorico, backup: telaBackup, conta: telaConta };
  if (!telas[secao]) { corpo.innerHTML = '<h1>Seção não encontrada</h1>'; return; }
  return telas[secao](corpo, u);
}

const recarregar = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

/** Mostra erros de validação/permissão num formulário; devolve true se tratou. */
function mostrarErro(caixa, e) {
  if (e instanceof db.ErroValidacao || e instanceof db.ErroPermissao) {
    const lista = e.erros || [e.message];
    caixa.innerHTML = `<div class="erros" role="alert"><ul>${lista.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    caixa.scrollIntoView({ block: 'nearest' });
    return true;
  }
  throw e;
}

// ------------------------------------------------------------ login

function telaPrimeiroAdmin(main) {
  main.innerHTML = `
    <section class="cartao login">
      <h1>Configurar o administrador</h1>
      <p class="mudo">Primeiro acesso à área restrita: crie a conta do administrador. Depois disso, só ele cria os demais usuários.</p>
      <div id="erros"></div>
      <form id="f" class="form-grade" style="grid-template-columns:1fr">
        <label class="campo">Nome completo<input name="nome" required autocomplete="name"></label>
        <label class="campo">Login<input name="login" required autocomplete="username" pattern="[a-z0-9._\\-]{3,40}"><small>Letras minúsculas, números, ponto, hífen</small></label>
        <label class="campo">Senha<input name="senha" type="password" required autocomplete="new-password" minlength="10"><small>Pelo menos 10 caracteres, com letras e números</small></label>
        <label class="campo">Repita a senha<input name="senha2" type="password" required autocomplete="new-password"></label>
        <button class="botao primario" type="submit">Criar administrador e entrar</button>
      </form>
    </section>`;
  $('#f', main).onsubmit = async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    if (fd.senha !== fd.senha2) return mostrarErro($('#erros', main), new db.ErroValidacao(['As senhas não conferem']));
    try { await auth.criarPrimeiroAdmin(fd); aviso('Administrador criado.'); recarregar(); }
    catch (err) { mostrarErro($('#erros', main), err); }
  };
}

function telaLogin(main) {
  main.innerHTML = `
    <section class="cartao login">
      <h1>Área restrita</h1>
      <p class="mudo">Acesso para a equipe do Instituto. As informações públicas não exigem login — <a href="#/">voltar ao portal</a>.</p>
      <div id="erros"></div>
      <form id="f" class="form-grade" style="grid-template-columns:1fr">
        <label class="campo">Login<input name="login" required autocomplete="username" autofocus></label>
        <label class="campo">Senha<input name="senha" type="password" required autocomplete="current-password"></label>
        <button class="botao primario" type="submit">Entrar</button>
      </form>
      <p class="pequeno mudo" style="margin-top:12px">Após 5 tentativas erradas, o acesso fica bloqueado por 5 minutos. A sessão expira após 30 minutos sem uso.</p>
    </section>`;
  $('#f', main).onsubmit = async e => {
    e.preventDefault();
    const b = $('button[type=submit]', e.target);
    b.disabled = true;
    const fd = Object.fromEntries(new FormData(e.target));
    try { await auth.entrar(fd.login, fd.senha); recarregar(); }
    catch (err) { mostrarErro($('#erros', main), err); b.disabled = false; }
  };
}

// ------------------------------------------------------------ painel

function descricaoLog(l) {
  const c = COLECOES[l.colecao];
  return `${esc(l.acao)}${c ? ` · ${esc(c.singular)}` : ''}${l.titulo ? ` “${esc(l.titulo)}”` : ''}`;
}

function telaPainel(corpo, u) {
  const contagem = Object.entries(COLECOES).map(([k, c]) => {
    const l = db.colecao(k);
    return { k, nome: c.nome, total: l.length, pub: l.filter(r => r.publicacao === 'publicado').length, pend: l.filter(r => r.publicacao === 'pendente').length, rasc: l.filter(r => r.publicacao === 'rascunho').length };
  });
  const recentes = [...db.dados.auditoria].reverse().slice(0, 12);
  const n = pendentes();
  corpo.innerHTML = `
    <h1>Painel administrativo</h1>
    ${db.dados.config.demonstracao ? `<div class="alerta-caixa alerta"><b>A base está com dados de exemplo.</b> Antes de usar com informações reais, ${pode(u, 'backup') ? '<a href="#/admin/backup">remova os dados de exemplo</a>' : 'peça ao administrador para remover os dados de exemplo'}. Registros reais cadastrados por cima deles são preservados.</div>` : ''}
    <div class="alerta-caixa info"><b>Versão local.</b> Os dados ficam guardados neste navegador, neste computador. Faça backup com frequência em <i>Backup e dados</i>. A proteção por senha vale contra quem usa o portal, não contra quem tem acesso ao perfil do navegador — a segurança completa vem com o servidor.</div>
    <div class="kpis">
      <div class="kpi destaque"><div class="rotulo">Seu perfil</div><div class="valor">${esc(PERFIS[u.perfil].nome)}</div><div class="nota">${esc(PERFIS[u.perfil].descricao)}</div></div>
      <div class="kpi"><div class="rotulo">Aguardando aprovação</div><div class="valor">${fmtNum(n)}</div><div class="nota"><a href="#/admin/aprovacoes">Ver fila</a></div></div>
      <div class="kpi"><div class="rotulo">Registros publicados</div><div class="valor">${fmtNum(contagem.reduce((a, c) => a + c.pub, 0))}</div><div class="nota">de ${fmtNum(contagem.reduce((a, c) => a + c.total, 0))} no total</div></div>
    </div>
    <div class="grade">
      <section class="cartao m6"><h3>Cadastros</h3><div class="tabela-envolve"><table><thead><tr><th>Cadastro</th><th class="num">Publicados</th><th class="num">Pendentes</th><th class="num">Rascunhos</th></tr></thead>
        <tbody>${contagem.map(c => `<tr><td><a href="#/admin/${c.k}">${esc(c.nome)}</a>${podeEditar(u, c.k) ? '' : ' <span class="selo neutro">só leitura</span>'}</td><td class="num">${fmtNum(c.pub)}</td><td class="num">${fmtNum(c.pend)}</td><td class="num">${fmtNum(c.rasc)}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="cartao m6"><h3>Atividade recente</h3>
        ${pode(u, 'auditoria') ? `<ul class="pequeno" style="padding-left:18px;margin:0">${recentes.map(l => `<li><b>${esc(l.usuario)}</b> ${descricaoLog(l)}<span class="sub mudo">${fmtDataHora(l.quando)}</span></li>`).join('')}</ul><p style="margin:8px 0 0"><a href="#/admin/historico">Histórico completo</a></p>` : '<p class="mudo">O histórico completo é visível para administradores e auditores.</p>'}
      </section>
    </div>`;
}

// ------------------------------------------------------------ aprovações

function telaAprovacoes(corpo, u) {
  const itens = Object.keys(COLECOES).flatMap(c => db.colecao(c).filter(r => r.publicacao === 'pendente').map(r => ({ c, r })))
    .sort((a, b) => (b.r.atualizadoEm || '').localeCompare(a.r.atualizadoEm || ''));
  const admin = pode(u, 'publica');
  corpo.innerHTML = `
    <h1>Aprovações</h1>
    <p class="mudo">${admin ? 'Registros enviados pela equipe que aguardam conferência. Ao aprovar, eles passam a aparecer no portal público.' : 'Seus envios e os da equipe que aguardam a aprovação do administrador.'}</p>
    ${itens.length ? `<div class="tabela-envolve"><table><thead><tr><th>Cadastro</th><th>Registro</th><th>Enviado por</th><th>Quando</th><th></th></tr></thead><tbody>
      ${itens.map(({ c, r }) => `<tr><td>${esc(COLECOES[c].nome)}</td><td>${esc(COLECOES[c].titulo(r))}${r.valor ? `<span class="sub">${fmtMoeda(r.valor)}</span>` : ''}</td><td>${esc(r.atualizadoPor)}</td><td>${fmtDataHora(r.atualizadoEm)}</td>
        <td><div class="grupo-botoes"><button class="botao pequeno" type="button" data-ver="${c}|${r.id}">Conferir</button>${admin ? `<button class="botao pequeno primario" type="button" data-pub="${c}|${r.id}">Aprovar e publicar</button><button class="botao pequeno" type="button" data-dev="${c}|${r.id}">Devolver</button>` : ''}</div></td></tr>`).join('')}
    </tbody></table></div>` : '<p class="vazio">Nada aguardando aprovação.</p>'}`;
  corpo.onclick = async e => {
    const [k, v] = [['ver', 'data-ver'], ['pub', 'data-pub'], ['dev', 'data-dev']].map(([n, a]) => [n, e.target.closest(`[${a}]`)?.getAttribute(a)]).find(([, x]) => x) || [];
    if (!k) return;
    const [c, id] = v.split('|');
    try {
      if (k === 'ver') return abrirFormulario(c, db.obter(c, id), u, true);
      if (k === 'pub') { await db.definirPublicacao(c, id, 'publicado', u); aviso('Publicado.'); }
      if (k === 'dev') { await db.definirPublicacao(c, id, 'rascunho', u); aviso('Devolvido para rascunho.'); }
      recarregar();
    } catch (err) { aviso(err.message, 'erro'); }
  };
}

// ------------------------------------------------------------ coleções

/** Texto de exibição de um campo (resolve referências e formatos). */
function textoCampo(f, r) {
  const v = r[f.k];
  if (v === null || v === undefined || v === '') return f.tipo === 'ref' && f.vazio ? f.vazio : '';
  if (f.tipo === 'ref') { const alvo = db.obter(f.ref, v); return alvo ? COLECOES[f.ref].titulo(alvo) : '(removido)'; }
  if (f.tipo === 'moeda') return fmtMoeda(v);
  if (f.tipo === 'data') return fmtData(v);
  if (f.tipo === 'numero') return fmtNum(v);
  if (f.tipo === 'marca') return v ? 'Sim' : 'Não';
  if (f.tipo === 'arquivo') return v.nome || '';
  return String(v);
}

/** Quais colunas aparecem na lista de cada cadastro (as demais estão no formulário). */
const COLUNAS_LISTA = {
  projetos: ['nome', 'area', 'status', 'inicio', 'orcamento'], metas: ['projetoId', 'descricao', 'meta', 'realizado'],
  atendimentos: ['projetoId', 'mes', 'pessoas', 'familias'], parceiros: ['nome', 'tipo', 'documento'],
  receitas: ['data', 'origem', 'parceiroId', 'projetoId', 'valor'], despesas: ['data', 'fornecedor', 'categoria', 'projetoId', 'valor'],
  orcamentos: ['exercicio', 'projetoId', 'categoria', 'valor'], contratos: ['numero', 'tipo', 'parceiroId', 'valor', 'situacao'],
  documentos: ['titulo', 'categoria', 'exercicio', 'restrito'],
};

function telaColecao(corpo, nome, u) {
  const def = COLECOES[nome];
  const edita = podeEditar(u, nome);
  const campos = COLUNAS_LISTA[nome].map(k => def.campos.find(f => f.k === k));
  corpo.innerHTML = `
    <div class="cab-pagina"><div><h1>${esc(def.nome)}</h1>${def.ajuda ? `<p>${esc(def.ajuda)}</p>` : ''}${edita ? '' : `<p><span class="selo neutro">Só leitura</span> O perfil ${esc(PERFIS[u.perfil].nome)} consulta, mas não altera este cadastro.</p>`}</div>
      ${edita ? `<button class="botao primario" type="button" id="novo">Novo ${esc(def.singular)}</button>` : ''}</div>
    <div class="filtros"><label>Situação<select id="f-pub">${opcoes(Object.entries(PUBLICACAO), '', 'Todas')}</select></label>
      ${nome !== 'projetos' && def.campos.some(f => f.k === 'projetoId') ? `<label>Projeto<select id="f-proj">${opcoes(db.colecao('projetos').map(p => [p.id, p.nome]), '', 'Todos')}</select></label>` : ''}
      <label>Pesquisar<input type="search" id="f-busca" placeholder="Qualquer campo…"></label>
      ${db.dados.config.demonstracao ? '<label>Origem<select id="f-ex"><option value="">Todos</option><option value="ex">Só exemplos</option><option value="real">Só cadastrados</option></select></label>' : ''}</div>
    <div id="tabela"></div>`;
  const filtrar = () => {
    const pub = $('#f-pub', corpo).value, proj = $('#f-proj', corpo)?.value, ex = $('#f-ex', corpo)?.value;
    return db.colecao(nome).filter(r => (!pub || r.publicacao === pub) && (!proj || r.projetoId === proj) && (!ex || (ex === 'ex' ? r.exemplo : !r.exemplo)));
  };
  const tabela = montarTabela($('#tabela', corpo), {
    linhas: filtrar(), porPagina: 25, busca: $('#f-busca', corpo),
    ordem: def.campos.some(f => f.k === 'data') ? { k: 'data', dir: 'desc' } : null,
    colunas: [
      ...campos.map(f => ({ k: f.k, titulo: f.rotulo.replace(/ \(.*\)$/, ''), tipo: f.tipo === 'moeda' ? 'moeda' : f.tipo === 'numero' ? 'int' : undefined, valor: r => ['moeda', 'numero', 'ano'].includes(f.tipo) ? r[f.k] : f.tipo === 'data' ? r[f.k] : textoCampo(f, r), html: f.tipo === 'data' ? r => esc(fmtData(r[f.k])) : undefined })),
      { k: 'publicacao', titulo: 'Situação', valor: r => PUBLICACAO[r.publicacao], html: r => seloPublicacao(r.publicacao) + (r.exemplo ? ' <span class="selo neutro">exemplo</span>' : '') },
      { k: 'acoes', titulo: '', semOrdem: true, exportar: false, valor: () => '', html: r => `<div class="grupo-botoes"><button class="botao pequeno" type="button" data-abrir="${esc(r.id)}">${edita ? 'Editar' : 'Ver'}</button></div>` },
    ],
    exportar: { titulo: def.nome, subtitulo: 'Exportado da área administrativa' },
  });
  $$('#f-pub, #f-proj, #f-ex', corpo).forEach(s => s.onchange = () => tabela.atualizar(filtrar()));
  if (edita) $('#novo', corpo).onclick = () => abrirFormulario(nome, null, u);
  corpo.addEventListener('click', e => {
    const b = e.target.closest('[data-abrir]');
    if (b) abrirFormulario(nome, db.obter(nome, b.dataset.abrir), u);
  });
}

function campoHTML(f, valor, somenteLeitura) {
  const id = `c-${f.k}`;
  const dis = somenteLeitura ? ' disabled' : '';
  const req = f.obrig && f.tipo !== 'arquivo' ? ' required' : '';
  const rot = `<span>${esc(f.rotulo)}${f.obrig ? ' <span class="obrig" aria-hidden="true">*</span>' : ''}</span>`;
  const ajuda = f.ajuda ? `<small>${esc(f.ajuda)}</small>` : '';
  const v = valor ?? '';
  switch (f.tipo) {
    case 'area': return `<label class="campo inteiro" for="${id}">${rot}<textarea id="${id}" name="${f.k}"${req}${dis}>${esc(v)}</textarea>${ajuda}</label>`;
    case 'opcao': return `<label class="campo" for="${id}">${rot}<select id="${id}" name="${f.k}"${req}${dis}>${opcoes(f.opcoes, v, 'Selecione…')}</select>${ajuda}</label>`;
    case 'ref': {
      let itens = db.colecao(f.ref);
      if (f.ref === 'documentos') itens = [...itens].sort((a, b) => b.data.localeCompare(a.data));
      return `<label class="campo" for="${id}">${rot}<select id="${id}" name="${f.k}"${req}${dis}>${opcoes(itens.map(r => [r.id, COLECOES[f.ref].titulo(r)]), v, f.vazio || (f.obrig ? 'Selecione…' : '— nenhum —'))}</select>${ajuda}</label>`;
    }
    case 'marca': return `<label class="campo marca inteiro"><input type="checkbox" name="${f.k}"${v ? ' checked' : ''}${dis}> <span>${esc(f.rotulo)}</span></label>`;
    case 'arquivo': return `<label class="campo inteiro" for="${id}">${rot}${v ? `<small>Atual: ${esc(v.nome)} (${tamanhoArquivo(v.tamanho)}) <button class="link-doc" type="button" data-ver-atual>ver</button></small>` : ''}${somenteLeitura ? '' : `<input id="${id}" type="file" name="${f.k}" accept="${TIPOS_ARQUIVO.join(',')}"${f.obrig && !v ? ' required' : ''}>`}${v && !somenteLeitura ? '<small>Escolha um arquivo só se quiser substituir.</small>' : ''}</label>`;
    default: {
      const tipo = { numero: 'number', moeda: 'number', ano: 'number', data: 'date', mes: 'month' }[f.tipo] || 'text';
      const extra = f.tipo === 'moeda' ? ' step="0.01" min="0" inputmode="decimal"' : f.tipo === 'numero' ? ' step="1" min="0"' : f.tipo === 'ano' ? ' min="2000" max="2100"' : '';
      return `<label class="campo${f.k === 'nome' || f.k === 'titulo' || f.k === 'descricao' ? ' inteiro' : ''}" for="${id}">${rot}<input id="${id}" type="${tipo}" name="${f.k}" value="${esc(v)}"${extra}${req}${dis}>${ajuda}</label>`;
    }
  }
}

/** Histórico de um registro: as entradas do log que falam dele. */
function historicoDe(id) {
  const ls = db.dados.auditoria.filter(l => l.registroId === id).reverse();
  if (!ls.length) return '<p class="mudo pequeno">Sem alterações registradas (carga inicial).</p>';
  return `<ul class="pequeno" style="padding-left:18px">${ls.map(l => `<li><b>${esc(l.usuario)}</b> · ${esc(l.acao)} · ${fmtDataHora(l.quando)}${l.alteracoes ? `<ul class="diff">${Object.entries(l.alteracoes).map(([k, [a, d]]) => `<li>${esc(k)}: <del>${esc(fmtValor(a))}</del> → <ins>${esc(fmtValor(d))}</ins></li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>`;
}
const fmtValor = v => v === null || v === undefined || v === '' ? '(vazio)' : typeof v === 'object' ? (v.nome || JSON.stringify(v)) : String(v);

function abrirFormulario(nome, registro, u, conferencia = false) {
  const def = COLECOES[nome];
  const edita = podeEditar(u, nome);
  const admin = pode(u, 'publica');
  const ro = !edita;
  const titulo = registro ? `${ro ? '' : 'Editar '}${def.singular}: ${def.titulo(registro)}` : `Novo ${def.singular}`;
  const corpo = `
    <div id="erros"></div>
    ${registro ? `<p class="pequeno">${seloPublicacao(registro.publicacao)} ${registro.exemplo ? '<span class="selo neutro">dado de exemplo</span>' : ''} <span class="mudo">Criado por ${esc(registro.criadoPor)} em ${fmtDataHora(registro.criadoEm)} · alterado por ${esc(registro.atualizadoPor)} em ${fmtDataHora(registro.atualizadoEm)}${registro.publicadoPor ? ` · publicado por ${esc(registro.publicadoPor)}` : ''}</span></p>` : ''}
    ${!admin && registro?.publicacao === 'publicado' && edita ? '<div class="alerta-caixa alerta">Este registro está publicado. Ao salvar uma alteração, ele sai do portal até o administrador aprovar de novo.</div>' : ''}
    <form id="form-reg" class="form-grade" novalidate>${def.campos.map(f => campoHTML(f, registro?.[f.k], ro)).join('')}</form>
    ${registro ? `<details style="margin-top:14px"><summary>Histórico deste registro</summary>${historicoDe(registro.id)}</details>` : ''}`;
  const botoes = [];
  if (registro && edita) botoes.push('<button class="botao perigo" type="button" data-acao="excluir" style="margin-right:auto">Excluir</button>');
  if (registro && admin && registro.publicacao === 'publicado') botoes.push('<button class="botao" type="button" data-acao="retirar">Retirar do portal</button>');
  if (registro && admin && registro.publicacao !== 'publicado' && conferencia) botoes.push('<button class="botao" type="button" data-acao="devolver">Devolver</button>', '<button class="botao primario" type="button" data-acao="aprovar">Aprovar e publicar</button>');
  if (edita) {
    botoes.push('<button class="botao" type="button" data-acao="rascunho">Salvar rascunho</button>');
    botoes.push(admin ? '<button class="botao primario" type="button" data-acao="publicar">Salvar e publicar</button>' : '<button class="botao primario" type="button" data-acao="enviar">Salvar e enviar para aprovação</button>');
  }
  const m = modal({ titulo, corpo, pe: botoes.join('') || '<span class="mudo pequeno">Somente leitura</span>' });
  const form = $('#form-reg', m.el);
  const erros = $('#erros', m.el);
  $('[data-ver-atual]', m.el)?.addEventListener('click', () => verDocumento(registro));

  const ler = async () => {
    const campos = {};
    for (const f of def.campos) {
      const el = form.elements[f.k];
      if (!el) continue;
      if (f.tipo === 'marca') campos[f.k] = el.checked;
      else if (f.tipo === 'arquivo') {
        const arq = el.files?.[0];
        if (arq) campos[f.k] = await db.salvarArquivo(arq, u);
        else if (registro?.arquivo) campos[f.k] = registro.arquivo;
        else campos[f.k] = null;
      } else campos[f.k] = el.value;
    }
    return campos;
  };

  m.el.querySelector('.modal-pe').addEventListener('click', async e => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const acao = b.dataset.acao;
    $$('.modal-pe button', m.el).forEach(x => x.disabled = true);
    try {
      if (acao === 'excluir') {
        if (!await confirmar('Excluir registro', `Excluir ${def.singular} “${def.titulo(registro)}”? Ele sai do portal e do cadastro. A exclusão fica registrada no histórico, com uma cópia do registro.`, { rotulo: 'Excluir', perigo: true })) return;
        await db.excluir(nome, registro.id, u); aviso('Registro excluído.');
      } else if (acao === 'retirar') { await db.definirPublicacao(nome, registro.id, 'rascunho', u); aviso('Retirado do portal.'); }
      else if (acao === 'devolver') { await db.definirPublicacao(nome, registro.id, 'rascunho', u); aviso('Devolvido para rascunho.'); }
      else if (acao === 'aprovar') { await db.definirPublicacao(nome, registro.id, 'publicado', u); aviso('Publicado.'); }
      else {
        const campos = await ler();
        const op = { publicar: acao === 'publicar', enviar: acao === 'enviar' };
        if (registro) await db.atualizar(nome, registro.id, campos, u, op); else await db.inserir(nome, campos, u, op);
        aviso(acao === 'publicar' ? 'Salvo e publicado.' : acao === 'enviar' ? 'Salvo e enviado para aprovação.' : 'Rascunho salvo.');
      }
      m.fechar();
      recarregar();
    } catch (err) {
      mostrarErro(erros, err);
    } finally {
      $$('.modal-pe button', m.el).forEach(x => x.disabled = false);
    }
  });
}

// ------------------------------------------------------------ usuários

function telaUsuarios(corpo, u) {
  const lista = auth.listarUsuarios(u);
  corpo.innerHTML = `
    <div class="cab-pagina"><div><h1>Usuários</h1><p>Quem acessa a área restrita e com qual perfil. O sistema não permite ficar sem administrador ativo, e ninguém rebaixa ou desativa a si mesmo.</p></div>
      <button class="botao primario" type="button" id="novo">Novo usuário</button></div>
    <div class="tabela-envolve"><table><thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Situação</th><th>Último acesso</th><th></th></tr></thead><tbody>
      ${lista.map(x => `<tr><td>${esc(x.nome)}${x.id === u.id ? ' <span class="selo info">você</span>' : ''}</td><td>${esc(x.login)}</td><td>${esc(PERFIS[x.perfil]?.nome || x.perfil)}</td><td>${x.ativo ? '<span class="selo ok">Ativo</span>' : '<span class="selo neutro">Inativo</span>'}</td><td>${x.ultimoAcesso ? fmtDataHora(x.ultimoAcesso) : '—'}</td>
        <td><button class="botao pequeno" type="button" data-editar="${esc(x.id)}">Editar</button></td></tr>`).join('')}
    </tbody></table></div>
    <div class="secao-titulo"><h2>Perfis de acesso</h2></div>
    <div class="tabela-envolve"><table><thead><tr><th>Perfil</th><th>O que faz</th><th>Edita</th></tr></thead><tbody>
      ${Object.values(PERFIS).map(p => `<tr><td><b>${esc(p.nome)}</b></td><td>${esc(p.descricao)}</td><td class="pequeno">${p.edita.length ? esc(p.edita.map(c => COLECOES[c].nome).join(', ')) : '—'}</td></tr>`).join('')}
      <tr><td><b>Consulta pública</b></td><td>Qualquer pessoa, sem login: vê só o que está publicado</td><td>—</td></tr>
    </tbody></table></div>`;

  const formulario = alvo => {
    const m = modal({
      titulo: alvo ? `Editar usuário: ${alvo.login}` : 'Novo usuário',
      corpo: `<div id="erros"></div><form id="fu" class="form-grade">
        <label class="campo inteiro">Nome completo<input name="nome" value="${esc(alvo?.nome || '')}" required></label>
        ${alvo ? '' : '<label class="campo">Login<input name="login" required pattern="[a-z0-9._\\-]{3,40}" autocomplete="off"></label>'}
        <label class="campo">Perfil<select name="perfil">${opcoes(Object.entries(PERFIS).map(([k, p]) => [k, p.nome]), alvo?.perfil || 'financeiro')}</select></label>
        ${alvo ? `<label class="campo marca inteiro"><input type="checkbox" name="ativo"${alvo.ativo ? ' checked' : ''}> <span>Usuário ativo (desmarcar encerra o acesso imediatamente)</span></label>` : ''}
        <label class="campo">${alvo ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial'}<input name="senha" type="password" autocomplete="new-password"${alvo ? '' : ' required'}><small>Pelo menos 10 caracteres, com letras e números</small></label>
      </form>`,
      pe: '<button class="botao" type="button" data-cancelar>Cancelar</button><button class="botao primario" type="button" data-salvar>Salvar</button>',
    });
    $('[data-cancelar]', m.el).onclick = m.fechar;
    $('[data-salvar]', m.el).onclick = async () => {
      const f = $('#fu', m.el);
      const fd = Object.fromEntries(new FormData(f));
      try {
        if (alvo) {
          await auth.alterarUsuario(alvo.id, { nome: fd.nome, perfil: fd.perfil, ativo: f.elements.ativo.checked }, u);
          if (fd.senha) await auth.redefinirSenha(alvo.id, fd.senha, u);
        } else await auth.criarUsuario(fd, u);
        aviso('Usuário salvo.'); m.fechar(); recarregar();
      } catch (err) { mostrarErro($('#erros', m.el), err); }
    };
  };
  $('#novo', corpo).onclick = () => formulario(null);
  corpo.addEventListener('click', e => { const b = e.target.closest('[data-editar]'); if (b) formulario(lista.find(x => x.id === b.dataset.editar)); });
}

// ------------------------------------------------------------ histórico

function telaHistorico(corpo, u) {
  const log = [...db.dados.auditoria].reverse();
  const usuarios = [...new Set(log.map(l => l.usuario))].sort();
  const acoes = [...new Set(log.map(l => l.acao))].sort();
  corpo.innerHTML = `
    <h1>Histórico de alterações</h1>
    <p class="mudo">Toda criação, alteração, exclusão, publicação, login e operação de backup, com data, hora e usuário responsável. O histórico não pode ser editado nem apagado pela tela, e restaurar um backup não o faz voltar no tempo.</p>
    <div class="filtros">
      <label>Usuário<select id="h-u">${opcoes(usuarios, '', 'Todos')}</select></label>
      <label>Ação<select id="h-a">${opcoes(acoes, '', 'Todas')}</select></label>
      <label>Cadastro<select id="h-c">${opcoes(Object.entries(COLECOES).map(([k, c]) => [k, c.nome]).concat([['usuarios', 'Usuários']]), '', 'Todos')}</select></label>
      <label>De<input type="date" id="h-de"></label><label>Até<input type="date" id="h-ate"></label>
      <label>Pesquisar<input type="search" id="h-busca"></label>
    </div>
    <div id="tabela"></div>`;
  const filtrar = () => {
    const [us, ac, co, de, ate] = ['#h-u', '#h-a', '#h-c', '#h-de', '#h-ate'].map(s => $(s, corpo).value);
    return log.filter(l => (!us || l.usuario === us) && (!ac || l.acao === ac) && (!co || l.colecao === co) && (!de || l.quando.slice(0, 10) >= de) && (!ate || l.quando.slice(0, 10) <= ate));
  };
  const detalhe = l => l.alteracoes ? Object.entries(l.alteracoes).map(([k, [a, d]]) => `${k}: ${fmtValor(a)} → ${fmtValor(d)}`).join('; ') : '';
  const t = montarTabela($('#tabela', corpo), {
    linhas: filtrar(), porPagina: 30, busca: $('#h-busca', corpo), ordem: { k: 'quando', dir: 'desc' },
    colunas: [
      { k: 'quando', titulo: 'Data e hora', html: l => esc(fmtDataHora(l.quando)), exportarValor: l => fmtDataHora(l.quando) },
      { k: 'usuario', titulo: 'Usuário', html: l => `${esc(l.usuario)}${l.perfil ? `<span class="sub">${esc(PERFIS[l.perfil]?.nome || l.perfil)}</span>` : ''}` },
      { k: 'acao', titulo: 'Ação' },
      { k: 'colecao', titulo: 'Cadastro', valor: l => COLECOES[l.colecao]?.nome || (l.colecao === 'usuarios' ? 'Usuários' : l.colecao || '') },
      { k: 'titulo', titulo: 'Registro', larg: 2 },
      { k: 'detalhe', titulo: 'Alterações', larg: 3, valor: detalhe, html: l => l.alteracoes ? `<ul class="diff">${Object.entries(l.alteracoes).slice(0, 6).map(([k, [a, d]]) => `<li>${esc(k)}: <del>${esc(fmtValor(a).slice(0, 60))}</del> → <ins>${esc(fmtValor(d).slice(0, 60))}</ins></li>`).join('')}</ul>` : '' },
    ],
    exportar: { titulo: 'Histórico de alterações', subtitulo: 'Trilha de auditoria' },
  });
  $$('.filtros select, .filtros input[type=date]', corpo).forEach(s => s.onchange = () => t.atualizar(filtrar()));
}

// ------------------------------------------------------------ backup

async function telaBackup(corpo, u) {
  const copias = await db.listarCopias();
  const exemplos = Object.keys(COLECOES).reduce((a, c) => a + db.colecao(c).filter(r => r.exemplo).length, 0);
  corpo.innerHTML = `
    <h1>Backup e dados</h1>
    <div class="grade">
      <section class="cartao m6"><h3>Backup completo em arquivo</h3>
        <p class="pequeno">Baixa um arquivo com todos os cadastros, usuários (só o hash das senhas), histórico e todos os documentos. Guarde fora deste computador.</p>
        <button class="botao primario" type="button" id="exportar">Baixar backup</button></section>
      <section class="cartao m6"><h3>Restaurar de um arquivo</h3>
        <p class="pequeno">Substitui os dados atuais pelos do arquivo. Antes, uma cópia automática do estado atual é guardada. O histórico de alterações é preservado e somado.</p>
        <input type="file" id="arquivo" accept="application/json,.json"> <button class="botao" type="button" id="importar">Restaurar</button></section>
      <section class="cartao"><div class="cartao-cab"><div><h3>Cópias automáticas neste navegador</h3><p>Antes da primeira alteração de cada dia e antes de toda restauração. Ficam as 10 mais recentes.</p></div><button class="botao pequeno" type="button" id="copia">Criar cópia agora</button></div>
        ${copias.length ? `<div class="tabela-envolve"><table><thead><tr><th>Quando</th><th>Motivo</th><th>Usuário</th><th class="num">Registros</th><th></th></tr></thead><tbody>${copias.map(c => `<tr><td>${fmtDataHora(c.quando)}</td><td>${esc(c.motivo)}</td><td>${esc(c.usuario || '—')}</td><td class="num">${fmtNum(c.registros)}</td><td><button class="botao pequeno" type="button" data-restaurar="${esc(c.id)}">Restaurar</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="mudo">Nenhuma cópia ainda.</p>'}
      </section>
      <section class="cartao"><h3>Dados de exemplo</h3>
        ${exemplos ? `<p class="pequeno">Há <b>${fmtNum(exemplos)}</b> registros de exemplo (e seus arquivos). Remover tira só eles: o que tiver sido cadastrado de verdade fica. Uma cópia de segurança é feita antes.</p><button class="botao perigo" type="button" id="remover-ex">Remover dados de exemplo</button>` : '<p class="mudo">A base não tem dados de exemplo.</p>'}
      </section>
    </div>`;
  $('#exportar', corpo).onclick = async () => {
    try { baixar(await db.exportarBackup(u), `backup-portal-transparencia-${hojeISO()}.json`); aviso('Backup gerado.'); }
    catch (e) { aviso(e.message, 'erro'); }
  };
  $('#importar', corpo).onclick = async () => {
    const f = $('#arquivo', corpo).files[0];
    if (!f) return aviso('Escolha o arquivo de backup.', 'erro');
    if (!await confirmar('Restaurar backup', `Substituir todos os dados atuais pelos de “${f.name}”? Uma cópia do estado atual será guardada antes.`, { rotulo: 'Restaurar', perigo: true })) return;
    try { await db.importarBackup(await f.text(), u); aviso('Backup restaurado.'); recarregar(); }
    catch (e) { aviso(e.message, 'erro'); }
  };
  $('#copia', corpo).onclick = async () => { await db.criarCopia('manual', u); aviso('Cópia criada.'); recarregar(); };
  corpo.addEventListener('click', async e => {
    const b = e.target.closest('[data-restaurar]');
    if (!b) return;
    if (!await confirmar('Restaurar cópia', 'Voltar os dados para esta cópia? O estado atual vira uma nova cópia antes, e o histórico de alterações é mantido.', { rotulo: 'Restaurar', perigo: true })) return;
    try { await db.restaurarCopia(b.dataset.restaurar, u); aviso('Cópia restaurada.'); recarregar(); }
    catch (err) { aviso(err.message, 'erro'); }
  });
  $('#remover-ex', corpo)?.addEventListener('click', async () => {
    if (!await confirmar('Remover dados de exemplo', `Remover os ${fmtNum(exemplos)} registros de exemplo e os arquivos deles? O portal público ficará só com o que foi cadastrado de verdade. Uma cópia de segurança é feita antes.`, { rotulo: 'Remover', perigo: true })) return;
    try { const r = await db.removerExemplos(u); aviso(`Removidos: ${Object.values(r).reduce((a, x) => a + x, 0)} registros.`); recarregar(); }
    catch (err) { aviso(err.message, 'erro'); }
  });
}

// ------------------------------------------------------------ conta

function telaConta(corpo, u) {
  corpo.innerHTML = `
    <h1>Minha conta</h1>
    <section class="cartao" style="max-width:520px">
      <p><b>${esc(u.nome)}</b> · ${esc(u.login)} · ${esc(PERFIS[u.perfil].nome)}</p>
      <h3>Trocar senha</h3><div id="erros"></div>
      <form id="fs" class="form-grade" style="grid-template-columns:1fr">
        <label class="campo">Senha atual<input name="atual" type="password" required autocomplete="current-password"></label>
        <label class="campo">Nova senha<input name="nova" type="password" required autocomplete="new-password"><small>Pelo menos 10 caracteres, com letras e números</small></label>
        <label class="campo">Repita a nova senha<input name="nova2" type="password" required autocomplete="new-password"></label>
        <button class="botao primario" type="submit">Trocar senha</button>
      </form>
    </section>`;
  $('#fs', corpo).onsubmit = async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const caixa = $('#erros', corpo);
    try {
      if (fd.nova !== fd.nova2) throw new db.ErroValidacao(['As senhas novas não conferem']);
      await auth.entrar(u.login, fd.atual); // confere a senha atual
      await auth.redefinirSenha(u.id, fd.nova, u);
      e.target.reset(); caixa.innerHTML = ''; aviso('Senha alterada.');
    } catch (err) { mostrarErro(caixa, err); }
  };
}


