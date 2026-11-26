// Peças de interface reaproveitadas por todas as páginas.

import { esc, fmtMoeda, fmtData, fmtNum, fmtPct, norm, baixar, tamanhoArquivo } from '../util.js';
import { lerArquivo, dados } from '../dados/db.js';
import { PUBLICACAO } from '../dados/esquema.js';
import { exportarTabela } from '../export/exportar.js';

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

// ------------------------------------------------------------ avisos

export function aviso(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = 'aviso' + (tipo === 'erro' ? ' erro' : '');
  el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  el.textContent = msg;
  $('#avisos').appendChild(el);
  setTimeout(() => el.remove(), tipo === 'erro' ? 7000 : 3500);
}

// ------------------------------------------------------------ modal

/** Abre um modal. Fecha com Esc, clique fora ou botão. Devolve {el, fechar}. */
export function modal({ titulo, corpo, pe = '', largo = false, aoFechar = null }) {
  const raiz = $('#modal-raiz');
  const anterior = document.activeElement;
  const fundo = document.createElement('div');
  fundo.className = 'fundo-modal';
  fundo.innerHTML = `<div class="modal${largo ? ' largo' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
    <div class="modal-cab"><h2 id="modal-titulo">${esc(titulo)}</h2><button class="fechar" type="button" aria-label="Fechar">×</button></div>
    <div class="modal-corpo">${corpo}</div>${pe ? `<div class="modal-pe">${pe}</div>` : ''}</div>`;
  raiz.appendChild(fundo);
  document.body.style.overflow = 'hidden';
  const fechar = () => {
    fundo.remove();
    if (!raiz.children.length) document.body.style.overflow = '';
    document.removeEventListener('keydown', tecla);
    aoFechar?.();
    anterior?.focus?.();
  };
  const tecla = e => {
    if (e.key === 'Escape' && raiz.lastElementChild === fundo) fechar();
    if (e.key === 'Tab') { // mantém o foco dentro do modal
      const foco = $$('button, a[href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])', fundo).filter(x => !x.disabled && x.offsetParent !== null);
      if (!foco.length) return;
      if (e.shiftKey && document.activeElement === foco[0]) { e.preventDefault(); foco[foco.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === foco[foco.length - 1]) { e.preventDefault(); foco[0].focus(); }
    }
  };
  document.addEventListener('keydown', tecla);
  fundo.addEventListener('mousedown', e => { if (e.target === fundo) fechar(); });
  $('.fechar', fundo).onclick = fechar;
  setTimeout(() => ($('input, select, textarea', fundo) || $('.fechar', fundo)).focus(), 0);
  return { el: fundo, fechar };
}

export function confirmar(titulo, mensagem, { rotulo = 'Confirmar', perigo = false } = {}) {
  return new Promise(ok => {
    let decidido = false;
    const m = modal({
      titulo, corpo: `<p>${esc(mensagem)}</p>`,
      pe: `<button class="botao" type="button" data-nao>Cancelar</button><button class="botao ${perigo ? 'perigo' : 'primario'}" type="button" data-sim>${esc(rotulo)}</button>`,
      aoFechar: () => { if (!decidido) ok(false); },
    });
    $('[data-nao]', m.el).onclick = () => m.fechar();
    $('[data-sim]', m.el).onclick = () => { decidido = true; m.fechar(); ok(true); };
  });
}

// ------------------------------------------------------------ documentos

export const ehImagem = d => d?.arquivo?.tipo?.startsWith('image/');

/** Abre o documento num visor (PDF no leitor do navegador, imagem ampliada). */
export async function verDocumento(doc) {
  if (!doc?.arquivo) return aviso('Este registro não tem arquivo anexado.', 'erro');
  const a = await lerArquivo(doc.arquivo.id);
  if (!a) return aviso('Arquivo não encontrado no armazenamento.', 'erro');
  const url = URL.createObjectURL(a.blob);
  const corpo = ehImagem(doc)
    ? `<img class="visor-img" src="${url}" alt="${esc(doc.titulo)}">${doc.descricao ? `<p class="mudo pequeno">${esc(doc.descricao)}</p>` : ''}`
    : `<iframe class="visor" src="${url}" title="${esc(doc.titulo)}"></iframe>`;
  const m = modal({
    titulo: doc.titulo, largo: !ehImagem(doc), corpo,
    pe: `<span class="mudo pequeno" style="margin-right:auto">${esc(doc.categoria)} · ${fmtData(doc.data)} · ${tamanhoArquivo(a.tamanho)} · SHA-256 ${esc(a.sha256.slice(0, 12))}…</span><button class="botao primario" type="button" data-baixar>Baixar</button>`,
    aoFechar: () => URL.revokeObjectURL(url),
  });
  $('[data-baixar]', m.el).onclick = () => baixar(a.blob, a.nome);
}

export async function baixarDocumento(doc) {
  const a = doc?.arquivo && await lerArquivo(doc.arquivo.id);
  if (!a) return aviso('Arquivo não encontrado.', 'erro');
  baixar(a.blob, a.nome);
}

/** Link para um documento (por id), usado nas tabelas de receitas, despesas e contratos. */
export function linkDocumento(id, docs, rotulo = 'Ver') {
  const d = id && docs.find(x => x.id === id);
  return d ? `<button class="link-doc" type="button" data-ver-doc="${esc(d.id)}" title="${esc(d.titulo)}">${esc(rotulo)}</button>` : '<span class="mudo">—</span>';
}

/** Delegação: qualquer [data-ver-doc] dentro de `raiz` abre o visor. */
export function ligarDocumentos(raiz, docs) {
  raiz.addEventListener('click', e => {
    const b = e.target.closest('[data-ver-doc]');
    if (b) verDocumento(docs.find(d => d.id === b.dataset.verDoc));
    const c = e.target.closest('[data-baixar-doc]');
    if (c) baixarDocumento(docs.find(d => d.id === c.dataset.baixarDoc));
  });
}

// ------------------------------------------------------------ indicadores

/**
 * Variação contra o período anterior. A cor diz se é bom ou ruim — e nunca
 * sozinha: vai com seta e com o número. sentido: 'sobe' (mais é melhor),
 * 'desce' (menos é melhor) ou 'neutro' (gasto não é bom nem ruim em si).
 */
export function delta(v, rotulo = '', sentido = 'sobe') {
  if (v === null || v === undefined || !Number.isFinite(v)) return '';
  const seta = Math.abs(v) < 0.0005 ? '■' : v > 0 ? '▲' : '▼';
  const cls = sentido === 'neutro' || Math.abs(v) < 0.0005 ? 'neutro' : (v > 0) === (sentido === 'sobe') ? 'bom' : 'ruim';
  const txt = (v > 0 ? '+' : '') + (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
  return `<span class="delta ${cls}" title="${esc(rotulo)}">${seta} ${esc(txt)}${rotulo ? ` <small>${esc(rotulo)}</small>` : ''}</span>`;
}

/**
 * Cartão de indicador. op: { medidor (0–1), destaque, cor (faixa lateral),
 * delta: {v, rotulo, sentido}, mini: SVG de tendência (minigrafico) }
 */
export function kpi(rotulo, valor, nota = '', { medidor = null, destaque = false, cor = null, delta: d = null, mini = '' } = {}) {
  return `<div class="kpi${destaque ? ' destaque' : ''}"${cor ? ` style="--kpi-cor:${cor}"` : ''}>
    <div class="topo-kpi"><span class="rotulo">${esc(rotulo)}</span></div>
    <div class="valor-linha"><span class="valor">${esc(valor)}</span>${mini}</div>
    ${d && Number.isFinite(d.v) ? `<div class="linha-delta">${delta(d.v, d.rotulo, d.sentido)}</div>` : ''}
    ${nota ? `<div class="nota">${esc(nota)}</div>` : ''}
    ${medidor !== null ? `<div class="medidor" role="img" aria-label="${fmtPct(medidor)}"><i style="width:${Math.min(100, Math.max(0, medidor * 100))}%"></i></div>` : ''}</div>`;
}

/** Cor de cada área de atuação (ordem fixa da paleta categórica). */
export const COR_AREA = {
  'Educação': 'var(--s1)', 'Cultura e esporte': 'var(--s2)', 'Saúde e bem-estar': 'var(--s3)',
  'Geração de renda': 'var(--s4)', 'Assistência social': 'var(--s7)', 'Meio ambiente': 'var(--s6)',
};

// ------------------------------------------------------------ fotos

const urls = new Map();
/** URL de uma imagem guardada no banco local (reaproveitada entre telas). */
export async function urlImagem(doc) {
  if (!doc?.arquivo) return null;
  if (!urls.has(doc.arquivo.id)) {
    const a = await lerArquivo(doc.arquivo.id);
    if (!a) return null;
    urls.set(doc.arquivo.id, URL.createObjectURL(a.blob));
  }
  return urls.get(doc.arquivo.id);
}
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const legendaFoto = d => d.titulo.split(' — ')[0];

/**
 * Carrossel de fotos. Devolve o HTML; ligarCarrosseis() dá vida (setas,
 * pontos, deslizar no celular e clique que abre a galeria em tela cheia).
 */
export function carrossel(fotos, { selos = '', vazio = 'Sem fotos publicadas' } = {}) {
  if (!fotos.length) return `<div class="carrossel"><div class="vazio" style="height:100%;display:grid;place-items:center">${esc(vazio)}</div>${selos ? `<div class="selos">${selos}</div>` : ''}</div>`;
  // foto de banco de imagens ou ilustração dos dados de exemplo: não é foto do projeto, e o cartão diz
  if (fotos.some(f => f.exemplo || f.fonte?.tipo === 'banco-de-imagens')) selos += '<span class="selo alerta">foto ilustrativa</span>';
  return `<div class="carrossel" data-carrossel="${esc(fotos.map(f => f.id).join(','))}" data-i="0">
    <div class="trilho">${fotos.map(f => `<img data-foto="${esc(f.id)}" src="${PIXEL}" alt="${esc(legendaFoto(f))}" loading="lazy">`).join('')}</div>
    ${selos ? `<div class="selos">${selos}</div>` : ''}
    ${fotos.length > 1 ? `<button class="seta ant" type="button" aria-label="Foto anterior">‹</button><button class="seta prox" type="button" aria-label="Próxima foto">›</button>
    <div class="pontos">${fotos.map((_, i) => `<button type="button" aria-label="Foto ${i + 1}"${i ? '' : ' class="on"'}></button>`).join('')}</div>
    <span class="contador">1/${fotos.length}</span>` : ''}
  </div>`;
}

function irPara(c, i) {
  const n = c.querySelectorAll('.trilho img').length;
  const k = ((i % n) + n) % n;
  c.dataset.i = k;
  c.querySelector('.trilho').style.transform = `translateX(-${k * 100}%)`;
  c.querySelectorAll('.pontos button').forEach((b, j) => b.classList.toggle('on', j === k));
  const cont = c.querySelector('.contador'); if (cont) cont.textContent = `${k + 1}/${n}`;
  c.dispatchEvent(new CustomEvent('foto', { detail: k, bubbles: true }));
}

/** Liga todos os carrosséis dentro de `raiz`. docs = lista onde procurar as fotos por id. */
export async function ligarCarrosseis(raiz, docs) {
  const porId = id => docs.find(d => d.id === id);
  for (const img of raiz.querySelectorAll('img[data-foto]')) {
    const url = await urlImagem(porId(img.dataset.foto));
    if (url) img.src = url;
  }
  for (const c of raiz.querySelectorAll('[data-carrossel]')) {
    if (c._ligado) continue;
    c._ligado = true;
    const fotos = c.dataset.carrossel.split(',').map(porId).filter(Boolean);
    c.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (e.target.closest('.ant')) return irPara(c, Number(c.dataset.i) - 1);
      if (e.target.closest('.prox')) return irPara(c, Number(c.dataset.i) + 1);
      const p = e.target.closest('.pontos button');
      if (p) return irPara(c, [...p.parentNode.children].indexOf(p));
      if (e.target.closest('img')) abrirGaleria(fotos, Number(c.dataset.i));
    });
    let x0 = null;
    c.addEventListener('pointerdown', e => { x0 = e.clientX; });
    c.addEventListener('pointerup', e => {
      if (x0 !== null && Math.abs(e.clientX - x0) > 40) irPara(c, Number(c.dataset.i) + (e.clientX < x0 ? 1 : -1));
      x0 = null;
    });
  }
}
export { irPara as carrosselIr };

