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

export function kpi(rotulo, valor, nota = '', { medidor = null, destaque = false } = {}) {
  return `<div class="kpi${destaque ? ' destaque' : ''}"><div class="rotulo">${esc(rotulo)}</div><div class="valor">${esc(valor)}</div>${nota ? `<div class="nota">${esc(nota)}</div>` : ''}${medidor !== null ? `<div class="medidor" role="img" aria-label="${fmtPct(medidor)}"><i style="width:${Math.min(100, Math.max(0, medidor * 100))}%"></i></div>` : ''}</div>`;
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
