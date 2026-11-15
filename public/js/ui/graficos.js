// Gráficos em SVG desenhados à mão (sem biblioteca externa).
//
// Padrão gerencial: todo gráfico mostra o número em cima da marca (rótulo
// de dado) — quem lê não precisa passar o mouse para saber quanto é. Barras
// de distribuição mostram valor e % do total. Regras de leitura mantidas:
// um eixo só; cor de série pela ordem fixa da paleta (--s1, --s2…), nunca
// pelo ranking; marcas finas com ponta arredondada ancorada na base; texto na
// cor de texto, não da série; legenda quando há 2+ séries; dica ao passar o
// mouse com alvo maior que a marca; e a mesma informação em tabela.

import { esc } from '../util.js';

const NS = 'http://www.w3.org/2000/svg';
const LARG_CHAR = 6.1; // largura média de um caractere a 11px, para caber rótulos

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
function ticks(max, alvo = 4) {
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

const pctTxt = v => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: v < 0.1 ? 1 : 0 }) + '%';

// ------------------------------------------------------------ montagem

/**
 * Monta um gráfico num elemento e redesenha quando a largura muda.
 * spec: { tipo, ...dados, legenda?, tabela?: {colunas, linhas}, dica(i) }
 */
export function montarGrafico(el, spec) {
  const area = document.createElement('div');
  area.className = 'grafico';
  el.replaceChildren();
  if (spec.legenda?.length) {
    const ul = document.createElement('ul');
    ul.className = 'legenda';
    ul.innerHTML = spec.legenda.map(l => `<li><i class="${l.forma || ''}" style="${l.cor ? `background:${l.cor}` : ''}"></i>${esc(l.nome)}${l.valor ? ` <b>${esc(l.valor)}</b>` : ''}</li>`).join('');
    el.appendChild(ul);
  }
  el.appendChild(area);

  const desenhar = () => {
    const w = Math.max(280, Math.floor(area.clientWidth || el.clientWidth || 600));
    area.innerHTML = TIPOS[spec.tipo](w, spec);
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
    if (spec.dica) mostrarDica(spec.dica(i), x, y);
    if (spec.tipo === 'linha') {
      const cx = alvo.dataset.cx;
      const cruz = svg.querySelector('.cruz');
      cruz?.setAttribute('x1', cx); cruz?.setAttribute('x2', cx); cruz?.removeAttribute('visibility');
      svg.querySelectorAll('.ponto-ativo').forEach(p => p.setAttribute('visibility', p.dataset.i === String(i) ? 'visible' : 'hidden'));
    }
  };
  const limpar = () => {
    alvos.forEach(a => a.classList.remove('foco'));
    esconderDica();
    svg.querySelector('.cruz')?.setAttribute('visibility', 'hidden');
    svg.querySelectorAll('.ponto-ativo').forEach(p => p.setAttribute('visibility', 'hidden'));
  };
  for (const a of alvos) {
    a.addEventListener('pointermove', e => ativar(a, e.clientX, e.clientY));
    a.addEventListener('pointerleave', limpar);
    a.addEventListener('focus', () => { const r = a.getBoundingClientRect(); ativar(a, r.left + r.width / 2, r.top); });
    a.addEventListener('blur', limpar);
    if (spec.aoClicar) { a.style.cursor = 'pointer'; a.addEventListener('click', () => spec.aoClicar(Number(a.dataset.i))); a.addEventListener('keydown', e => { if (e.key === 'Enter') spec.aoClicar(Number(a.dataset.i)); }); }
  }
}

// ------------------------------------------------------------ colunas

/**
 * Colunas (uma ou mais séries lado a lado), com o valor em cima de cada
 * coluna. Se o rótulo não cabe deitado na largura da coluna, ele é girado
 * na vertical; se nem assim (coluna fina demais), fica só na dica e na tabela.
 * spec: { categorias, series: [{nome, valores, cor}], fmtEixo, fmtRotulo?,
 *         rotulos?: true, rotuloGrupo?(i): texto em destaque sobre o grupo }
 */
