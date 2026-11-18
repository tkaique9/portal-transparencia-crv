// Entrada do portal: abre o banco local, carrega os exemplos na primeira
// visita, monta a navegação e despacha cada rota para sua página.

import * as db from './dados/db.js';
import { gerarExemplo, VERSAO_EXEMPLO } from './dados/exemplo.js';
import { COLECOES } from './dados/esquema.js';
import { mascararDocumento, fmtDataHora, esc } from './util.js';
import { $, $$, aviso } from './ui/componentes.js';
import { anosDisponiveis } from './calculo.js';
import { iniciarMenu, marcarAtual } from './ui/menu-siga.js';

const PAGINAS = {
  '': () => import('./paginas/inicio.js'),
  institucional: () => import('./paginas/institucional.js'),
  receitas: () => import('./paginas/receitas.js'),
  despesas: () => import('./paginas/despesas.js'),
  projetos: () => import('./paginas/projetos.js'),
  impacto: () => import('./paginas/impacto.js'),
  contratos: () => import('./paginas/contratos.js'),
  prestacao: () => import('./paginas/prestacao.js'),
  documentos: () => import('./paginas/documentos.js'),
  busca: () => import('./paginas/busca.js'),
  privacidade: () => import('./paginas/textos.js'),
  'sobre-dados': () => import('./paginas/textos.js'),
  admin: () => import('./paginas/admin.js'),
};

/**
 * O que o cidadão enxerga: só registros publicados, documentos não internos,
 * e o CPF de quem recebeu pagamento já mascarado. Toda página pública lê
 * daqui — nunca de db.colecao() — para nenhum dado não publicado vazar.
 */
export function basePublica() {
  const b = Object.fromEntries(Object.keys(COLECOES).map(c => [c, db.publicos(c)]));
  const projetosPub = new Set(b.projetos.map(p => p.id));
  // metas e atendimentos de projeto não publicado também não aparecem
  b.metas = b.metas.filter(m => projetosPub.has(m.projetoId));
  b.atendimentos = b.atendimentos.filter(a => projetosPub.has(a.projetoId));
  b.despesas = b.despesas.map(d => ({ ...d, documento: mascararDocumento(d.documento) }));
  b.parceiros = b.parceiros.map(p => ({ ...p, documento: mascararDocumento(p.documento) }));
  b.anos = anosDisponiveis(b);
  b.demonstracao = !!db.dados.config.demonstracao;
  return b;
}

// ------------------------------------------------------------ rota

export function lerRota() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [caminho, qs = ''] = h.split('?');
  const partes = caminho.split('/').filter(Boolean);
  return { pagina: partes[0] || '', partes: partes.slice(1), q: new URLSearchParams(qs) };
}

/** Atualiza a query da rota sem recarregar a página (filtros na URL). */
export function gravarFiltros(params) {
  const { pagina, partes } = lerRota();
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== '' && v != null) q.set(k, v);
  const s = q.toString();
  history.replaceState(null, '', `#/${[pagina, ...partes].join('/')}${s ? '?' + s : ''}`);
}

let renderizando = 0;
async function rotear() {
  const r = lerRota();
  const carregar = PAGINAS[r.pagina];
  const main = $('#conteudo');
  marcarMenu(r);
  $('#app').classList.remove('menu-aberto');
  const minha = ++renderizando;
  if (!carregar) {
    main.innerHTML = '<h1>Página não encontrada</h1><p><a href="#/">Voltar para a visão geral</a></p>';
    return;
  }
  try {
    const mod = await carregar();
    if (minha !== renderizando) return;
    await mod.render(main, r);
    document.title = (main.querySelector('h1')?.textContent ? main.querySelector('h1').textContent + ' — ' : '') + 'Portal de Transparência — Instituto CRV';
    if (!r.q.has('manter-rolagem')) window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="alerta-caixa erro"><b>Não foi possível exibir esta página.</b><br>${esc(e.message)}</div>`;
  }
}

/** Menu lateral (padrão SIGA-MG): tela atual marcada e o caminho "grupo / tela" na barra de cima. */
const TITULOS_EXTRA = { busca: ['Portal', 'Pesquisa'] };
function marcarMenu(r) {
  const atual = marcarAtual(r.pagina);
  const [grupo, tela] = atual ? [atual.grupo, atual.tela === 'Início / Painel' ? 'Painel' : atual.tela] : TITULOS_EXTRA[r.pagina] || ['Portal', 'Página não encontrada'];
  $('#crumb-grupo').textContent = grupo;
  $('#crumb-tela').textContent = tela;
}

function atualizarRodape() {
  const datas = Object.keys(COLECOES).flatMap(c => db.publicos(c).map(r => r.publicadoEm || r.atualizadoEm)).filter(Boolean).sort();
  $('#ultima-atualizacao').innerHTML = datas.length ? `Atualizado em <b>${esc(fmtDataHora(datas[datas.length - 1]))}</b>` : '';
  const demo = !!db.dados.config.demonstracao;
  $('#faixa-exemplo').hidden = !demo;
  $('#chip-exemplo').hidden = !demo;
  $('#side-status').innerHTML = `Base: <b>${demo ? 'dados de exemplo' : 'dados publicados'}</b>`;
}


/**
 * Base só com exemplos de uma versão anterior da carga (ilustrações novas,
 * por exemplo) e ninguém cadastrado: pode regerar sem perder nada. Havendo
 * usuário ou registro real, não mexe — quem administra decide.
 */
function exemploDesatualizado() {
  const d = db.dados;
  if (!d?.config.demonstracao || (d.config.versaoExemplo || 1) >= VERSAO_EXEMPLO || d.usuarios.length) return false;
  return Object.keys(COLECOES).every(c => db.colecao(c).every(r => r.exemplo));
}

// ------------------------------------------------------------ tema

function aplicarTema(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
function lerTema() { try { return localStorage.getItem('crv-tema'); } catch { return null; } }

// ------------------------------------------------------------ início

async function iniciar() {
  aplicarTema(lerTema());
  $('#alternar-tema').onclick = () => {
    const escuro = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const novo = escuro ? 'light' : 'dark';
    aplicarTema(novo);
    try { localStorage.setItem('crv-tema', novo); } catch { /* sem armazenamento */ }
    rotear();
  };
  iniciarMenu();
  $('#form-busca').onsubmit = e => {
    e.preventDefault();
    const q = $('#busca-geral').value.trim();
    if (q) location.hash = `#/busca?q=${encodeURIComponent(q)}`;
  };

  try {
    const existe = await db.abrir();
    if (!existe || exemploDesatualizado()) {
      $('#carregando-msg').textContent = 'Primeiro acesso: preparando os dados de exemplo…';
      const doc = await gerarExemplo(msg => { $('#carregando-msg').textContent = msg; });
      await db.substituir(doc);
      await db.limparOrfaos(); // arquivos da carga anterior, quando houve regeração
    }
  } catch (e) {
    console.error(e);
    $('#conteudo').innerHTML = `<div class="alerta-caixa erro"><b>Não foi possível abrir o banco local do navegador.</b><br>${esc(e.message)}<br>Verifique se o navegador não está em modo que bloqueia armazenamento (algumas janelas privativas bloqueiam).</div>`;
    return;
  }
  db.aoMudar(atualizarRodape);
  atualizarRodape();
  addEventListener('hashchange', rotear);
  await rotear();
}

addEventListener('unhandledrejection', e => { console.error(e.reason); aviso(e.reason?.message || 'Erro inesperado', 'erro'); });
iniciar();
