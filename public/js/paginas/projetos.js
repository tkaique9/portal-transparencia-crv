// Projetos e ações sociais: catálogo e página de cada projeto.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtMoedaCurta, fmtNum, fmtNumCurto, fmtPct, fmtData, norm } from '../util.js';
import { kpi, opcoes, montarTabela, linkDocumento, ligarDocumentos, seloStatus, ehImagem } from '../ui/componentes.js';
import { montarGrafico, linhaDica } from '../ui/graficos.js';
import { COR, rotuloMes } from './inicio.js';
import { AREAS, STATUS_PROJETO } from '../dados/esquema.js';
import { lerArquivo } from '../dados/db.js';

const urls = new Map();
/** URL de imagem guardada no banco local (reaproveitada entre telas). */
async function urlImagem(doc) {
  if (!doc?.arquivo) return null;
  if (!urls.has(doc.arquivo.id)) {
    const a = await lerArquivo(doc.arquivo.id);
    if (!a) return null;
    urls.set(doc.arquivo.id, URL.createObjectURL(a.blob));
  }
  return urls.get(doc.arquivo.id);
}

const pct = v => v === null ? '—' : fmtPct(v, 0);
const barraExec = (rotulo, v, cls = '') => `<div class="barra-exec"><span>${esc(rotulo)}</span><div class="medidor ${cls}" role="img" aria-label="${esc(rotulo)} ${pct(v)}"><i style="width:${Math.min(100, (v || 0) * 100)}%"></i></div><b>${pct(v)}</b></div>`;

export async function render(main, rota) {
  const b = basePublica();
  if (rota.partes[0]) return detalhe(main, b, rota.partes[0]);

  const f = { area: rota.q.get('area') || '', status: rota.q.get('status') || '', q: rota.q.get('q') || '' };
  main.innerHTML = `
    <div class="cab-pagina"><div><div class="trilha-nav"><a href="#/">Início</a> › Projetos</div>
      <h1>Projetos e ações sociais</h1>
      <p>O que o Instituto realiza, onde, para quem, com quanto e com que resultado. Cada projeto tem página própria com metas, gastos, fotos e documentos.</p></div></div>
    <form class="filtros" id="filtros">
      <label>Área de atuação<select name="area">${opcoes(AREAS, f.area, 'Todas')}</select></label>
      <label>Situação<select name="status">${opcoes(STATUS_PROJETO, f.status, 'Todas')}</select></label>
      <label>Pesquisar<input type="search" name="q" value="${esc(f.q)}" placeholder="Nome, município, objetivo…"></label>
    </form>
    <div id="lista"></div>`;
  const form = main.querySelector('#filtros');
  const lista = main.querySelector('#lista');

  const desenhar = async () => {
    gravarFiltros(f);
    const t = norm(f.q);
    const ps = b.projetos.filter(p => (!f.area || p.area === f.area) && (!f.status || p.status === f.status) &&
      (!t || norm([p.nome, p.objetivo, p.municipios, p.local, p.area].join(' ')).includes(t)))
      .sort((a, c) => STATUS_PROJETO.indexOf(a.status) - STATUS_PROJETO.indexOf(c.status) || c.inicio.localeCompare(a.inicio));
    if (!ps.length) { lista.innerHTML = '<p class="vazio">Nenhum projeto encontrado com esses filtros.</p>'; return; }
    lista.innerHTML = `<div class="projetos">${ps.map(p => {
      const r = calc.resumoProjeto(b, p);
      return `<a class="projeto-cartao" href="#/projetos/${esc(p.id)}">
        <img class="capa" data-capa="${esc(p.id)}" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">
        <div class="corpo">
          <div class="grupo-botoes">${seloStatus(p.status)}<span class="selo neutro">${esc(p.area)}</span></div>
          <h3>${esc(p.nome)}</h3>
          <p>${esc(p.objetivo)}</p>
          <p class="pequeno mudo">${esc(calc.municipiosDe(p).join(' · '))} · ${fmtData(p.inicio)} a ${fmtData(p.fim)}</p>
          ${barraExec('Financeira', r.execFinanceira)}
          ${barraExec('Física (metas)', r.execFisica, 'fisica')}
          <p class="pequeno"><b>${fmtMoedaCurta(r.realizado)}</b> de ${fmtMoedaCurta(r.previsto)} · <b>${fmtNum(r.beneficiarios)}</b> pessoas atendidas</p>
        </div></a>`;
    }).join('')}</div>`;
    for (const p of ps) {
      const foto = b.documentos.find(d => d.projetoId === p.id && ehImagem(d));
      const url = await urlImagem(foto);
      const img = lista.querySelector(`[data-capa="${CSS.escape(p.id)}"]`);
      if (img && url) img.src = url;
    }
  };
  form.addEventListener('input', e => { if (e.target.name) { f[e.target.name] = e.target.value; desenhar(); } });
  form.addEventListener('submit', e => e.preventDefault());
  desenhar();
}