function colunas(W, spec) {
  const H = spec.altura || 280;
  const fmtR = spec.fmtRotulo || spec.fmtEixo;
  const rotular = spec.rotulos !== false && !spec.rotuloGrupo;
  const m = { t: 10, r: 8, b: 28, l: 58 };
  const pw = W - m.l - m.r;
  const n = spec.categorias.length;
  const ns = spec.series.length;
  const banda = pw / n;
  const gap = 2;
  const bw = Math.max(2, Math.min(34, (banda * 0.74 - gap * (ns - 1)) / ns));
  const grupo = bw * ns + gap * (ns - 1);
  const max = Math.max(0, ...spec.series.flatMap(s => s.valores));
  const maiorRotulo = Math.max(0, ...spec.series.flatMap(s => s.valores.map(v => fmtR(v).length))) * LARG_CHAR;
  const deitado = maiorRotulo <= bw + 10;
  const girado = rotular && !deitado && bw >= 10;
  const folga = !rotular && !spec.rotuloGrupo ? 0 : girado ? maiorRotulo + 8 : 18;
  const ph = H - m.t - m.b;
  // reserva espaço acima da maior coluna para o rótulo não sair do gráfico
  const t = ticks(ph > folga ? max * ph / (ph - folga) : max);
  const topo = t[t.length - 1];
  const y = v => m.t + ph - (v / topo) * ph;
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.titulo || '')}">`;
  for (const v of t) s += `<line class="grade-linha" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="eixo" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${esc(spec.fmtEixo(v))}</text>`;
  const pular = Math.ceil(n / Math.max(1, Math.floor(pw / 46)));
  spec.categorias.forEach((c, i) => {
    const x0 = m.l + banda * i + (banda - grupo) / 2;
    spec.series.forEach((se, j) => {
      const v = se.valores[i] || 0;
      const x = x0 + j * (bw + gap);
      s += `<path d="${barraV(x, y(v), bw, m.t + ph - y(v))}" fill="${se.cor}"/>`;
      if (rotular && v > 0) {
        const cx = x + bw / 2;
        if (deitado) s += `<text class="rotulo-valor" x="${cx}" y="${y(v) - 5}" text-anchor="middle">${esc(fmtR(v))}</text>`;
        else if (girado) s += `<text class="rotulo-valor" transform="translate(${cx + 3.5},${y(v) - 5}) rotate(-90)">${esc(fmtR(v))}</text>`;
      }
    });
    if (spec.rotuloGrupo) {
      const txt = spec.rotuloGrupo(i);
      const alto = Math.max(...spec.series.map(se => se.valores[i] || 0));
      if (txt) s += `<text class="rotulo-grupo" x="${m.l + banda * i + banda / 2}" y="${y(alto) - 6}" text-anchor="middle">${esc(txt)}</text>`;
    }
    // nome da categoria cortado na largura da coluna (o nome inteiro está na dica e na tabela)
    const cabe = Math.max(3, Math.floor((banda * pular - 4) / 5.8));
    if (i % pular === 0) s += `<text class="eixo" x="${m.l + banda * i + banda / 2}" y="${H - 9}" text-anchor="middle">${esc(c.length > cabe ? c.slice(0, cabe - 1) + '…' : c)}</text>`;
    s += `<rect class="alvo" data-i="${i}" tabindex="0" x="${m.l + banda * i}" y="${m.t}" width="${banda}" height="${ph}" fill="transparent"/>`;
  });
  s += `<line class="eixo-linha" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/></svg>`;
  return s;
}

// ------------------------------------------------------------ linha

/**
 * Linhas no tempo. Com até 13 pontos, cada ponto leva o rótulo do valor; com
 * mais, só início, máximo e fim (rótulo em todo ponto vira borrão).
 * spec: { categorias, series: [{nome, valores, cor}], fmtEixo, fmtRotulo?, area? }
 */
