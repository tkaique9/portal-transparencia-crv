// Quem somos: o quadro institucional do Instituto CRV Minas (dados/institucional.js) em lâminas de diretoria —
// propósito, missão e visão, a atuação ligada aos números publicados, os valores e o resultado. Tem modo de
// apresentação (tela cheia, uma lâmina por vez, setas do teclado) para levar a uma reunião.
// Todo número vem da base publicada (basePublica) e das mesmas contas do painel e do Impacto social.

import { basePublica } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtMoedaCurta, fmtNum } from '../util.js';
import { kpi } from '../ui/componentes.js';
import { INSTITUTO, PILARES, PUBLICO, ATUACAO, VALORES } from '../dados/institucional.js';

const svg = (corpo, w = 1.9) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;

const IC_PILAR = {
  proposito: '<path d="M12 21s-7-4.4-7-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7 2.8C19 16.6 12 21 12 21z"/>',
  missao: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  visao: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
};
const IC_AREA = {
  educacao: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M22 9v5"/>',
  cultura: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  esporte: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c-2.7 2.3-4 5.1-4 8.5s1.3 6.2 4 8.5M12 3.5c2.7 2.3 4 5.1 4 8.5s-1.3 6.2-4 8.5M3.5 12h17"/>',
  'meio-ambiente': '<path d="M5 19c0-8 5-13 15-14-.5 9.5-5.5 15-14 14z"/><path d="M5 19c3-4 6-6.5 9.5-8"/>',
};
const IC_VALOR = [
  '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  '<path d="M4 19.5V5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2z"/><path d="M8 7h6M8 11h6"/>',
  '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 11l2 2 4-4"/>',
  '<path d="M7 11.5V6a2 2 0 0 1 4 0v4M11 10V4.5a2 2 0 0 1 4 0V10M15 9.5V6a2 2 0 0 1 4 0v7.5a7.5 7.5 0 0 1-15 0V11a2 2 0 0 1 3-1.7"/>',
  '<path d="M12 21s-7-4.4-7-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7 2.8C19 16.6 12 21 12 21z"/><path d="M12 11v4M10 13h4"/>',
  '<path d="M5 19c0-8 5-13 15-14-.5 9.5-5.5 15-14 14z"/><path d="M5 19c3-4 6-6.5 9.5-8"/>',
  '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><path d="M2.5 19c0-2.8 2-5 4.5-5s4.5 2.2 4.5 5M12.5 19c0-2.8 2-5 4.5-5s4.5 2.2 4.5 5"/>',
  '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="m15 5 3-2 3 2"/>',
];
const COR_ATUACAO = { educacao: 'var(--logo-royal)', cultura: 'var(--logo-ciano)', esporte: 'var(--logo-ambar)', 'meio-ambiente': 'var(--s6)' };

/** Texto do pilar com os trechos de destaque marcados (o texto vem do quadro, escapado antes de marcar). */
function comDestaques(p) {
  let t = esc(p.texto);
  for (const d of p.destaques) t = t.replace(esc(d), `<mark>${esc(d)}</mark>`);
  return t;
}

/** O propósito palavra a palavra, para entrar em sequência na abertura. */
const palavras = t => t.split(' ').map((w, i) => `<span class="pal" style="--i:${i}">${esc(w)}</span>`).join(' ');

