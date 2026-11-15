// Projetos e ações sociais: catálogo e página de cada projeto.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtMoedaCurta, fmtNum, fmtNumCurto, fmtPct, fmtData, norm } from '../util.js';
import { kpi, opcoes, montarTabela, linkDocumento, ligarDocumentos, seloStatus, ehImagem, COR_AREA, carrossel, ligarCarrosseis, abrirGaleria, carrosselIr } from '../ui/componentes.js';
import { montarGrafico, linhaDica } from '../ui/graficos.js';
import { COR, rotuloMes } from './inicio.js';
import { AREAS, STATUS_PROJETO } from '../dados/esquema.js';

const pct = v => v === null || v === undefined ? '—' : fmtPct(v, 0);
const barraExec = (rotulo, v, cls = '') => `<div class="barra-exec"><span>${esc(rotulo)}</span><div class="medidor ${cls}" role="img" aria-label="${esc(rotulo)} ${pct(v)}"><i style="width:${Math.min(100, (v || 0) * 100)}%"></i></div><b>${pct(v)}</b></div>`;
const ICONE_LOCAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
const ICONE_DATA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
const fotosDe = (b, p) => b.documentos.filter(d => d.projetoId === p.id && ehImagem(d));

export async function render(main, rota) {
  const b = basePublica();
  if (rota.partes[0]) return detalhe(main, b, rota.partes[0]);

  const f = { area: rota.q.get('area') || '', status: rota.q.get('status') || '', q: rota.q.get('q') || '' };
  main.innerHTML = `
    <div class="cab-pagina"><div>
      <h1>Projetos e ações sociais</h1>
      <p>O que o Instituto realiza, onde, para quem, com quanto e com que resultado. Clique nas fotos para ampliar e no nome para ver o projeto completo.</p></div></div>
    <div id="resumo"></div>
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
      .sort((a, c) => STATUS_PROJETO.indexOf(a.status) - STATUS_PROJETO.indexOf(c.status) || c.orcamento - a.orcamento);
    const rs = new Map(ps.map(p => [p.id, calc.resumoProjeto(b, p)]));
    const previsto = ps.reduce((a, p) => a + (p.orcamento || 0), 0);
    const realizado = [...rs.values()].reduce((a, r) => a + r.realizado, 0);
    const pessoas = [...rs.values()].reduce((a, r) => a + r.beneficiarios, 0);
    const metaPessoas = ps.reduce((a, p) => a + (p.metaBeneficiarios || 0), 0);
    const fis = [...rs.values()].map(r => r.execFisica).filter(v => v !== null);
    main.querySelector('#resumo').innerHTML = `<div class="kpis">
      ${kpi('Projetos', fmtNum(ps.length), `${ps.filter(p => p.status === 'Em execução').length} em execução · ${ps.filter(p => p.status === 'Concluído').length} concluídos`, { cor: 'var(--leaf)' })}
      ${kpi('Investimento previsto', fmtMoedaCurta(previsto), `${fmtMoedaCurta(realizado)} já aplicados`, { cor: 'var(--s2)', medidor: previsto ? realizado / previsto : 0 })}
      ${kpi('Execução financeira', pct(previsto ? realizado / previsto : null), 'Aplicado ÷ previsto, todos os projetos', { cor: 'var(--s2)' })}
      ${kpi('Execução física média', pct(fis.length ? fis.reduce((a, x) => a + x, 0) / fis.length : null), 'Média das metas, cada uma até 100%', { cor: 'var(--s3)' })}
      ${kpi('Pessoas atendidas', fmtNum(pessoas), metaPessoas ? `${pct(pessoas / metaPessoas)} da meta de ${fmtNum(metaPessoas)}` : '', { cor: 'var(--s7)', medidor: metaPessoas ? pessoas / metaPessoas : 0 })}
    </div>`;
    if (!ps.length) { lista.innerHTML = '<p class="vazio">Nenhum projeto encontrado com esses filtros.</p>'; return; }
    lista.innerHTML = `<div class="projetos">${ps.map(p => {
      const r = rs.get(p.id);
      const cor = COR_AREA[p.area] || 'var(--leaf)';
      const alcance = p.metaBeneficiarios ? r.beneficiarios / p.metaBeneficiarios : null;
      return `<article class="projeto-cartao" style="--area:${cor}">
        ${carrossel(fotosDe(b, p), { selos: `${seloStatus(p.status)}<span class="selo area">${esc(p.area)}</span>` })}
        <div class="projeto-corpo">
          <h3><a href="#/projetos/${esc(p.id)}">${esc(p.nome)}</a></h3>
          <p class="obj">${esc(p.objetivo)}</p>
          <div class="onde"><span>${ICONE_LOCAL}${esc(r.municipios.join(' · '))}</span><span>${ICONE_DATA}${fmtData(p.inicio)} a ${fmtData(p.fim)}</span></div>
          <div class="numeros">
            <div><b>${fmtMoedaCurta(r.realizado)}</b><span>de ${fmtMoedaCurta(r.previsto)} previstos</span></div>
            <div><b>${fmtNum(r.beneficiarios)}</b><span>pessoas${p.metaBeneficiarios ? ` · meta ${fmtNumCurto(p.metaBeneficiarios)}` : ''}</span></div>
            <div><b>${fmtNum(r.municipios.length)}</b><span>municípios</span></div>
          </div>
          ${barraExec('Exec. financeira', r.execFinanceira)}
          ${barraExec('Exec. física (metas)', r.execFisica, 'fisica')}
          ${alcance !== null ? barraExec('Meta de pessoas', alcance, 'pessoas') : ''}
          <div class="projeto-pe"><span class="mudo">${fmtNum(r.metas.length)} metas · ${fmtNum(r.horas)} h de atividade</span><a href="#/projetos/${esc(p.id)}">Ver projeto →</a></div>
        </div></article>`;
    }).join('')}</div>`;
    await ligarCarrosseis(lista, b.documentos);
  };
  form.addEventListener('input', e => { if (e.target.name) { f[e.target.name] = e.target.value; desenhar(); } });
  form.addEventListener('submit', e => e.preventDefault());
  desenhar();
}

async function detalhe(main, b, id) {
  const p = b.projetos.find(x => x.id === id);
  if (!p) {
    main.innerHTML = '<div class="trilha-nav"><a href="#/projetos">Projetos</a></div><h1>Projeto não encontrado</h1><p>Ele pode ainda não ter sido publicado. <a href="#/projetos">Ver todos os projetos</a>.</p>';
    return;
  }
  const r = calc.resumoProjeto(b, p);
  const fotos = fotosDe(b, p);
  const docs = b.documentos.filter(d => d.projetoId === p.id && !ehImagem(d));
  const contratos = b.contratos.filter(c => c.projetoId === p.id);
  const at = [...r.atendimentos].sort((a, c) => a.mes.localeCompare(c.mes));
  const porCat = calc.porChave(r.despesas, 'categoria');
  const cor = COR_AREA[p.area] || 'var(--leaf)';
  const alcance = p.metaBeneficiarios ? r.beneficiarios / p.metaBeneficiarios : null;

  main.innerHTML = `
    <div class="trilha-nav"><a href="#/projetos">Projetos</a> › ${esc(p.nome)}</div>
    <div class="cab-pagina"><div>
      <div class="grupo-botoes" style="margin-bottom:6px">${seloStatus(p.status)}<span class="selo" style="background:${cor};color:#fff">${esc(p.area)}</span></div>
      <h1>${esc(p.nome)}</h1><p>${esc(p.objetivo)}</p></div>
      <div class="grupo-botoes"><a class="botao" href="#/prestacao?projeto=${esc(p.id)}">Prestação de contas do projeto</a></div>
    </div>
    <div class="vitrine">
      <div>
        ${carrossel(fotos, { vazio: 'Ainda não há fotos publicadas deste projeto' })}
        ${fotos.length > 1 ? `<div class="miniaturas">${fotos.map((f, i) => `<button type="button" data-mini="${i}"${i ? '' : ' class="on"'} aria-label="${esc(f.titulo.split(' — ')[0])}"><img data-foto="${esc(f.id)}" alt=""></button>`).join('')}</div>` : ''}
        ${fotos.length ? `<p class="legenda-foto" id="legenda-foto">${esc(fotos[0].titulo.split(' — ')[0])} · clique na foto para ampliar</p>` : ''}
      </div>
      <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr));margin:0;align-content:start">
        ${kpi('Investimento realizado', fmtMoedaCurta(r.realizado), `de ${fmtMoeda(r.previsto)} previstos`, { cor: 'var(--s2)', medidor: r.execFinanceira ?? 0 })}
        ${kpi('Execução financeira', pct(r.execFinanceira), 'Realizado ÷ previsto', { cor: 'var(--s2)' })}
        ${kpi('Execução física', pct(r.execFisica), `Média de ${r.metas.length} metas, cada uma até 100%`, { cor: 'var(--s3)', medidor: r.execFisica ?? 0 })}
        ${kpi('Pessoas beneficiadas', fmtNum(r.beneficiarios), alcance !== null ? `${pct(alcance)} da meta de ${fmtNum(p.metaBeneficiarios)}` : '', { cor: 'var(--s7)', medidor: alcance ?? 0 })}
        ${kpi('Famílias atendidas', fmtNum(r.familias), `${fmtNum(r.comunidades)} comunidades alcançadas`, { cor: 'var(--s7)' })}
        ${kpi('Horas de atividade', fmtNum(r.horas), `Recursos captados: ${fmtMoedaCurta(r.recebido)}`, { cor: 'var(--leaf)' })}
      </div>
    </div>
    <div class="grade">
      <section class="cartao m6"><div class="cartao-cab"><h3>Sobre o projeto</h3></div>
        <p>${esc(p.descricao || '')}</p>
        <dl class="info-projeto">
          <div><dt>Local de execução</dt><dd>${esc(p.local || '—')}</dd></div>
          <div><dt>Municípios</dt><dd>${esc(r.municipios.join(', ') || '—')}</dd></div>
          <div><dt>Período</dt><dd>${fmtData(p.inicio)} a ${p.fim ? fmtData(p.fim) : 'indeterminado'}</dd></div>
          <div><dt>Responsável</dt><dd>${esc(p.responsavel || '—')}</dd></div>
        </dl>
        ${p.resultados ? `<h3 style="margin-top:16px">Resultados alcançados</h3><p>${esc(p.resultados)}</p>` : ''}
      </section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Metas: previsto × realizado</h3><p>A linha vertical marca 100% da meta</p></div></div><div id="g-metas"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Pessoas atendidas por mês</h3><p>Novos beneficiários em cada mês</p></div><div class="total"><b>${fmtNum(r.beneficiarios)}</b><span>no total</span></div></div><div id="g-at"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Aplicação por categoria</h3><p>Onde o recurso do projeto foi gasto</p></div><div class="total"><b>${fmtMoedaCurta(r.realizado)}</b><span>aplicado</span></div></div><div id="g-cat"></div></section>
    </div>
    <div class="grade">
      <section class="cartao m6"><div class="cartao-cab"><h3>Documentos comprobatórios</h3></div>
        ${docs.length ? `<ul class="pequeno" style="padding-left:18px;margin:0">${docs.map(d => `<li>${linkDocumento(d.id, b.documentos, d.titulo)} <span class="mudo">· ${esc(d.categoria)} · ${fmtData(d.data)}</span></li>`).join('')}</ul>` : '<p class="mudo">Nenhum documento publicado.</p>'}
      </section>
      <section class="cartao m6"><div class="cartao-cab"><h3>Contratos e parcerias</h3></div>
        ${contratos.length ? `<ul class="pequeno" style="padding-left:18px;margin:0">${contratos.map(c => `<li><b>${esc(c.tipo)} ${esc(c.numero)}</b> — ${esc(b.parceiros.find(x => x.id === c.parceiroId)?.nome || '')} · ${c.valor ? fmtMoeda(c.valor) : 'sem repasse'} ${seloStatus(c.situacao)} ${linkDocumento(c.documentoId, b.documentos, 'PDF')}</li>`).join('')}</ul>` : '<p class="mudo">Nenhum instrumento vinculado.</p>'}
      </section>
    </div>
    <div class="secao-titulo"><h2>Despesas do projeto</h2></div>
    <div id="tabela"></div>`;

  ligarDocumentos(main, b.documentos);
  await ligarCarrosseis(main, b.documentos);
  // miniaturas comandam o carrossel principal; a legenda acompanha a foto
  const car = main.querySelector('.vitrine [data-carrossel]');
  main.querySelectorAll('[data-mini]').forEach(btn => btn.onclick = () => carrosselIr(car, Number(btn.dataset.mini)));
  car?.addEventListener('foto', e => {
    main.querySelectorAll('[data-mini]').forEach((btn, j) => btn.classList.toggle('on', j === e.detail));
    const leg = main.querySelector('#legenda-foto');
    if (leg) leg.textContent = `${fotos[e.detail].titulo.split(' — ')[0]} · clique na foto para ampliar`;
  });

  const itensMetas = r.metas.filter(m => m.meta > 0).map(m => ({ rotulo: `${m.descricao} (${m.unidade})`, meta: m.meta, realizado: m.realizado || 0 }));
  montarGrafico(main.querySelector('#g-metas'), {
    tipo: 'metas', vazio: itensMetas.length ? null : 'Sem metas cadastradas.', itens: itensMetas, cor: COR.pessoas, fmt: fmtNum,
    legenda: [{ nome: 'Realizado', cor: COR.pessoas }, { nome: 'Meta (100%)', forma: 'trilha' }],
    dica: i => `<b>${esc(itensMetas[i].rotulo)}</b>${linhaDica(COR.pessoas, 'Realizado', fmtNum(itensMetas[i].realizado))}${linhaDica(null, 'Meta', fmtNum(itensMetas[i].meta))}`,
    tabela: { colunas: ['Meta', 'Previsto', 'Realizado', '%'], linhas: itensMetas.map(m => [m.rotulo, fmtNum(m.meta), fmtNum(m.realizado), fmtPct(m.realizado / m.meta)]) },
  });
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
}