function linha(W, spec) {
  const H = spec.altura || 250;
  const fmtR = spec.fmtRotulo || spec.fmtEixo;
  const m = { t: 22, r: 18, b: 28, l: 58 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const max = Math.max(0, ...spec.series.flatMap(s => s.valores));
  const t = ticks(max * 1.08);
  const topo = t[t.length - 1];
  const n = spec.categorias.length;
  const x = i => m.l + (n <= 1 ? pw / 2 : (pw * i) / (n - 1));
  const y = v => m.t + ph - (v / topo) * ph;
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.titulo || '')}">`;
  for (const v of t) s += `<line class="grade-linha" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="eixo" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${esc(spec.fmtEixo(v))}</text>`;
  s += `<line class="eixo-linha" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/>`;
  const pular = Math.ceil(n / Math.max(1, Math.floor(pw / 54)));
  spec.categorias.forEach((c, i) => { if (i % pular === 0) s += `<text class="eixo" x="${x(i)}" y="${H - 9}" text-anchor="middle">${esc(c)}</text>`; });
  const espaco = n > 1 ? pw / (n - 1) : pw;
  spec.series.forEach(se => {
    const pts = se.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    if (spec.area && spec.series.length === 1) s += `<polygon points="${m.l},${m.t + ph} ${pts} ${x(n - 1)},${m.t + ph}" fill="${se.cor}" fill-opacity=".10"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="${se.cor}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>`;
    // quais pontos ganham rótulo: todos se couberem, senão início, máximo e fim
    const maiorRotulo = Math.max(...se.valores.map(v => fmtR(v).length)) * LARG_CHAR;
    const iMax = se.valores.indexOf(Math.max(...se.valores));
    // série que só sobe (acumulado) desloca cada rótulo para cima do anterior: cabe mais apertado
    const subindo = se.valores.every((v, i) => !i || v >= se.valores[i - 1]);
    const todos = n <= 13 && espaco >= maiorRotulo * (subindo ? 0.62 : 0.92);
    const marcados = todos ? se.valores.map((_, i) => i) : [...new Set([0, iMax, n - 1])];
    for (const i of marcados) {
      const v = se.valores[i];
      const ancora = i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle';
      s += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${se.cor}" class="marca-ativa"/>`;
      s += `<text class="rotulo-valor${i === n - 1 ? ' forte' : ''}" x="${x(i) + (ancora === 'start' ? -2 : ancora === 'end' ? 2 : 0)}" y="${y(v) - 9}" text-anchor="${ancora}">${esc(fmtR(v))}</text>`;
    }
  });
  s += `<line class="cruz" x1="0" x2="0" y1="${m.t}" y2="${m.t + ph}" stroke="var(--linha-forte)" stroke-dasharray="3 3" visibility="hidden"/>`;
  spec.series.forEach(se => se.valores.forEach((v, i) => { s += `<circle class="ponto-ativo marca-ativa" data-i="${i}" cx="${x(i)}" cy="${y(v)}" r="5" fill="${se.cor}" visibility="hidden"/>`; }));
  spec.categorias.forEach((_, i) => { s += `<rect class="alvo" data-i="${i}" data-cx="${x(i)}" tabindex="0" x="${x(i) - espaco / 2}" y="${m.t}" width="${espaco}" height="${ph}" fill="transparent"/>`; });
  return s + '</svg>';
}

// ------------------------------------------------------------ barras

/**
 * Barras horizontais ordenadas (ranking / distribuição): valor e % do total
 * ao lado de cada barra. Uma série só, cor única — o tamanho é o dado.
 * spec: { itens: [{rotulo, valor}], cor, fmt, fmtCurto?, total? (base do %) }
 */
function barras(W, spec) {
  const itens = spec.itens;
  const alt = 34;
  const m = { t: 2, r: 4, b: 2 };
  const estreito = W < 460;
  const rotW = Math.min(W * (estreito ? 0.36 : 0.34), 250);
  const total = spec.total ?? itens.reduce((a, x) => a + x.valor, 0);
  const fmtV = spec.fmtCurto || spec.fmt;
  const valW = Math.max(...itens.map(it => (fmtV(it.valor) + ' · 100%').length)) * LARG_CHAR + 10;
  const H = m.t + m.b + itens.length * alt;
  const pw = Math.max(40, W - rotW - valW - m.r);
  const max = Math.max(1, ...itens.map(i => i.valor));
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.titulo || '')}">`;
  const corte = (t, w) => { const c = Math.floor(w / LARG_CHAR); return t.length > c ? t.slice(0, c - 1) + '…' : t; };
  itens.forEach((it, i) => {
    const yb = m.t + i * alt;
    const w = (it.valor / max) * pw;
    s += `<text class="rotulo-cat" x="${rotW - 10}" y="${yb + alt / 2 + 4}" text-anchor="end">${esc(corte(it.rotulo, rotW - 12))}</text>`;
    s += `<rect x="${rotW}" y="${yb + 9}" width="${pw}" height="${alt - 18}" rx="4" fill="var(--trilha)" opacity=".5"/>`;
    s += `<path d="${barraH(rotW, yb + 9, w, alt - 18)}" fill="${it.cor || spec.cor}"/>`;
    s += `<text x="${rotW + w + 8}" y="${yb + alt / 2 + 4}"><tspan class="rotulo-valor">${esc(fmtV(it.valor))}</tspan>${total > 0 ? `<tspan class="rotulo-pct" dx="6">${esc(pctTxt(it.valor / total))}</tspan>` : ''}</text>`;
    s += `<rect class="alvo" data-i="${i}" tabindex="0" x="0" y="${yb}" width="${W}" height="${alt}" fill="transparent"/>`;
  });
  return s + '</svg>';
}

