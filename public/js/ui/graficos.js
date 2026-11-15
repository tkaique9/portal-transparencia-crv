// Gráficos em SVG desenhados à mão (sem biblioteca externa).
//
// Regras seguidas em todos: um eixo só; cor de série pela ordem fixa da
// paleta (--s1, --s2…), nunca pelo ranking; marcas finas com ponta
// arredondada ancorada na base; texto sempre na cor de texto, não da série;
// legenda quando há 2+ séries; dica ao passar o mouse com alvo maior que a
// marca; e todo gráfico tem a mesma informação em tabela ("Ver tabela").

import { esc } from '../util.js';

const NS = 'http://www.w3.org/2000/svg';

// ------------------------------------------------------------ dica

const dica = () => document.getElementById('dica');
export function mostrarDica(html, x, y) {
  const d = dica();
  d.innerHTML = html;
  d.hidden = false;
  const r = d.getBoundingClientRect();
  let left = x + 14, top = y + 14;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > innerHeight - 8) top = y - r.height - 14;
  d.style.left = Math.max(8, left) + 'px';
  d.style.top = Math.max(8, top) + 'px';
}
export const esconderDica = () => { dica().hidden = true; };

const linhaDica = (cor, nome, valor) => `<div class="linha-dica"><span>${cor ? `<i style="background:${cor}"></i>` : ''}${esc(nome)}</span><strong>${esc(valor)}</strong></div>`;

// ------------------------------------------------------------ escala

/** Marcas "redondas" do eixo: 0, 250 mil, 500 mil… */
function ticks(max, alvo = 5) {
  if (max <= 0) return [0, 1];
  const passo0 = max / alvo;
  const mag = 10 ** Math.floor(Math.log10(passo0));
  const passo = [1, 2, 2.5, 5, 10].map(m => m * mag).find(p => p >= passo0);
  const t = [];
  for (let v = 0; v <= max + passo * 0.001; v += passo) t.push(v);
  if (t[t.length - 1] < max) t.push(t[t.length - 1] + passo);
  return t;
}

