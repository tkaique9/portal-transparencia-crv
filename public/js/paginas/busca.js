// Pesquisa geral: procura o termo em tudo que é público.

import { basePublica } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtData, norm } from '../util.js';
import { ligarDocumentos } from '../ui/componentes.js';

const LIMITE = 12;

export async function render(main, rota) {
  const b = basePublica();
  const q = (rota.q.get('q') || '').trim();
  document.getElementById('busca-geral').value = q;
  const termos = norm(q).split(/\s+/).filter(Boolean);
  const casa = (...campos) => { const t = norm(campos.join(' ')); return termos.every(x => t.includes(x)); };
  const parc = id => b.parceiros.find(p => p.id === id)?.nome || '';
  const proj = id => calc.nomeProjeto(b, id, '');

  const grupos = !termos.length ? [] : [
    ['Projetos', b.projetos.filter(p => casa(p.nome, p.objetivo, p.descricao, p.municipios, p.area, p.local)).map(p => ({ href: `#/projetos/${p.id}`, titulo: p.nome, sub: `${p.area} · ${p.status} · ${calc.municipiosDe(p).join(', ')}` }))],
    ['Documentos', b.documentos.filter(d => casa(d.titulo, d.descricao, d.categoria)).map(d => ({ doc: d.id, titulo: d.titulo, sub: `${d.categoria} · ${fmtData(d.data)}` }))],
    ['Contratos e parcerias', b.contratos.filter(c => casa(c.numero, c.tipo, c.objeto, parc(c.parceiroId))).map(c => ({ href: `#/contratos`, titulo: `${c.tipo} ${c.numero}`, sub: `${parc(c.parceiroId)} · ${c.valor ? fmtMoeda(c.valor) : 'sem repasse'}` }))],
    ['Parceiros', b.parceiros.filter(p => casa(p.nome, p.tipo, p.municipio)).map(p => ({ href: `#/receitas?ano=`, titulo: p.nome, sub: p.tipo }))],
    ['Despesas', b.despesas.filter(d => casa(d.fornecedor, d.descricao, d.categoria, d.documento, proj(d.projetoId))).sort((a, c) => c.data.localeCompare(a.data)).map(d => ({ href: `#/despesas?ano=`, titulo: `${d.fornecedor} — ${fmtMoeda(d.valor)}`, sub: `${fmtData(d.data)} · ${d.descricao}` }))],
    ['Receitas', b.receitas.filter(r => casa(parc(r.parceiroId), r.origem, r.tipo, r.observacoes, proj(r.projetoId))).sort((a, c) => c.data.localeCompare(a.data)).map(r => ({ href: `#/receitas?ano=`, titulo: `${parc(r.parceiroId)} — ${fmtMoeda(r.valor)}`, sub: `${fmtData(r.data)} · ${r.origem} · ${r.tipo}` }))],
  ].filter(([, l]) => l.length);

  const total = grupos.reduce((a, [, l]) => a + l.length, 0);
  main.innerHTML = `
    <div class="trilha-nav"><a href="#/">Início</a> › Pesquisa</div>
    <h1>Pesquisa${q ? `: “${esc(q)}”` : ''}</h1>
    ${!termos.length ? '<p>Digite um termo na caixa de pesquisa do topo da página.</p>' : !total ? '<p class="vazio">Nada encontrado. Tente outro termo, como o nome de um projeto, município, fornecedor ou tipo de documento.</p>' : `<p class="mudo">${total} resultado(s).</p>`}
    ${grupos.map(([nome, itens]) => `<section class="cartao" style="margin-bottom:14px"><div class="cartao-cab"><h2>${esc(nome)}</h2><span class="mudo pequeno">${itens.length}</span></div>
      <ul style="margin:0;padding-left:18px">${itens.slice(0, LIMITE).map(i => `<li style="margin-bottom:6px">${i.doc ? `<button class="link-doc" type="button" data-ver-doc="${esc(i.doc)}">${esc(i.titulo)}</button>` : `<a href="${esc(i.href)}">${esc(i.titulo)}</a>`}<span class="sub mudo pequeno" style="display:block">${esc(i.sub)}</span></li>`).join('')}</ul>
      ${itens.length > LIMITE ? `<p class="mudo pequeno" style="margin:8px 0 0">e mais ${itens.length - LIMITE}. Use os filtros da página de ${esc(nome.toLowerCase())} para refinar.</p>` : ''}</section>`).join('')}`;
  ligarDocumentos(main, b.documentos);
}