// ------------------------------------------------------------ metas

/**
 * Meta × realizado: trilha = meta (100%), barra = realizado, com
 * "realizado / meta · %" à direita. Passar da meta estende a barra além da
 * trilha, limitado a 130% para não esmagar o resto.
 * spec: { itens: [{rotulo, meta, realizado, unidade?}], cor, fmt? }
 */
function metas(W, spec) {
  const itens = spec.itens;
  const alt = 50;
  const fmt = spec.fmt || (v => v.toLocaleString('pt-BR'));
  const txtW = Math.min(170, Math.max(...itens.map(it => `${fmt(it.realizado)} / ${fmt(it.meta)}`.length)) * LARG_CHAR + 54);
  const H = itens.length * alt + 4;
  const pw = W - txtW - 8;
  const escala = pw / 1.3;
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.titulo || '')}">`;
  itens.forEach((it, i) => {
    const y = i * alt + 2;
    const pct = it.meta > 0 ? it.realizado / it.meta : 0;
    const corte = Math.floor((W - 8) / LARG_CHAR);
    s += `<text class="rotulo-cat" x="0" y="${y + 14}">${esc(it.rotulo.length > corte ? it.rotulo.slice(0, corte - 1) + '…' : it.rotulo)}</text>`;
    s += `<rect x="0" y="${y + 22}" width="${escala}" height="14" rx="4" fill="var(--trilha)"/>`;
    s += `<path d="${barraH(0, y + 25, Math.min(1.3, pct) * escala, 8, 3)}" fill="${spec.cor}"/>`;
    s += `<line x1="${escala}" x2="${escala}" y1="${y + 18}" y2="${y + 40}" stroke="var(--tinta-2)" stroke-width="2"/>`;
    s += `<text x="${W}" y="${y + 33}" text-anchor="end"><tspan class="rotulo-pct">${esc(fmt(it.realizado))} / ${esc(fmt(it.meta))}</tspan><tspan class="rotulo-valor${pct >= 1 ? ' forte' : ''}" dx="8">${esc(pctTxt(pct))}</tspan></text>`;
    s += `<rect class="alvo" data-i="${i}" tabindex="0" x="0" y="${y}" width="${W}" height="${alt}" fill="transparent"/>`;
  });
  return s + '</svg>';
}

const TIPOS = { colunas, linha, barras, metas };

// ------------------------------------------------------------ minigráfico

/** Linha de tendência sem eixo para cartões (12 pontos). Decorativo: o número está no cartão. */
export function minigrafico(valores, cor = 'var(--s1)', w = 112, h = 30) {
  if (!valores?.length || valores.every(v => !v)) return '';
  const max = Math.max(...valores), min = Math.min(0, ...valores);
  const x = i => valores.length === 1 ? w / 2 : 2 + (i * (w - 4)) / (valores.length - 1);
  const y = v => h - 3 - ((v - min) / ((max - min) || 1)) * (h - 6);
  const pts = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ult = valores.length - 1;
  return `<svg class="mini" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(ult)}" cy="${y(valores[ult])}" r="2.5" fill="${cor}"/></svg>`;
}

// ------------------------------------------------------------ atalhos

/** Agrupa a cauda em "Outros" — nunca mais itens que cabem com leitura. */
export function topN(itens, n = 8) {
  if (itens.length <= n) return itens;
  const cabeca = itens.slice(0, n - 1);
  const resto = itens.slice(n - 1);
  return [...cabeca, { rotulo: `Outros (${resto.length})`, valor: resto.reduce((a, x) => a + x.valor, 0), outros: true }];
}

export { linhaDica };