/** Barra com as duas pontas de cima arredondadas e a base reta (ancorada no zero). */
function barraV(x, y, w, h, raio = 4) {
  if (h <= 0) return '';
  const r = Math.min(raio, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
function barraH(x, y, w, h, raio = 4) {
  if (w <= 0) return '';
  const r = Math.min(raio, h / 2, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

// ------------------------------------------------------------ montagem

/**
 * Monta um gráfico num elemento e redesenha quando a largura muda.
 * spec: { tipo, ...dados, tabela: {colunas, linhas} }
 */
export function montarGrafico(el, spec) {
  const area = document.createElement('div');
  area.className = 'grafico';
  el.replaceChildren();
  if (spec.legenda?.length) {
    const ul = document.createElement('ul');
    ul.className = 'legenda';
    ul.innerHTML = spec.legenda.map(l => `<li><i class="${l.forma || ''}" style="${l.cor ? `background:${l.cor}` : ''}"></i>${esc(l.nome)}</li>`).join('');
    el.appendChild(ul);
  }
  el.appendChild(area);

  const desenhar = () => {
    const w = Math.max(280, Math.floor(area.clientWidth || el.clientWidth || 600));
    const svg = TIPOS[spec.tipo](w, spec);
    area.innerHTML = svg;
    ligarAlvos(area, spec);
  };
  if (spec.vazio) { area.innerHTML = `<p class="vazio">${esc(spec.vazio)}</p>`; }
  else {
    desenhar();
    let ultimo = area.clientWidth;
    const ro = new ResizeObserver(() => { if (Math.abs(area.clientWidth - ultimo) > 4) { ultimo = area.clientWidth; desenhar(); } });
    ro.observe(area);
  }

  if (spec.tabela) {
    const botao = document.createElement('button');
    botao.className = 'ver-tabela';
    botao.type = 'button';
    botao.textContent = 'Ver como tabela';
    botao.setAttribute('aria-expanded', 'false');
    const caixa = document.createElement('div');
    caixa.hidden = true;
    caixa.className = 'tabela-envolve';
    caixa.innerHTML = `<table><thead><tr>${spec.tabela.colunas.map((c, i) => `<th${i ? ' class="num"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${spec.tabela.linhas.map(l => `<tr>${l.map((v, i) => `<td${i ? ' class="num"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    botao.onclick = () => { caixa.hidden = !caixa.hidden; botao.textContent = caixa.hidden ? 'Ver como tabela' : 'Ocultar tabela'; botao.setAttribute('aria-expanded', String(!caixa.hidden)); };
    el.append(botao, caixa);
  }
}

function ligarAlvos(area, spec) {
  const svg = area.querySelector('svg');
  if (!svg) return;
  const alvos = [...svg.querySelectorAll('.alvo')];
  const ativar = (alvo, x, y) => {
    alvos.forEach(a => a.classList.toggle('foco', a === alvo));
    const i = Number(alvo.dataset.i);
    mostrarDica(spec.dica(i), x, y);
    if (spec.tipo === 'linha') {
      const cx = alvo.dataset.cx;
      svg.querySelector('.cruz')?.setAttribute('x1', cx);
      svg.querySelector('.cruz')?.setAttribute('x2', cx);
      svg.querySelector('.cruz')?.removeAttribute('visibility');
      svg.querySelectorAll('.ponto').forEach(p => p.setAttribute('visibility', p.dataset.i === String(i) ? 'visible' : 'hidden'));
    }
  };
  const limpar = () => {
    alvos.forEach(a => a.classList.remove('foco'));
    esconderDica();
    svg.querySelector('.cruz')?.setAttribute('visibility', 'hidden');
    svg.querySelectorAll('.ponto').forEach(p => p.setAttribute('visibility', 'hidden'));
  };
  for (const a of alvos) {
    a.addEventListener('pointermove', e => ativar(a, e.clientX, e.clientY));
    a.addEventListener('pointerleave', limpar);
    a.addEventListener('focus', () => { const r = a.getBoundingClientRect(); ativar(a, r.left + r.width / 2, r.top); });
    a.addEventListener('blur', limpar);
    if (spec.aoClicar) { a.style.cursor = 'pointer'; a.addEventListener('click', () => spec.aoClicar(Number(a.dataset.i))); a.addEventListener('keydown', e => { if (e.key === 'Enter') spec.aoClicar(Number(a.dataset.i)); }); }
  }
}

// ------------------------------------------------------------ tipos

/**
 * Colunas agrupadas: categorias × séries (até 3 séries lado a lado).
 * spec: { categorias, series: [{nome, valores, cor}], fmtEixo, fmt }
 */
function colunas(W, spec) {
  const H = spec.altura || 260;
  const m = { t: 12, r: 8, b: 28, l: 64 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const max = Math.max(0, ...spec.series.flatMap(s => s.valores));
  const t = ticks(max);
  const topo = t[t.length - 1];
  const y = v => m.t + ph - (v / topo) * ph;
  const n = spec.categorias.length;
  const banda = pw / n;
  const ns = spec.series.length;
  const gap = 2;
  const bw = Math.max(2, Math.min(28, (banda * 0.72 - gap * (ns - 1)) / ns));
  const grupo = bw * ns + gap * (ns - 1);
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.titulo || '')}">`;
  for (const v of t) s += `<line class="grade-linha" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${esc(spec.fmtEixo(v))}</text>`;
  const pular = Math.ceil(n / Math.floor(pw / 46));
  spec.categorias.forEach((c, i) => {
    const x0 = m.l + banda * i + (banda - grupo) / 2;
    spec.series.forEach((se, j) => {
      const v = se.valores[i] || 0;
      s += `<path d="${barraV(x0 + j * (bw + gap), y(v), bw, m.t + ph - y(v))}" fill="${se.cor}"/>`;
    });
    if (i % pular === 0) s += `<text x="${m.l + banda * i + banda / 2}" y="${H - 8}" text-anchor="middle">${esc(c)}</text>`;
    s += `<rect class="alvo" data-i="${i}" tabindex="0" x="${m.l + banda * i}" y="${m.t}" width="${banda}" height="${ph}" fill="transparent"/>`;
  });
  s += `<line class="eixo-linha" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/></svg>`;
  return s;
}

/**
 * Linhas no tempo, com cruz e pontos ao passar o mouse.
 * spec: { categorias, series: [{nome, valores, cor}], fmtEixo, area? }
 */
function linha(W, spec) {
  const H = spec.altura || 240;
  const m = { t: 14, r: 12, b: 28, l: 64 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const max = Math.max(0, ...spec.series.flatMap(s => s.valores));
  const t = ticks(max);
  const topo = t[t.length - 1];
  const n = spec.categorias.length;
  const x = i => m.l + (n <= 1 ? pw / 2 : (pw * i) / (n - 1));
  const y = v => m.t + ph - (v / topo) * ph;
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.titulo || '')}">`;
  for (const v of t) s += `<line class="grade-linha" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${esc(spec.fmtEixo(v))}</text>`;
  s += `<line class="eixo-linha" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/>`;
  const pular = Math.ceil(n / Math.floor(pw / 54));
  spec.categorias.forEach((c, i) => { if (i % pular === 0) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(c)}</text>`; });
  spec.series.forEach(se => {
    const pts = se.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    if (spec.area && spec.series.length === 1) s += `<polygon points="${m.l},${m.t + ph} ${pts} ${x(n - 1)},${m.t + ph}" fill="${se.cor}" fill-opacity=".12"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="${se.cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    // valor final rotulado (rótulo seletivo, não em todo ponto)
    const ult = se.valores[n - 1];
    if (spec.rotularFim && n) s += `<text class="rotulo-valor" x="${x(n - 1) - 4}" y="${y(ult) - 8}" text-anchor="end">${esc(spec.fmtEixo(ult))}</text>`;
  });
  s += `<line class="cruz" x1="0" x2="0" y1="${m.t}" y2="${m.t + ph}" stroke="var(--linha-forte)" stroke-dasharray="3 3" visibility="hidden"/>`;
  spec.series.forEach(se => se.valores.forEach((v, i) => { s += `<circle class="ponto marca-ativa" data-i="${i}" cx="${x(i)}" cy="${y(v)}" r="4.5" fill="${se.cor}" visibility="hidden"/>`; }));
  const larg = n <= 1 ? pw : pw / (n - 1);
  spec.categorias.forEach((_, i) => { s += `<rect class="alvo" data-i="${i}" data-cx="${x(i)}" tabindex="0" x="${x(i) - larg / 2}" y="${m.t}" width="${larg}" height="${ph}" fill="transparent"/>`; });
  return s + '</svg>';
}

/**
 * Barras horizontais ordenadas (ranking / distribuição). Uma série só,
 * cor única: o tamanho é o dado, a cor não carrega informação.
 * spec: { itens: [{rotulo, valor}], cor, fmt }
 */
function barras(W, spec) {
  const itens = spec.itens;
  const alt = 30;
  const m = { t: 4, r: 8, b: 4 };
  const rotW = Math.min(W * 0.42, 260);
  const valW = 96;
  const H = m.t + m.b + itens.length * alt;
  const pw = W - rotW - valW - m.r;
  const max = Math.max(1, ...itens.map(i => i.valor));
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.titulo || '')}">`;
  const corte = (t, w) => { const c = Math.floor(w / 6.4); return t.length > c ? t.slice(0, c - 1) + '…' : t; };
  itens.forEach((it, i) => {
    const y = m.t + i * alt;
    s += `<text x="${rotW - 10}" y="${y + alt / 2 + 4}" text-anchor="end" style="fill:var(--tinta-2)">${esc(corte(it.rotulo, rotW - 12))}</text>`;
    s += `<rect x="${rotW}" y="${y + 8}" width="${pw}" height="${alt - 16}" rx="4" fill="var(--trilha)" opacity=".55"/>`;
    s += `<path d="${barraH(rotW, y + 8, (it.valor / max) * pw, alt - 16)}" fill="${it.cor || spec.cor}"/>`;
    s += `<text class="rotulo-valor" x="${rotW + pw + 8}" y="${y + alt / 2 + 4}">${esc(spec.fmtCurto ? spec.fmtCurto(it.valor) : spec.fmt(it.valor))}</text>`;
    s += `<rect class="alvo" data-i="${i}" tabindex="0" x="0" y="${y}" width="${W}" height="${alt}" fill="transparent"/>`;
  });
  return s + '</svg>';
}