/** Galeria em tela cheia: setas, teclado (← → Esc), miniaturas e deslizar. */
export async function abrirGaleria(fotos, inicio = 0) {
  if (!fotos.length) return;
  const anterior = document.activeElement;
  const el = document.createElement('div');
  el.className = 'galeria-tela';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Galeria de fotos');
  const urlsFotos = await Promise.all(fotos.map(urlImagem));
  el.innerHTML = `
    <div class="gt-cab"><div><b id="gt-titulo"></b><br><span id="gt-sub"></span></div><button class="fechar" type="button" aria-label="Fechar galeria">×</button></div>
    <div class="gt-palco">${fotos.length > 1 ? '<button class="gt-seta ant" type="button" aria-label="Foto anterior">‹</button>' : ''}<img id="gt-img" alt=""><span></span>${fotos.length > 1 ? '<button class="gt-seta prox" type="button" aria-label="Próxima foto">›</button>' : ''}</div>
    <div class="gt-pe">${fotos.map((f, i) => `<button type="button" data-i="${i}" aria-label="${esc(legendaFoto(f))}"><img src="${urlsFotos[i] || PIXEL}" alt=""></button>`).join('')}</div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  let i = inicio;
  const mostrar = k => {
    i = ((k % fotos.length) + fotos.length) % fotos.length;
    const f = fotos[i];
    el.querySelector('#gt-img').src = urlsFotos[i] || PIXEL;
    el.querySelector('#gt-img').alt = legendaFoto(f);
    el.querySelector('#gt-titulo').textContent = legendaFoto(f);
    el.querySelector('#gt-sub').textContent = `${i + 1} de ${fotos.length}${f.titulo.includes(' — ') ? ' · ' + f.titulo.split(' — ').slice(1).join(' — ') : ''}${f.descricao ? ' · ' + f.descricao : ''}`;
    el.querySelectorAll('.gt-pe button').forEach((b, j) => b.classList.toggle('on', j === i));
  };
  const fechar = () => { el.remove(); document.body.style.overflow = ''; removeEventListener('keydown', tecla); anterior?.focus?.(); };
  const tecla = e => {
    if (e.key === 'Escape') fechar();
    else if (e.key === 'ArrowRight') mostrar(i + 1);
    else if (e.key === 'ArrowLeft') mostrar(i - 1);
  };
  addEventListener('keydown', tecla);
  el.addEventListener('click', e => {
    if (e.target.closest('.fechar') || e.target === el.querySelector('.gt-palco')) return fechar();
    if (e.target.closest('.gt-seta.ant')) return mostrar(i - 1);
    if (e.target.closest('.gt-seta.prox')) return mostrar(i + 1);
    const b = e.target.closest('.gt-pe button');
    if (b) mostrar(Number(b.dataset.i));
  });
  let x0 = null;
  el.addEventListener('pointerdown', e => { x0 = e.clientX; });
  el.addEventListener('pointerup', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) mostrar(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  mostrar(i);
  el.querySelector('.fechar').focus();
}

export function seloPublicacao(estado) {
  const cls = { publicado: 'ok', pendente: 'alerta', rascunho: 'neutro' }[estado] || 'neutro';
  return `<span class="selo ${cls}">${esc(PUBLICACAO[estado] || estado)}</span>`;
}

export function seloStatus(status) {
  const cls = { 'Em execução': 'info', 'Concluído': 'ok', 'Planejado': 'neutro', 'Suspenso': 'erro', 'Vigente': 'info', 'Encerrado': 'neutro', 'Em prestação de contas': 'alerta', 'Rescindido': 'erro' }[status] || 'neutro';
  return `<span class="selo ${cls}">${esc(status)}</span>`;
}

export const opcoes = (lista, valor, vazio = null) =>
  (vazio !== null ? `<option value="">${esc(vazio)}</option>` : '') +
  lista.map(o => { const [v, r] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(valor ?? '') ? ' selected' : ''}>${esc(r)}</option>`; }).join('');