async function detalhe(main, b, id) {
  const p = b.projetos.find(x => x.id === id);
  if (!p) {
    main.innerHTML = '<div class="trilha-nav"><a href="#/">Início</a> › <a href="#/projetos">Projetos</a></div><h1>Projeto não encontrado</h1><p>Ele pode ainda não ter sido publicado. <a href="#/projetos">Ver todos os projetos</a>.</p>';
    return;
  }
  const r = calc.resumoProjeto(b, p);
  const fotos = b.documentos.filter(d => d.projetoId === p.id && ehImagem(d));
  const docs = b.documentos.filter(d => d.projetoId === p.id && !ehImagem(d));
  const contratos = b.contratos.filter(c => c.projetoId === p.id);
  const at = [...r.atendimentos].sort((a, c) => a.mes.localeCompare(c.mes));
  const porCat = calc.porChave(r.despesas, 'categoria');

  main.innerHTML = `
    <div class="trilha-nav"><a href="#/">Início</a> › <a href="#/projetos">Projetos</a> › ${esc(p.nome)}</div>
    <div class="cab-pagina"><div>
      <div class="grupo-botoes" style="margin-bottom:6px">${seloStatus(p.status)}<span class="selo neutro">${esc(p.area)}</span></div>
      <h1>${esc(p.nome)}</h1><p>${esc(p.objetivo)}</p></div>
      <div class="grupo-botoes"><a class="botao" href="#/prestacao?projeto=${esc(p.id)}">Prestação de contas do projeto</a></div>
    </div>
    <div class="kpis">
      ${kpi('Investimento previsto', fmtMoeda(r.previsto), 'Orçamento total do projeto')}
      ${kpi('Investimento realizado', fmtMoeda(r.realizado), 'Pago até agora', { medidor: r.execFinanceira ?? 0 })}
      ${kpi('Execução financeira', pct(r.execFinanceira), 'Realizado ÷ previsto')}
      ${kpi('Execução física', pct(r.execFisica), `Média de ${r.metas.length} metas, cada uma até 100%`, { medidor: r.execFisica ?? 0 })}
      ${kpi('Pessoas beneficiadas', fmtNum(r.beneficiarios), p.metaBeneficiarios ? `Meta: ${fmtNum(p.metaBeneficiarios)} (${pct(r.beneficiarios / p.metaBeneficiarios)})` : '')}
      ${kpi('Famílias atendidas', fmtNum(r.familias), `${fmtNum(r.horas)} horas de atividade`)}
    </div>
    <div class="grade">
      <section class="cartao m6"><h3>Sobre o projeto</h3>
        <p>${esc(p.descricao || '')}</p>
        <dl class="info-projeto">
          <div><dt>Local de execução</dt><dd>${esc(p.local || '—')}</dd></div>
          <div><dt>Municípios</dt><dd>${esc(r.municipios.join(', ') || '—')}</dd></div>
          <div><dt>Período</dt><dd>${fmtData(p.inicio)} a ${p.fim ? fmtData(p.fim) : 'indeterminado'}</dd></div>
          <div><dt>Responsável</dt><dd>${esc(p.responsavel || '—')}</dd></div>
          <div><dt>Recursos captados para o projeto</dt><dd>${fmtMoeda(r.recebido)}</dd></div>
          <div><dt>Comunidades alcançadas</dt><dd>${fmtNum(r.comunidades)}</dd></div>
        </dl>
        ${p.resultados ? `<h3 style="margin-top:16px">Resultados alcançados</h3><p>${esc(p.resultados)}</p>` : ''}
      </section>
      <section class="cartao m6"><h3>Metas estabelecidas</h3>
        ${r.metas.length ? r.metas.map(m => { const v = m.meta ? (m.realizado || 0) / m.meta : 0; return `<div class="meta-linha"><span>${esc(m.descricao)}</span><span><b>${fmtNum(m.realizado || 0)}</b> de ${fmtNum(m.meta)} ${esc(m.unidade)} · ${pct(v)}</span><div class="medidor fisica"><i style="width:${Math.min(100, v * 100)}%"></i></div></div>`; }).join('') : '<p class="vazio">Sem metas cadastradas.</p>'}
      </section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Pessoas atendidas por mês</h3><p>Novos beneficiários em cada mês</p></div></div><div id="g-at"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Aplicação por categoria</h3></div></div><div id="g-cat"></div></section>
    </div>
    ${fotos.length ? `<div class="secao-titulo"><h2>Fotografias</h2></div><div class="galeria" id="galeria">${fotos.map(f => `<button type="button" data-ver-doc="${esc(f.id)}"><img data-foto="${esc(f.id)}" alt="${esc(f.titulo)}" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="><span>${esc(f.titulo.split(' — ')[0])}</span></button>`).join('')}</div>` : ''}
    <div class="grade" style="margin-top:16px">
      <section class="cartao m6"><h3>Documentos comprobatórios</h3>
        ${docs.length ? `<ul class="pequeno" style="padding-left:18px;margin:0">${docs.map(d => `<li>${linkDocumento(d.id, b.documentos, d.titulo)} <span class="mudo">· ${esc(d.categoria)} · ${fmtData(d.data)}</span></li>`).join('')}</ul>` : '<p class="mudo">Nenhum documento publicado.</p>'}
      </section>
      <section class="cartao m6"><h3>Contratos e parcerias</h3>
        ${contratos.length ? `<ul class="pequeno" style="padding-left:18px;margin:0">${contratos.map(c => `<li><b>${esc(c.tipo)} ${esc(c.numero)}</b> — ${esc(b.parceiros.find(x => x.id === c.parceiroId)?.nome || '')} · ${c.valor ? fmtMoeda(c.valor) : 'sem repasse'} ${seloStatus(c.situacao)} ${linkDocumento(c.documentoId, b.documentos, 'PDF')}</li>`).join('')}</ul>` : '<p class="mudo">Nenhum instrumento vinculado.</p>'}
      </section>
    </div>
    <div class="secao-titulo"><h2>Despesas do projeto</h2></div>
    <div id="tabela"></div>`;

  ligarDocumentos(main, b.documentos);
  const cats = at.map(a => rotuloMes(a.mes, true));
  montarGrafico(main.querySelector('#g-at'), {
    tipo: 'colunas', vazio: at.length ? null : 'Sem atendimentos registrados.', categorias: cats,
    series: [{ nome: 'Pessoas', valores: at.map(a => a.pessoas), cor: COR.pessoas }], fmtEixo: fmtNumCurto,
    dica: i => `<b>${esc(cats[i])}</b>${linhaDica(COR.pessoas, 'Novas pessoas', fmtNum(at[i].pessoas))}${linhaDica(null, 'Famílias', fmtNum(at[i].familias))}${linhaDica(null, 'Horas', fmtNum(at[i].horas))}`,
    tabela: { colunas: ['Mês', 'Pessoas', 'Famílias', 'Horas'], linhas: at.map((a, i) => [cats[i], fmtNum(a.pessoas), fmtNum(a.familias), fmtNum(a.horas)]) },
  });
  montarGrafico(main.querySelector('#g-cat'), {
    tipo: 'barras', vazio: porCat.length ? null : 'Sem despesas registradas.', itens: porCat, cor: COR.despesa, fmt: fmtMoeda, fmtCurto: fmtMoedaCurta,
    dica: i => `<b>${esc(porCat[i].rotulo)}</b>${linhaDica(null, 'Pago', fmtMoeda(porCat[i].valor))}${linhaDica(null, 'Participação', fmtPct(porCat[i].valor / r.realizado))}`,
    tabela: { colunas: ['Categoria', 'Pago', '%'], linhas: porCat.map(c => [c.rotulo, fmtMoeda(c.valor), fmtPct(c.valor / r.realizado)]) },
  });
  montarTabela(main.querySelector('#tabela'), {
    linhas: r.despesas, ordem: { k: 'data', dir: 'desc' }, porPagina: 15,
    colunas: [
      { k: 'data', titulo: 'Data', tipo: 'data' },
      { k: 'fornecedor', titulo: 'Fornecedor', larg: 2, html: d => `${esc(d.fornecedor)}<span class="sub">${esc(d.documento || '')}</span>`, exportarValor: d => d.documento ? `${d.fornecedor} — ${d.documento}` : d.fornecedor },
      { k: 'descricao', titulo: 'Descrição', larg: 2.4 },
      { k: 'categoria', titulo: 'Categoria' },
      { k: 'valor', titulo: 'Valor', tipo: 'moeda' },
      { k: 'nf', titulo: 'Comprovante', semOrdem: true, valor: d => b.documentos.find(x => x.id === d.comprovanteId)?.titulo || '', html: d => linkDocumento(d.comprovanteId, b.documentos) },
    ],
    total: ls => ({ valor: ls.reduce((a, d) => a + d.valor, 0) }),
    exportar: { titulo: `Despesas — ${p.nome}`, subtitulo: p.nome },
  });
  for (const f of fotos) {
    const url = await urlImagem(f);
    const img = main.querySelector(`[data-foto="${CSS.escape(f.id)}"]`);
    if (img && url) img.src = url;
  }
}

