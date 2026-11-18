// Quem somos: o quadro institucional do Instituto CRV Minas (dados/institucional.js) em lâminas de diretoria —
// abertura, propósito/missão/visão, atuação ligada aos números publicados, a transformação no tempo, as fotos
// dos projetos, os valores e o resultado. Tem modo de apresentação (tela cheia, uma lâmina por vez, setas do
// teclado) para levar a uma reunião. Todo número vem da base publicada (basePublica) e das mesmas contas do
// painel e do Impacto social; os números contam do zero quando a lâmina aparece (menos movimento: não contam).

import { basePublica } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtMoedaCurta, fmtNum } from '../util.js';
import { kpi, ehImagem, urlImagem } from '../ui/componentes.js';
import { rotuloMes } from './inicio.js';
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
const SETA = svg('<path d="m6 9 6 6 6-6"/>', 2.2);

/** Número que conta do zero quando a lâmina aparece; o texto inicial já é o valor final (impressão, sem JS). */
const FMT = { num: fmtNum, moeda: fmtMoedaCurta };
const contar = (v, tipo = 'num') => `<span class="conta" data-conta="${Number(v) || 0}" data-tipo="${tipo}">${esc(FMT[tipo](v))}</span>`;

/** A frase do pilar palavra a palavra (entram em sequência no palco); as dos trechos de destaque ganham só cor. */
function frase(p) {
  const marcadas = new Set();
  for (const d of p.destaques) {
    const ini = p.texto.indexOf(d);
    if (ini >= 0) for (let c = ini; c < ini + d.length; c++) marcadas.add(c);
  }
  let pos = 0;
  return p.texto.split(' ').map((w, i) => {
    const k = marcadas.has(pos);
    pos += w.length + 1;
    return `<span class="pal${k ? ' k' : ''}" style="--i:${i}">${esc(w)}</span>`;
  }).join(' ');
}
const pilarNum = i => String(i + 1).padStart(2, '0');

/** O propósito palavra a palavra (entram em sequência); as dos destaques levam o degradê da logo. */
function proposito(p) {
  const destaque = new Set(p.destaques.flatMap(d => d.toLowerCase().split(' ')));
  return p.texto.split(' ').map((w, i) => {
    const limpa = w.toLowerCase().replace(/[.,]/g, '');
    return `<span class="pal${destaque.has(limpa) ? ' grad' : ''}" style="--i:${i}">${esc(w)}</span>`;
  }).join(' ');
}

/** A curva de pessoas atendidas, acumulado mês a mês: área e linha num SVG que se desenha. */
function curva(serie) {
  const ys = serie.pessoasAcumuladas;
  if (ys.length < 2 || !ys[ys.length - 1]) return '';
  const W = 1000, H = 300, top = Math.max(...ys);
  const pt = (v, i) => [(i / (ys.length - 1)) * W, H - (v / top) * (H - 24) - 4];
  const pts = ys.map(pt);
  const linha = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [xf, yf] = pts[pts.length - 1];
  const marcas = [0.25, 0.5, 0.75].map(f => `<line x1="0" x2="${W}" y1="${(H - f * (H - 24) - 4).toFixed(1)}" y2="${(H - f * (H - 24) - 4).toFixed(1)}"/>`).join('');
  return `<svg class="inst-curva" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Pessoas atendidas, acumulado: de ${fmtNum(ys[0])} a ${fmtNum(top)}">
    <defs><linearGradient id="inst-g-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26BAF2" stop-opacity=".45"/><stop offset="1" stop-color="#26BAF2" stop-opacity="0"/></linearGradient>
      <linearGradient id="inst-g-linha" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4FB3F0"/><stop offset=".7" stop-color="#26BAF2"/><stop offset="1" stop-color="#FFAF02"/></linearGradient></defs>
    <g class="grade-c">${marcas}</g>
    <path class="area" d="${linha} L${W},${H} L0,${H} Z" fill="url(#inst-g-area)"/>
    <path class="linha" d="${linha}" pathLength="1" stroke="url(#inst-g-linha)"/>
    <circle class="ponto" cx="${xf.toFixed(1)}" cy="${yf.toFixed(1)}" r="7"/></svg>`;
}