// ------------------------------------------------------------ tabela

const FORMATO = { moeda: fmtMoeda, data: fmtData, int: fmtNum, pct: fmtPct };

/**
 * Tabela com ordenação por coluna, busca, paginação e exportação.
 * cfg: {
 *   colunas: [{ k, titulo, tipo?, valor?(r), html?(r), exportar?:false, larg? }],
 *   linhas, porPagina=20, ordem: {k, dir}, total?: {k: valor}, busca?: el input,
 *   exportar?: { titulo, subtitulo?, filtros?() }, vazio
 * }
 */
export function montarTabela(el, cfg) {
  const est = { pagina: 0, ordem: cfg.ordem || null, termo: '' };
  const valor = (c, r) => c.valor ? c.valor(r) : r[c.k];
  const num = c => ['moeda', 'int', 'pct'].includes(c.tipo);

  const linhasFiltradas = () => {
    let ls = cfg.linhas;
    if (est.termo) {
      const t = norm(est.termo);
      ls = ls.filter(r => cfg.colunas.some(c => norm(valor(c, r)).includes(t)));
    }
    if (est.ordem) {
      const c = cfg.colunas.find(x => x.k === est.ordem.k);
      const d = est.ordem.dir === 'asc' ? 1 : -1;
      ls = [...ls].sort((a, b) => {
        const va = valor(c, a), vb = valor(c, b);
        if (typeof va === 'number' || typeof vb === 'number') return ((va || 0) - (vb || 0)) * d;
        return String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR') * d;
      });
    }
    return ls;
  };

  const desenhar = () => {
    const ls = linhasFiltradas();
    const por = cfg.porPagina || 20;
    const paginas = Math.max(1, Math.ceil(ls.length / por));
    est.pagina = Math.min(est.pagina, paginas - 1);
    const vis = ls.slice(est.pagina * por, est.pagina * por + por);
    const totalCol = cfg.total ? cfg.colunas.map(c => cfg.total(ls)[c.k]) : null;
    const cel = (c, r) => c.html ? c.html(r) : esc(FORMATO[c.tipo] ? FORMATO[c.tipo](valor(c, r)) : valor(c, r) ?? '');
    el.innerHTML = `
      <div class="tabela-envolve"><table>
        <thead><tr>${cfg.colunas.map(c => `<th${num(c) ? ' class="num"' : ''}${est.ordem?.k === c.k ? ` aria-sort="${est.ordem.dir === 'asc' ? 'ascending' : 'descending'}"` : ''} scope="col">${c.semOrdem ? esc(c.titulo) : `<button type="button" data-ordem="${esc(c.k)}">${esc(c.titulo)}</button>`}</th>`).join('')}</tr></thead>
        <tbody>${vis.length ? vis.map(r => `<tr>${cfg.colunas.map(c => `<td${num(c) ? ' class="num"' : ''}>${cel(c, r)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cfg.colunas.length}" class="vazio">${esc(cfg.vazio || 'Nenhum registro encontrado com esses filtros.')}</td></tr>`}</tbody>
        ${totalCol && ls.length ? `<tfoot><tr>${cfg.colunas.map((c, i) => `<td${num(c) ? ' class="num"' : ''}>${i === 0 ? `Total (${fmtNum(ls.length)})` : totalCol[i] == null ? '' : esc(FORMATO[c.tipo] ? FORMATO[c.tipo](totalCol[i]) : totalCol[i])}</td>`).join('')}</tr></tfoot>` : ''}
      </table></div>
      <div class="tabela-rodape">
        <span>${fmtNum(ls.length)} registro(s)${paginas > 1 ? ` · página ${est.pagina + 1} de ${paginas}` : ''}</span>
        <div class="grupo-botoes">
          ${paginas > 1 ? `<div class="paginacao"><button class="botao pequeno" type="button" data-pag="-1"${est.pagina === 0 ? ' disabled' : ''}>Anterior</button><button class="botao pequeno" type="button" data-pag="1"${est.pagina >= paginas - 1 ? ' disabled' : ''}>Próxima</button></div>` : ''}
          ${cfg.exportar ? `<button class="botao pequeno" type="button" data-exp="xlsx">Exportar Excel</button><button class="botao pequeno" type="button" data-exp="pdf">Exportar PDF</button>` : ''}
        </div>
      </div>`;
  };

  el.addEventListener('click', e => {
    const o = e.target.closest('[data-ordem]');
    if (o) {
      const k = o.dataset.ordem;
      est.ordem = est.ordem?.k === k ? { k, dir: est.ordem.dir === 'asc' ? 'desc' : 'asc' } : { k, dir: num(cfg.colunas.find(c => c.k === k)) ? 'desc' : 'asc' };
      est.pagina = 0; desenhar();
      el.querySelector(`[data-ordem="${CSS.escape(k)}"]`)?.focus();
    }
    const p = e.target.closest('[data-pag]');
    if (p) { est.pagina += Number(p.dataset.pag); desenhar(); }
    const x = e.target.closest('[data-exp]');
    if (x) {
      const ls = linhasFiltradas();
      const cols = cfg.colunas.filter(c => c.exportar !== false);
      const tot = cfg.total ? cfg.total(ls) : null;
      exportarTabela({
        titulo: cfg.exportar.titulo, subtitulo: cfg.exportar.subtitulo,
        filtros: [cfg.exportar.filtros?.(), est.termo ? `busca "${est.termo}"` : ''].filter(Boolean).join(' · '),
        colunas: cols.map(c => ({ titulo: c.titulo, tipo: c.tipo, largPdf: c.larg })),
        linhas: ls.map(r => cols.map(c => c.exportarValor ? c.exportarValor(r) : valor(c, r))),
        total: tot ? cols.map((c, i) => i === 0 ? 'Total' : tot[c.k] ?? '') : null,
      }, x.dataset.exp, { demonstracao: !!dados.config.demonstracao });
    }
  });
  // A caixa de busca sobrevive aos redesenhos da página; a tabela, não. Um
  // ouvinte só, que sempre fala com a tabela mais recente.
  if (cfg.busca) {
    est.termo = cfg.busca.value;
    cfg.busca._filtrar = () => { est.termo = cfg.busca.value; est.pagina = 0; desenhar(); };
    if (!cfg.busca._ligado) { cfg.busca._ligado = true; cfg.busca.addEventListener('input', () => cfg.busca._filtrar()); }
  }
  desenhar();
  return { atualizar(linhas) { cfg.linhas = linhas; est.pagina = 0; desenhar(); } };
}
