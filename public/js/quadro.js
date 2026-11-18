// Pôster A4 do quadro institucional (quadro.html): uma página para imprimir ou salvar em PDF, montada com o
// texto de dados/institucional.js — muda o quadro, muda o pôster. Não lê a base do portal: o pôster vai para
// fora (mural, reunião, e-mail) e não leva números, só o quadro. Com ?imprimir=1 abre a impressão sozinho.

import { INSTITUTO, PILARES, PUBLICO, ATUACAO, VALORES } from './dados/institucional.js';
import { IC_PILAR, IC_AREA, IC_VALOR } from './ui/icones-institucional.js';
import { esc } from './util.js';

const svg = (corpo, w = 1.9) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;
// as cores da logo, uma por área (as mesmas da órbita da página Quem somos)
const COR = { educacao: '#0051BF', cultura: '#26BAF2', esporte: '#FFAF02', 'meio-ambiente': '#1BAF7A' };

/** Texto com os trechos de destaque em cor (o texto é escapado antes de marcar). */
function marca(texto, destaques) {
  let t = esc(texto);
  for (const d of destaques) t = t.replace(esc(d), `<span class="k">${esc(d)}</span>`);
  return t;
}

/** A órbita da atuação: anéis, raios e um rastro de cometa saindo de cada área. */
function orbita() {
  const R = 78, C = 100, n = ATUACAO.length;
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = a => [C + R * Math.cos(a), C + R * Math.sin(a)].map(v => v.toFixed(1));
  const grads = ATUACAO.map((a, i) => {
    const [x1, y1] = pt(ang(i) + 0.28), [x2, y2] = pt(ang(i) + 1.23);
    return `<linearGradient id="cometa${i}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${COR[a.k]}" stop-opacity="0"/><stop offset="1" stop-color="${COR[a.k]}"/></linearGradient>`;
  }).join('');
  const raios = ATUACAO.map((_, i) => { const [x, y] = pt(ang(i)); return `<line x1="${C}" y1="${C}" x2="${x}" y2="${y}" class="raio"/>`; }).join('');
  const rastros = ATUACAO.map((a, i) => {
    const [x0, y0] = pt(ang(i) + 0.28), [x1, y1] = pt(ang(i) + 1.23);
    return `<path d="M${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1}" stroke="url(#cometa${i})" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="2.6" fill="${COR[a.k]}"/>`;
  }).join('');
  const fios = `<svg class="orb-fios" viewBox="0 0 200 200" aria-hidden="true"><defs>${grads}
    <radialGradient id="halo"><stop offset="0" stop-color="#26BAF2" stop-opacity=".22"/><stop offset="1" stop-color="#26BAF2" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${C}" cy="${C}" r="96" fill="url(#halo)"/><circle cx="${C}" cy="${C}" r="${R}" class="anel"/><circle cx="${C}" cy="${C}" r="${R + 12}" class="anel2"/>
    <circle cx="${C}" cy="${C}" r="${R - 20}" class="anel3"/>${raios}${rastros}</svg>`;
  const nos = ATUACAO.map((a, i) => { const [x, y] = pt(ang(i));
    return `<div class="no" style="left:${(x / 2).toFixed(2)}%;top:${(y / 2).toFixed(2)}%;--cor:${COR[a.k]}"><span class="b">${svg(IC_AREA[a.k], 1.8)}</span><span class="nm">${esc(a.titulo)}</span></div>`; }).join('');
  return `<div class="orb">${fios}<div class="centro"><img src="img/icone.png" alt=""><small>Público</small><b>${esc(PUBLICO)}</b></div>${nos}</div>`;
}

const [lema1, ...lema2] = INSTITUTO.lema.split(' ');

document.querySelector('#quadro').innerHTML = `
<div class="pag">
<header class="topo">
  <div class="cab"><img class="logo" src="img/logo-instituto.webp" alt="${esc(INSTITUTO.nome)}">
    <div class="t">Quadro institucional<b>${esc(INSTITUTO.nome)}</b></div></div>
  <div class="prop">
    <h1>${esc(lema1)} <span class="k">${esc(lema2.join(' '))}</span></h1>
    <p class="sub">Projetos <b>educacionais, culturais, esportivos e de qualificação profissional</b> para <b>${esc(PUBLICO.toLowerCase())}</b>.</p></div>
  <div class="simb" aria-hidden="true"><svg viewBox="0 0 100 100">
      <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#26BAF2"/><stop offset="1" stop-color="#26BAF2" stop-opacity="0"/></linearGradient>
        <linearGradient id="g2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFAF02"/><stop offset="1" stop-color="#FFAF02" stop-opacity="0"/></linearGradient></defs>
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(38,186,242,.28)" stroke-width=".5"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,175,2,.4)" stroke-width=".5" stroke-dasharray="1.6 2.4"/>
      <circle cx="50" cy="50" r="29" fill="none" stroke="rgba(255,255,255,.18)" stroke-width=".4"/>
      <path d="M50 2 A48 48 0 0 1 95.6 35" fill="none" stroke="url(#g1)" stroke-width="1.8" stroke-linecap="round"/><circle cx="95.6" cy="35" r="1.6" fill="#7CD6FB"/>
      <path d="M17 76 A38 38 0 0 1 12.5 44" fill="none" stroke="url(#g2)" stroke-width="1.5" stroke-linecap="round"/><circle cx="12.5" cy="44" r="1.3" fill="#FFC233"/></svg>
    <img src="img/icone.png" alt=""></div>
</header>
<section class="pilares">${PILARES.map((p, i) => `
  <article class="pilar p${i}">
    <span class="num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
    <div class="pt"><span class="ic">${svg(IC_PILAR[p.k])}</span><span class="perg">${esc(p.pergunta)}</span></div>
    <h3>${esc(p.titulo)}</h3>
    <p>${marca(p.texto, p.destaques)}</p>
    <span class="barra"></span>
  </article>`).join('')}</section>
<section class="meio">
  <div class="atu"><div class="sec">Atuação</div><h2>Quem atendemos e onde atuamos</h2>${orbita()}</div>
  <div><div class="sec">Valores</div><h2>O que guia cada decisão</h2><ol class="valores">${VALORES.map((v, i) =>
    `<li><span class="vn">${String(i + 1).padStart(2, '0')}</span><span class="vi">${svg(IC_VALOR[i])}</span><span class="vt">${esc(v)}</span></li>`).join('')}</ol></div>
</section>
<footer class="pe">
  <div class="lema"><b>${esc(INSTITUTO.nome.replace(/ CRV Minas$/, '').toUpperCase())} <i>CRV MINAS</i></b><span>Quadro institucional · Propósito, missão, visão, atuação e valores</span></div>
  <div class="qr"><img class="q" src="img/qr-institucional.svg" alt="QR Code da página Quem somos do Portal de Transparência"><p><b>Acompanhe no Portal de Transparência</b><br>Projetos, recursos, resultados e documentos, abertos a todos.</p></div>
</footer>
</div>`;

// imprimir só depois das fontes e das imagens: antes disso a folha sai com a letra do sistema e sem a logo
if (new URLSearchParams(location.search).has('imprimir')) {
  const imagens = [...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })).filter(Boolean);
  Promise.all([document.fonts.ready, ...imagens]).then(() => setTimeout(() => window.print(), 250));
}