export async function render(main) {
  const b = basePublica();
  const ind = calc.indicadores(b, null);
  const areas = new Map(calc.porArea(b, null).map(a => [a.area, a]));
  const serie = calc.serieMensal(b, null);
  const docs = b.documentos.filter(d => d.categoria !== 'Fotografia').length;
  const lancamentos = b.receitas.length + b.despesas.length;
  const anos = b.anos.length ? `${b.anos[b.anos.length - 1]}${b.anos.length > 1 ? `–${b.anos[0]}` : ''}` : '';
  const prop = PILARES.find(p => p.k === 'proposito');
  const projetos = new Map(b.projetos.map(p => [p.id, p]));
  const fotos = b.documentos.filter(d => ehImagem(d) && projetos.has(d.projetoId)).slice(0, 16);

  const dadosArea = a => {
    const ls = a.areasPortal.map(x => areas.get(x)).filter(Boolean);
    const nomes = new Set(a.areasPortal);
    return {
      projetos: b.projetos.filter(p => nomes.has(p.area) && calc.ativoNoAno(p, null)),
      pessoas: ls.reduce((s, x) => s + x.pessoas, 0), investido: ls.reduce((s, x) => s + x.investido, 0),
      horas: ls.reduce((s, x) => s + x.horas, 0),
    };
  };
  // a bolha de cada área cresce com as pessoas atendidas (entre 56 e 84 px)
  const pessoasArea = ATUACAO.map(a => dadosArea(a).pessoas);
  const maxP = Math.max(1, ...pessoasArea);
  const tam = i => Math.round(56 + 28 * Math.sqrt(pessoasArea[i] / maxP));

  const ys = serie.pessoasAcumuladas;
  const meio = Math.floor(ys.length / 2);
  const tile = (f, i) => {
    const p = projetos.get(f.projetoId);
    return `<a class="inst-foto" href="#/projetos/${esc(p.id)}" tabindex="${i < fotos.length ? 0 : -1}"${i < fotos.length ? '' : ' aria-hidden="true"'}>
      <img data-foto="${esc(f.id)}" alt="${esc(f.titulo.split(' — ')[0])}" loading="lazy"><span class="leg"><b>${esc(p.nome)}</b><span>${esc(p.area)}</span></span></a>`;
  };
  const metade = Math.ceil(fotos.length / 2);
  const fileiras = [fotos.slice(0, metade), fotos.slice(metade)].filter(f => f.length);

  main.innerHTML = `
  <div class="inst" id="inst">
    <section class="lamina escura inst-abertura" data-titulo="Abertura" aria-labelledby="inst-h1">
      <div class="aurora" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>
      <div class="inst-abertura-txt">
        <img class="inst-logo" src="img/logo-instituto.webp" alt="${esc(INSTITUTO.nome)} — ${esc(INSTITUTO.lema)}" width="720" height="636">
        <div class="inst-eyebrow">Quadro institucional · ${esc(INSTITUTO.lema)}</div>
        <h1 id="inst-h1" class="sr">${esc(INSTITUTO.nome)}</h1>
        <p class="inst-proposito" aria-label="${esc(prop.texto)}">${proposito(prop)}</p>
        <div class="inst-acoes">
          <button type="button" class="inst-bt primario" id="inst-apresentar">${svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>')}Modo apresentação</button>
          <button type="button" class="inst-bt" id="inst-imprimir">${svg('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>')}Imprimir / PDF</button>
        </div>
      </div>
      <div class="inst-marca" aria-hidden="true"><img src="img/icone.png" alt=""><span class="anel a1"></span><span class="anel a2"></span><span class="anel a3"></span></div>
      <div class="inst-placar">
        <div><b>${contar(ind.beneficiados)}</b><span>vidas alcançadas pelos projetos</span></div>
        <div><b>${contar(ind.projetosNoPeriodo)}</b><span>projetos publicados</span></div>
        <div><b>${contar(ind.municipios)}</b><span>municípios atendidos</span></div>
        <div><b>${contar(ind.aplicado, 'moeda')}</b><span>aplicados nos projetos${anos ? ` · ${esc(anos)}` : ''}</span></div>
      </div>
      <button type="button" class="inst-descer" data-ir-para="1" aria-label="Ir para a próxima lâmina">Conheça o Instituto ${SETA}</button>
    </section>

    <section class="lamina" data-titulo="Propósito, missão e visão" aria-labelledby="inst-pilares">
      <div class="inst-cab"><div class="inst-eyebrow">Identidade</div><h2 id="inst-pilares">Por que existimos, o que fazemos e aonde vamos</h2>
        <p>Escolha um dos três para ler em destaque.</p></div>
      <div class="inst-pilares">
        <div class="inst-pil-lista" role="tablist" aria-label="Propósito, missão e visão" aria-orientation="vertical">
          ${PILARES.map((p, i) => `
          <button type="button" role="tab" class="inst-pil-aba${i === 0 ? ' on' : ''}" id="inst-aba-${p.k}" aria-selected="${i === 0}" aria-controls="inst-palco" tabindex="${i === 0 ? 0 : -1}" data-pilar="${p.k}">
            <span class="n">${pilarNum(i)}</span>
            <span class="t"><b>${esc(p.titulo)}</b><small>${esc(p.pergunta)}</small></span>
            <span class="ic">${svg(IC_PILAR[p.k])}</span>
            <span class="tempo" aria-hidden="true"><i></i></span>
          </button>`).join('')}
        </div>
        <div class="inst-palco" id="inst-palco" role="tabpanel" aria-live="polite"></div>
      </div>
    </section>

    <section class="lamina" data-titulo="Atuação" aria-labelledby="inst-atuacao">
      <div class="inst-cab"><div class="inst-eyebrow">Atuação</div><h2 id="inst-atuacao">Onde o Instituto atua — e o que já entregou</h2>
        <p>No centro, quem é atendido; cada área cresce com as pessoas que alcançou. Toque numa área para ver os projetos e os números publicados${anos ? ` (${esc(anos)})` : ''}.</p></div>
      <div class="inst-atuacao">
        <div class="inst-orbita" role="group" aria-label="Áreas de atuação">
          <svg class="inst-orbita-fios" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="150"/><circle class="gira" cx="200" cy="200" r="150"/>
            ${ATUACAO.map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / ATUACAO.length; const x = (200 + 150 * Math.cos(a)).toFixed(1), y = (200 + 150 * Math.sin(a)).toFixed(1);
              return `<line x1="200" y1="200" x2="${x}" y2="${y}"/><line class="pulso" style="--d:${i * 0.55}s" x1="200" y1="200" x2="${x}" y2="${y}" pathLength="100"/>`; }).join('')}</svg>
          <div class="inst-centro"><img src="img/icone.png" alt=""><span class="r">Público</span><b>${esc(PUBLICO)}</b></div>
          ${ATUACAO.map((a, i) => { const ang = -90 + i * 360 / ATUACAO.length;
            return `<button type="button" class="inst-no${i === 0 ? ' on' : ''}" aria-pressed="${i === 0}" data-area="${a.k}" style="--ang:${ang}deg;--cor:${COR_ATUACAO[a.k]};--tam:${tam(i)}px"><span class="bolha">${svg(IC_AREA[a.k], 1.8)}</span><span class="nome">${esc(a.titulo)}</span></button>`; }).join('')}
        </div>
        <div class="inst-area" id="inst-area" aria-live="polite"></div>
      </div>
    </section>

    ${ys.length > 1 && ys[ys.length - 1] ? `
    <section class="lamina escura inst-tempo" data-titulo="A transformação no tempo" aria-labelledby="inst-tempo">
      <div class="inst-cab"><div class="inst-eyebrow">A transformação no tempo</div><h2 id="inst-tempo">Mês a mês, mais vidas alcançadas</h2>
        <p>Pessoas atendidas pelos projetos, somadas desde o primeiro mês publicado.</p></div>
      <div class="inst-tempo-corpo">
        <div class="inst-tempo-num"><b>${contar(ys[ys.length - 1])}</b><span>pessoas até ${esc(rotuloMes(serie.chaves[serie.chaves.length - 1], true))}</span>
          <div class="marcos"><div><b>${fmtNum(ys[meio])}</b><span>em ${esc(rotuloMes(serie.chaves[meio], true))}</span></div><div><b>${fmtNum(ys[0])}</b><span>em ${esc(rotuloMes(serie.chaves[0], true))}</span></div></div></div>
        <div class="inst-tempo-graf">${curva(serie)}
          <div class="eixo"><span>${esc(rotuloMes(serie.chaves[0], true))}</span><span>${esc(rotuloMes(serie.chaves[meio], true))}</span><span>${esc(rotuloMes(serie.chaves[serie.chaves.length - 1], true))}</span></div></div>
      </div>
    </section>` : ''}

    ${fotos.length ? `
    <section class="lamina inst-mosaico" data-titulo="Quem é transformado" aria-labelledby="inst-fotos">
      <div class="inst-cab"><div class="inst-eyebrow">${esc(INSTITUTO.lema)}</div><h2 id="inst-fotos">Quem é transformado</h2>
        <p>Fotos publicadas dos projetos. Cada uma abre o projeto de onde veio.</p></div>
      <div class="inst-fileiras">
        ${fileiras.map((f, j) => `<div class="inst-fileira${j ? ' volta' : ''}"><div class="trilho">${[...f, ...f].map((x, i) => tile(x, i < f.length ? 0 : fotos.length)).join('')}</div></div>`).join('')}
      </div>
    </section>` : ''}

    <section class="lamina escura" data-titulo="Valores" aria-labelledby="inst-valores">
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
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- fotos dos projetos (vêm do banco local)
  for (const img of raiz.querySelectorAll('img[data-foto]')) {
    const d = fotos.find(f => f.id === img.dataset.foto);
    urlImagem(d).then(u => { if (u) img.src = u; });
  }

  // --- números que contam do zero quando a lâmina aparece
  const animarContas = lamina => {
    if (calmo) return;
    for (const el of lamina.querySelectorAll('.conta')) {
      const alvo = Number(el.dataset.conta), f = FMT[el.dataset.tipo], t0 = performance.now(), dur = 1500;
      const passo = t => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
        el.textContent = f(k < 1 ? (el.dataset.tipo === 'num' ? Math.round(alvo * e) : alvo * e) : alvo);
        if (k < 1 && !fim.signal.aborted) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    }
  };

  // --- propósito, missão e visão: a aba escolhida sobe ao palco (setas trocam entre as três)
  const abas = [...raiz.querySelectorAll('.inst-pil-aba')];
  const palco = raiz.querySelector('#inst-palco');
  const mostrarPilar = (k, foco = false) => {
    const i = PILARES.findIndex(p => p.k === k), p = PILARES[i];
    abas.forEach(a => { const on = a.dataset.pilar === k; a.classList.toggle('on', on); a.setAttribute('aria-selected', on); a.tabIndex = on ? 0 : -1; if (on && foco) a.focus(); });
    palco.setAttribute('aria-labelledby', `inst-aba-${k}`);
    palco.innerHTML = `
      <span class="brilho" aria-hidden="true"></span>
      <span class="fundo-n" aria-hidden="true">${pilarNum(i)}</span>
      <div class="topo"><span class="ic">${svg(IC_PILAR[k])}</span><span class="perg">${esc(p.pergunta)}</span></div>
      <h3>${esc(p.titulo)}</h3>
      <p class="frase">${frase(p)}</p>
      <div class="passos" aria-hidden="true">${PILARES.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>`;
    palco.classList.remove('troca'); void palco.offsetWidth; palco.classList.add('troca');
  };
  // passeio pelos três enquanto ninguém escolhe um: a barra da aba ativa enche e o palco passa para o próximo
  const caixa = raiz.querySelector('.inst-pilares');
  const CICLO = 7000;
  let rodaPilar = null;
  const pararPilares = () => { clearInterval(rodaPilar); rodaPilar = null; caixa.classList.remove('rodando'); };
  const rodarPilares = () => {
    if (calmo || rodaPilar || caixa.dataset.escolheu) return;
    caixa.style.setProperty('--inst-ciclo', `${CICLO}ms`);
    caixa.classList.add('rodando');
    rodaPilar = setInterval(() => {
      if (document.hidden) return;
      const i = abas.findIndex(a => a.classList.contains('on'));
      mostrarPilar(abas[(i + 1) % abas.length].dataset.pilar);
      // reinicia a barra da nova aba
      caixa.classList.remove('rodando'); void caixa.offsetWidth; caixa.classList.add('rodando');
    }, CICLO);
  };
  fim.signal.addEventListener('abort', pararPilares);
  // o palco inclina na direção do mouse
  if (!calmo) {
    palco.addEventListener('pointermove', e => {
      const r = palco.getBoundingClientRect();
      palco.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - .5) * 7}deg`);
      palco.style.setProperty('--rx', `${(.5 - (e.clientY - r.top) / r.height) * 6}deg`);
    });
    palco.addEventListener('pointerleave', () => { palco.style.setProperty('--rx', '0deg'); palco.style.setProperty('--ry', '0deg'); });
  }
  abas.forEach((a, i) => {
    a.addEventListener('click', () => { caixa.dataset.escolheu = '1'; pararPilares(); mostrarPilar(a.dataset.pilar); });
    a.addEventListener('keydown', e => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d || document.documentElement.classList.contains('apresentando')) return;
      e.preventDefault(); e.stopPropagation();
      caixa.dataset.escolheu = '1'; pararPilares();
      mostrarPilar(abas[(i + d + abas.length) % abas.length].dataset.pilar, true);
    });
  });
  mostrarPilar(PILARES[0].k);

  // --- atuação: a área escolhida mostra os números publicados
  const painel = raiz.querySelector('#inst-area');
  const nos = [...raiz.querySelectorAll('.inst-no')];
  const mostrarArea = k => {
    const a = ATUACAO.find(x => x.k === k);
    const d = dadosArea(a);
    const juntas = a.areasPortal.includes('Cultura e esporte');
    const lista = d.projetos.slice(0, 5).map(p => `<li><a href="#/projetos/${esc(p.id)}">${esc(p.nome)}</a><span>${esc(p.status)}</span></li>`).join('');
    nos.forEach(x => { x.classList.toggle('on', x.dataset.area === k); x.setAttribute('aria-pressed', x.dataset.area === k); });
    painel.style.setProperty('--cor', COR_ATUACAO[k]);
    painel.classList.remove('troca'); void painel.offsetWidth; painel.classList.add('troca');
    painel.innerHTML = `
      <div class="inst-area-cab"><span class="bolha">${svg(IC_AREA[k], 1.8)}</span><div><div class="inst-eyebrow">Área de atuação</div><h3>${esc(a.titulo)}</h3></div></div>
      ${d.projetos.length ? `
      <div class="inst-area-num">
        <div><b>${contar(d.projetos.length)}</b><span>projeto${d.projetos.length === 1 ? '' : 's'}</span></div>
        <div><b>${contar(d.pessoas)}</b><span>pessoas atendidas</span></div>
        <div><b>${contar(d.investido, 'moeda')}</b><span>investidos</span></div>
        <div><b>${contar(d.horas)}</b><span>horas de atividade</span></div>
      </div>
      <ul class="inst-area-proj">${lista}</ul>
      ${d.projetos.length > 5 ? `<a class="mais" href="#/projetos">Ver os ${fmtNum(d.projetos.length)} projetos →</a>` : ''}
      ${juntas ? '<p class="nota">No portal, Cultura e Esporte são cadastrados numa área só (Cultura e esporte): os números das duas são os mesmos.</p>' : ''}`
      : `<p class="vazio">Ainda não há projeto publicado nesta área.</p>`}`;
    animarContas(painel);
  };
  // passeio automático pelas áreas enquanto a lâmina está na tela e ninguém escolheu uma
  let passeio = null, escolheu = false;
  const pararPasseio = () => { clearInterval(passeio); passeio = null; };
  nos.forEach(bt => bt.addEventListener('click', () => { escolheu = true; pararPasseio(); mostrarArea(bt.dataset.area); }));
  mostrarArea(ATUACAO[0].k);
  const orbita = raiz.querySelector('.inst-orbita');
  orbita.addEventListener('pointerenter', pararPasseio);
  orbita.addEventListener('focusin', pararPasseio);
  const comecarPasseio = () => {
    if (calmo || escolheu || passeio) return;
    passeio = setInterval(() => {
      if (document.hidden) return;
      const i = nos.findIndex(x => x.classList.contains('on'));
      mostrarArea(nos[(i + 1) % nos.length].dataset.area);
    }, 4200);
  };
  fim.signal.addEventListener('abort', pararPasseio);

  // --- cada lâmina entra quando aparece na tela
  const laminas = [...raiz.querySelectorAll('.lamina')];
  const lamAtuacao = orbita.closest('.lamina');
  const lamPilares = caixa.closest('.lamina');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.target === lamAtuacao) { if (e.isIntersecting) comecarPasseio(); else pararPasseio(); }
      if (e.target === lamPilares) { if (e.isIntersecting) rodarPilares(); else pararPilares(); }
      if (e.isIntersecting && !e.target.classList.contains('visivel')) { e.target.classList.add('visivel'); animarContas(e.target); }
    }), { threshold: 0.2 });
    laminas.forEach(l => io.observe(l));
    fim.signal.addEventListener('abort', () => io.disconnect());
  } else laminas.forEach(l => l.classList.add('visivel'));

  // --- modo apresentação: tela cheia, uma lâmina por vez
  const controle = main.querySelector('#inst-controle');
  const pos = main.querySelector('#inst-pos');
  let atual = 0;
  const ir = i => {
    atual = Math.max(0, Math.min(laminas.length - 1, i));
    laminas[atual].scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
    pos.textContent = `${atual + 1} / ${laminas.length} · ${laminas[atual].dataset.titulo}`;
  };
  raiz.querySelector('.inst-descer').addEventListener('click', () => ir(1));
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
