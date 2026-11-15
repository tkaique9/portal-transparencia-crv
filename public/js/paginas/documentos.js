// Biblioteca pública de documentos e publicações.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtData, fmtNum, norm, tamanhoArquivo } from '../util.js';
import { opcoes, ligarDocumentos, ehImagem } from '../ui/componentes.js';
import { CATEGORIAS_DOCUMENTO } from '../dados/esquema.js';

/** Grupos da biblioteca, na ordem em que um cidadão costuma procurar. */
const GRUPOS = [
  ['Institucionais', ['Estatuto social', 'Regimento interno', 'Política institucional', 'Certidão']],
  ['Relatórios e prestação de contas', ['Relatório anual', 'Relatório de gestão', 'Relatório de atividades', 'Relatório financeiro', 'Prestação de contas']],
  ['Contábeis e auditoria', ['Demonstrações contábeis', 'Balanço financeiro', 'Relatório de auditoria', 'Parecer']],
  ['Contratos e comprovantes', ['Contrato / convênio', 'Nota fiscal / comprovante']],
  ['Fotografias e outros', ['Fotografia', 'Outros']],
];

export async function render(main, rota) {
  const b = basePublica();
  const f = { categoria: rota.q.get('categoria') || '', exercicio: rota.q.get('exercicio') || '', q: rota.q.get('q') || '' };
  const exercicios = [...new Set(b.documentos.map(d => d.exercicio))].sort((a, c) => c - a);
  main.innerHTML = `
    <div class="cab-pagina"><div><div class="trilha-nav"><a href="#/">Início</a> › Documentos</div>
      <h1>Documentos e publicações</h1>
      <p>Estatuto, regimento, políticas, relatórios, demonstrações contábeis, balanços, certidões, auditorias, contratos e comprovantes — para visualizar no navegador ou baixar.</p></div></div>
    <form class="filtros" id="filtros">
      <label>Categoria<select name="categoria">${opcoes(CATEGORIAS_DOCUMENTO, f.categoria, 'Todas')}</select></label>
      <label>Exercício<select name="exercicio">${opcoes(exercicios, f.exercicio, 'Todos')}</select></label>
      <label>Pesquisar<input type="search" name="q" value="${esc(f.q)}" placeholder="Título, descrição…"></label>
    </form>
    <div id="lista"></div>`;
  const form = main.querySelector('#filtros');
  const lista = main.querySelector('#lista');
  ligarDocumentos(lista, b.documentos);

  const cartao = d => `<div class="doc"><div class="icone-doc${ehImagem(d) ? ' img' : ''}">${ehImagem(d) ? 'IMG' : 'PDF'}</div><div style="min-width:0">
      <h3>${esc(d.titulo)}</h3>
      <div class="meta">${esc(d.categoria)} · ${fmtData(d.data)} · ${tamanhoArquivo(d.arquivo?.tamanho || 0)}${d.projetoId ? ` · ${esc(calc.nomeProjeto(b, d.projetoId, ''))}` : ''}</div>
      ${d.descricao ? `<p class="pequeno mudo" style="margin:4px 0 0">${esc(d.descricao)}</p>` : ''}
      <div class="grupo-botoes"><button class="botao pequeno" type="button" data-ver-doc="${esc(d.id)}">Visualizar</button><button class="botao pequeno" type="button" data-baixar-doc="${esc(d.id)}">Baixar</button></div>
    </div></div>`;

  const desenhar = () => {
    gravarFiltros(f);
    const t = norm(f.q);
    const docs = b.documentos.filter(d => (!f.categoria || d.categoria === f.categoria) && (!f.exercicio || String(d.exercicio) === f.exercicio) &&
      (!t || norm(`${d.titulo} ${d.descricao} ${d.categoria}`).includes(t))).sort((a, c) => c.data.localeCompare(a.data));
    if (!docs.length) { lista.innerHTML = '<p class="vazio">Nenhum documento encontrado com esses filtros.</p>'; return; }
    lista.innerHTML = `<p class="mudo pequeno">${fmtNum(docs.length)} documento(s).</p>` + GRUPOS.map(([nome, cats]) => {
      const ds = docs.filter(d => cats.includes(d.categoria));
      return ds.length ? `<div class="secao-titulo"><h2>${esc(nome)}</h2><span class="mudo pequeno">${fmtNum(ds.length)}</span></div><div class="docs">${ds.map(cartao).join('')}</div>` : '';
    }).join('');
  };
  form.addEventListener('input', e => { if (e.target.name) { f[e.target.name] = e.target.value; desenhar(); } });
  form.addEventListener('submit', e => e.preventDefault());
  desenhar();
}
