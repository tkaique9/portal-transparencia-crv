// Entrada do portal: abre o banco local, carrega os exemplos na primeira
// visita, monta a navegação e despacha cada rota para sua página.

import * as db from './dados/db.js';
import { COLECOES } from './dados/esquema.js';
import { fmtDataHora, esc } from './util.js';
import { $, aviso } from './ui/componentes.js';
import { iniciarMenu, marcarAtual } from './ui/menu-siga.js';
import { prepararBase } from './dados/base.js';

// As páginas importam basePublica daqui; ela mora em dados/base.js (o site institucional também usa).
export { basePublica } from './dados/base.js';

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
    await prepararBase(msg => { $('#carregando-msg').textContent = msg; });
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