export async function render(main) {
  const b = basePublica();
  const ind = calc.indicadores(b, null);
  const areas = new Map(calc.porArea(b, null).map(a => [a.area, a]));
  const docs = b.documentos.filter(d => d.categoria !== 'Fotografia').length;
  const lancamentos = b.receitas.length + b.despesas.length;
  const anos = b.anos.length ? `${b.anos[b.anos.length - 1]}${b.anos.length > 1 ? `–${b.anos[0]}` : ''}` : '';
  const proposito = PILARES.find(p => p.k === 'proposito');

  const dadosArea = a => {
    const ls = a.areasPortal.map(x => areas.get(x)).filter(Boolean);
    const nomes = new Set(a.areasPortal);
    return {
      projetos: b.projetos.filter(p => nomes.has(p.area) && calc.ativoNoAno(p, null)),
      pessoas: ls.reduce((s, x) => s + x.pessoas, 0), investido: ls.reduce((s, x) => s + x.investido, 0),
      horas: ls.reduce((s, x) => s + x.horas, 0),
    };
  };

  main.innerHTML = `
  <div class="inst" id="inst">
    <section class="lamina inst-abertura" data-titulo="Abertura" aria-labelledby="inst-h1">
      <div class="inst-abertura-txt">
        <img class="inst-logo" src="img/logo-instituto.webp" alt="${esc(INSTITUTO.nome)} — ${esc(INSTITUTO.lema)}" width="720" height="636">
        <div class="inst-eyebrow">Quadro institucional</div>
        <h1 id="inst-h1">${esc(INSTITUTO.nome)}</h1>
        <p class="inst-proposito" aria-label="${esc(proposito.texto)}">${palavras(proposito.texto)}</p>
        <div class="inst-acoes">
          <button type="button" class="inst-bt primario" id="inst-apresentar">${svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>')}Modo apresentação</button>
          <button type="button" class="inst-bt" id="inst-imprimir">${svg('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>')}Imprimir / PDF</button>
        </div>
      </div>
      <div class="inst-marca" aria-hidden="true"><img src="img/icone.png" alt=""><span class="anel a1"></span><span class="anel a2"></span><span class="anel a3"></span></div>
    </section>

    <section class="lamina" data-titulo="Propósito, missão e visão" aria-labelledby="inst-pilares">
      <div class="inst-cab"><div class="inst-eyebrow">Identidade</div><h2 id="inst-pilares">Por que existimos, o que fazemos e aonde vamos</h2>
        <p>Escolha um dos três para ler em destaque.</p></div>
      <div class="inst-pilares" role="group" aria-label="Propósito, missão e visão">
        ${PILARES.map((p, i) => `
        <button type="button" class="inst-pilar${i === 0 ? ' on' : ''}" aria-pressed="${i === 0}" data-pilar="${p.k}">
          <span class="ic">${svg(IC_PILAR[p.k])}</span>
          <span class="perg">${esc(p.pergunta)}</span>
          <span class="tit">${esc(p.titulo)}</span>
          <span class="txt">${comDestaques(p)}</span>
        </button>`).join('')}
      </div>
    </section>

    <section class="lamina" data-titulo="Atuação" aria-labelledby="inst-atuacao">
      <div class="inst-cab"><div class="inst-eyebrow">Atuação</div><h2 id="inst-atuacao">Onde o Instituto atua — e o que já entregou</h2>
        <p>No centro, quem é atendido. Toque numa área para ver os projetos e os números publicados neste portal${anos ? ` (${esc(anos)})` : ''}.</p></div>
      <div class="inst-atuacao">
        <div class="inst-orbita" role="group" aria-label="Áreas de atuação">
          <svg class="inst-orbita-fios" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="150"/><circle class="gira" cx="200" cy="200" r="150"/>
            ${ATUACAO.map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / ATUACAO.length; return `<line x1="200" y1="200" x2="${(200 + 150 * Math.cos(a)).toFixed(1)}" y2="${(200 + 150 * Math.sin(a)).toFixed(1)}"/>`; }).join('')}</svg>
          <div class="inst-centro"><img src="img/icone.png" alt=""><span class="r">Público</span><b>${esc(PUBLICO)}</b></div>
          ${ATUACAO.map((a, i) => { const ang = -90 + i * 360 / ATUACAO.length;
            return `<button type="button" class="inst-no${i === 0 ? ' on' : ''}" aria-pressed="${i === 0}" data-area="${a.k}" style="--ang:${ang}deg;--cor:${COR_ATUACAO[a.k]}"><span class="bolha">${svg(IC_AREA[a.k], 1.8)}</span><span class="nome">${esc(a.titulo)}</span></button>`; }).join('')}
        </div>
        <div class="inst-area" id="inst-area" aria-live="polite"></div>
      </div>
    </section>

    <section class="lamina" data-titulo="Valores" aria-labelledby="inst-valores">
      <div class="inst-cab"><div class="inst-eyebrow">Valores</div><h2 id="inst-valores">O que guia cada decisão</h2></div>
      <ol class="inst-valores">
        ${VALORES.map((v, i) => `
        <li class="inst-valor" style="--i:${i}">
          <span class="n">${String(i + 1).padStart(2, '0')}</span><span class="ic">${svg(IC_VALOR[i])}</span><span class="v">${esc(v)}</span>
          ${i === 0 ? `<a class="prova" href="#/documentos">Neste portal: <b>${fmtNum(docs)}</b> documentos e <b>${fmtNum(lancamentos)}</b> lançamentos publicados →</a>` : ''}
        </li>`).join('')}
      </ol>
    </section>

    <section class="lamina inst-fecho" data-titulo="Resultado" aria-labelledby="inst-resultado">
      <div class="inst-cab"><div class="inst-eyebrow">Do propósito ao resultado</div><h2 id="inst-resultado">O que a transformação já alcançou</h2>
        <p>Tudo o que foi publicado neste portal${anos ? `, ${esc(anos)}` : ''}. Cada número abre a tela de onde ele vem.</p></div>
      <div class="kpis inst-kpis">
        <a href="#/impacto?ano=todos">${kpi('Pessoas beneficiadas', fmtNum(ind.beneficiados), 'Atendidas pelos projetos', { destaque: true, cor: 'var(--logo-ciano)' })}</a>
        <a href="#/projetos">${kpi('Projetos', fmtNum(ind.projetosNoPeriodo), `${fmtNum(ind.projetosEmExecucao)} em execução hoje`, { cor: 'var(--logo-royal)' })}</a>
        <a href="#/impacto?ano=todos">${kpi('Municípios atendidos', fmtNum(ind.municipios), ind.listaMunicipios.join(', '), { cor: 'var(--logo-royal)' })}</a>
        <a href="#/receitas?ano=todos">${kpi('Recursos recebidos', fmtMoedaCurta(ind.recebido), fmtMoeda(ind.recebido), { cor: 'var(--logo-ambar)' })}</a>
        <a href="#/despesas?ano=todos">${kpi('Aplicados nos projetos', fmtMoedaCurta(ind.aplicado), ind.beneficiados ? `${fmtMoeda(ind.aplicado / ind.beneficiados)} por pessoa atendida` : fmtMoeda(ind.aplicado), { cor: 'var(--logo-laranja)' })}</a>
      </div>
      <p class="inst-lema">${esc(INSTITUTO.nome)} — <b>${esc(INSTITUTO.lema)}</b></p>
    </section>
  </div>
  <div class="inst-controle" id="inst-controle" hidden>
    <button type="button" data-ir="-1" aria-label="Lâmina anterior">${svg('<path d="m15 6-6 6 6 6"/>', 2.2)}</button>
    <span id="inst-pos" aria-live="polite"></span>
    <button type="button" data-ir="1" aria-label="Próxima lâmina">${svg('<path d="m9 6 6 6-6 6"/>', 2.2)}</button>
    <button type="button" data-sair aria-label="Sair da apresentação" title="Sair (Esc)">${svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.2)}</button>
  </div>`;

  const raiz = main.querySelector('#inst');
  const fim = new AbortController();
  const ouvir = { signal: fim.signal };

  // --- propósito, missão e visão: um em destaque por vez
  raiz.querySelectorAll('.inst-pilar').forEach(bt => bt.addEventListener('click', () => {
    raiz.querySelectorAll('.inst-pilar').forEach(x => { x.classList.toggle('on', x === bt); x.setAttribute('aria-pressed', x === bt); });
  }));

  // --- atuação: a área escolhida mostra os números publicados
  const painel = raiz.querySelector('#inst-area');
  const mostrarArea = k => {
    const a = ATUACAO.find(x => x.k === k);
    const d = dadosArea(a);
    const juntas = a.areasPortal.includes('Cultura e esporte');
    const lista = d.projetos.slice(0, 5).map(p => `<li><a href="#/projetos/${esc(p.id)}">${esc(p.nome)}</a><span>${esc(p.status)}</span></li>`).join('');
    painel.style.setProperty('--cor', COR_ATUACAO[k]);
    painel.innerHTML = `
      <div class="inst-area-cab"><span class="bolha">${svg(IC_AREA[k], 1.8)}</span><div><div class="inst-eyebrow">Área de atuação</div><h3>${esc(a.titulo)}</h3></div></div>
      ${d.projetos.length ? `
      <div class="inst-area-num">
        <div><b>${fmtNum(d.projetos.length)}</b><span>projeto${d.projetos.length === 1 ? '' : 's'}</span></div>
        <div><b>${fmtNum(d.pessoas)}</b><span>pessoas atendidas</span></div>
        <div><b>${fmtMoedaCurta(d.investido)}</b><span>investidos</span></div>
        <div><b>${fmtNum(d.horas)}</b><span>horas de atividade</span></div>
      </div>
      <ul class="inst-area-proj">${lista}</ul>
      ${d.projetos.length > 5 ? `<a class="mais" href="#/projetos">Ver os ${fmtNum(d.projetos.length)} projetos →</a>` : ''}
      ${juntas ? '<p class="nota">No portal, Cultura e Esporte são cadastrados numa área só (Cultura e esporte): os números das duas são os mesmos.</p>' : ''}`
      : `<p class="vazio">Ainda não há projeto publicado nesta área.</p>`}`;
  };
  raiz.querySelectorAll('.inst-no').forEach(bt => bt.addEventListener('click', () => {
    raiz.querySelectorAll('.inst-no').forEach(x => { x.classList.toggle('on', x === bt); x.setAttribute('aria-pressed', x === bt); });
    mostrarArea(bt.dataset.area);
  }));
  mostrarArea(ATUACAO[0].k);

  // --- cada lâmina entra quando aparece na tela (sem animação para quem pediu menos movimento)
  const laminas = [...raiz.querySelectorAll('.lamina')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); } }), { threshold: 0.18 });
    laminas.forEach(l => io.observe(l));
    fim.signal.addEventListener('abort', () => io.disconnect());
  } else laminas.forEach(l => l.classList.add('visivel'));

  // --- modo apresentação: tela cheia, uma lâmina por vez
  const controle = main.querySelector('#inst-controle');
  const pos = main.querySelector('#inst-pos');
  let atual = 0;
  const ir = i => {
    atual = Math.max(0, Math.min(laminas.length - 1, i));
    laminas[atual].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    pos.textContent = `${atual + 1} / ${laminas.length} · ${laminas[atual].dataset.titulo}`;
  };
  const apresentando = () => document.documentElement.classList.contains('apresentando');
  const entrar = () => {
    document.documentElement.classList.add('apresentando');
    controle.hidden = false;
    document.documentElement.requestFullscreen?.().catch(() => {});
    ir(0);
  };
  const sair = () => {
    document.documentElement.classList.remove('apresentando');
    controle.hidden = true;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  main.querySelector('#inst-apresentar').addEventListener('click', entrar);
  main.querySelector('#inst-imprimir').addEventListener('click', () => window.print());
  controle.addEventListener('click', e => {
    const bt = e.target.closest('button');
    if (!bt) return;
    if (bt.hasAttribute('data-sair')) sair(); else ir(atual + Number(bt.dataset.ir));
  });
  document.addEventListener('keydown', e => {
    if (!apresentando()) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); ir(atual + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); ir(atual - 1); }
    else if (e.key === 'Home') { e.preventDefault(); ir(0); }
    else if (e.key === 'End') { e.preventDefault(); ir(laminas.length - 1); }
    else if (e.key === 'Escape') sair();
  }, ouvir);
  // Esc do próprio navegador sai da tela cheia: sai do modo junto
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && apresentando()) sair(); }, ouvir);
  // outra tela: nada desta fica ouvindo, e o modo de apresentação não vaza para ela
  window.addEventListener('hashchange', () => { sair(); fim.abort(); }, { once: true });
}