/**
 * Meta × realizado: trilha = meta (100%), barra = realizado. Passar da meta
 * estende a barra além da trilha, limitado a 130% para não esmagar o resto.
 * spec: { itens: [{rotulo, meta, realizado}], fmt }
 */
function metas(W, spec) {
  const itens = spec.itens;
  const alt = 46;
  const m = { t: 4, r: 8 };
  const H = m.t + itens.length * alt + 4;
  const pw = W - m.r - 64;
  const escala = pw / 1.3;
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.titulo || '')}">`;
  itens.forEach((it, i) => {
    const y = m.t + i * alt;
    const pct = it.meta > 0 ? it.realizado / it.meta : 0;
    s += `<text x="0" y="${y + 14}" style="fill:var(--tinta-2)">${esc(it.rotulo)}</text>`;
    s += `<rect x="0" y="${y + 22}" width="${escala}" height="12" rx="4" fill="var(--trilha)"/>`;
    s += `<path d="${barraH(0, y + 24, Math.min(1.3, pct) * escala, 8, 3)}" fill="${spec.cor}"/>`;
    s += `<line x1="${escala}" x2="${escala}" y1="${y + 18}" y2="${y + 38}" stroke="var(--tinta-2)" stroke-width="2"/>`;
    s += `<text class="rotulo-valor" x="${Math.max(escala, Math.min(1.3, pct) * escala) + 8}" y="${y + 33}">${esc((pct * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 }))}%</text>`;
    s += `<rect class="alvo" data-i="${i}" tabindex="0" x="0" y="${y}" width="${W}" height="${alt}" fill="transparent"/>`;
  });
  return s + '</svg>';
}

const TIPOS = { colunas, linha, barras, metas };

// ------------------------------------------------------------ atalhos

/** Agrupa a cauda em "Outros" — nunca mais itens que cabem com leitura. */
export function topN(itens, n = 8) {
  if (itens.length <= n) return itens;
  const cabeca = itens.slice(0, n - 1);
  const resto = itens.slice(n - 1);
  return [...cabeca, { rotulo: `Outros (${resto.length})`, valor: resto.reduce((a, x) => a + x.valor, 0), outros: true }];
}

export { linhaDica };
