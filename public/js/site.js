// Site institucional do Instituto CRV Minas (index.html).
// Textos: js/dados/institucional.js (Quadro Institucional, sem mudar palavra).
// Números, fotos, projetos e parceiros: a mesma base pública do portal
// (dados/base.js) — nada é digitado aqui. Com a base em modo de exemplo, a
// faixa amarela avisa. O sistema em si fica em portal.html.

import { prepararBase, basePublica } from './dados/base.js';
import { lerArquivo } from './dados/db.js';
import * as calc from './calculo.js';
import { INSTITUTO, PILARES, PUBLICO, ATUACAO, VALORES } from './dados/institucional.js';
import { esc, fmtNum, fmtMoedaCurta, fmtPct } from './util.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const portal = rota => `portal.html${rota ? '#/' + rota : ''}`;

// ------------------------------------------------------------ textos do quadro institucional

function destacar(texto, destaques) {
  let h = esc(texto);
  for (const d of destaques || []) h = h.replace(esc(d), `<mark>${esc(d)}</mark>`);
  return h;
}

function textosInstitucionais() {
  const prop = PILARES.find(p => p.k === 'proposito');
  $('#abertura-texto').textContent = prop.texto;
  $('#abertura-sobre').textContent = INSTITUTO.nome;
  $('#frase-proposito').innerHTML = destacar(prop.texto, prop.destaques);
  $('#pilares').innerHTML = PILARES.map((p, i) => `
    <article class="pilar revela" style="transition-delay:${i * 90}ms">
      <span class="pilar-num" aria-hidden="true">0${i + 1}</span>
      <span class="perg">${esc(p.pergunta)}</span>
      <h3>${esc(p.titulo)}</h3>
      <p>${esc(p.texto)}</p>
    </article>`).join('');
  $('#publico').textContent = PUBLICO.toLowerCase();
  $('#lista-valores').innerHTML = VALORES.map((v, i) => `<li class="revela" style="transition-delay:${(i % 4) * 70}ms">${esc(v)}</li>`).join('');
  $('#ano').textContent = new Date().getFullYear();
}

// ------------------------------------------------------------ topo, menu, rolagem

function comportamento() {
  const topo = $('#topo'), subir = $('#subir'), nav = $('#nav'), sand = $('#sanduiche');
  const aoRolar = () => {
    topo.classList.toggle('rolou', scrollY > 30);
    subir.classList.toggle('on', scrollY > 700);
  };
  addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();
  sand.addEventListener('click', () => {
    const aberta = nav.classList.toggle('aberta');
    sand.setAttribute('aria-expanded', String(aberta));
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('aberta'); sand.setAttribute('aria-expanded', 'false'); } });

  // seção visível marcada no menu
  const links = new Map($$('.nav a').map(a => [a.getAttribute('href').slice(1), a]));
  const vistos = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) links.forEach((a, id) => a.classList.toggle('on', id === e.target.id));
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) vistos.observe(s); });
}

/** Elementos .revela entram ao aparecer; números com data-conta contam do zero. */
const observador = new IntersectionObserver(es => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('visto');
    if (e.target.dataset.conta !== undefined) contar(e.target);
    e.target.querySelectorAll?.('[data-conta]').forEach(contar);
    e.target.querySelectorAll?.('.barra i[data-largura]').forEach(i => { i.style.width = i.dataset.largura; });
    observador.unobserve(e.target);
  }
}, { threshold: 0.15 });
const observar = raiz => $$('.revela, [data-conta]', raiz).forEach(el => observador.observe(el));

const FORMATOS = { num: fmtNum, moeda: fmtMoedaCurta };
function contar(el) {
  if (el._contou) return;
  el._contou = true;
  const alvo = Number(el.dataset.alvo) || 0;
  const fmt = FORMATOS[el.dataset.fmt || 'num'];
  if (calmo) { el.textContent = fmt(alvo); return; }
  const t0 = performance.now(), dur = 1600;
  const passo = t => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = fmt(alvo * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// ------------------------------------------------------------ fotos

const urls = new Map();
async function urlFoto(doc) {
  if (!doc?.arquivo) return null;
  if (!urls.has(doc.arquivo.id)) {
    const a = await lerArquivo(doc.arquivo.id);
    urls.set(doc.arquivo.id, a ? URL.createObjectURL(a.blob) : null);
  }
  return urls.get(doc.arquivo.id);
}
/**
 * Imagem da carga de exemplo: foto de banco de imagens (não retrata o Instituto)
 * ou ilustração desenhada. Nenhuma das duas é foto real dos projetos, e a página
 * diz isso em cada uma — o corte da imagem esconderia qualquer aviso dentro dela.
 */
const ehBanco = doc => doc?.fonte?.tipo === 'banco-de-imagens';
const ehIlustracao = doc => !!doc && (doc.exemplo || ehBanco(doc) || /ilustrativ/i.test(doc.descricao || ''));
const seloIlustracao = doc => !ehIlustracao(doc) ? '' : `<span class="selo-ilus">${ehBanco(doc) ? 'foto ilustrativa' : 'ilustração'}</span>`;
const tipoImagem = doc => ehBanco(doc) ? `Foto ilustrativa (Unsplash, ${doc.fonte.autor})` : ehIlustracao(doc) ? 'Imagem ilustrativa (exemplo)' : 'Foto';
const legendaDe = (doc, b) => {
  const nome = doc.titulo.split(' — ')[0];
  const p = b.projetos.find(x => x.id === doc.projetoId);
  return p ? `${nome} · ${p.nome}` : nome;
};

/** Abertura: as fotos publicadas trocam a cada 6 s com zoom lento; a legenda diz de qual projeto é. */
async function abertura(fotos, b) {
  const caixa = $('#abertura-fotos');
  const lista = fotos.slice(0, 8);
  for (const f of lista) {
    const url = await urlFoto(f);
    if (!url) continue;
    const img = new Image();
    img.src = url; img.alt = '';
    img.dataset.legenda = `${tipoImagem(f)}: ${legendaDe(f, b)}`;
    caixa.appendChild(img);
  }
  const imgs = $$('img', caixa);
  if (!imgs.length) return;
  let i = 0;
  const mostrar = k => {
    imgs.forEach((im, j) => im.classList.toggle('on', j === k));
    $('#abertura-legenda').textContent = imgs[k].dataset.legenda;
  };
  mostrar(0);
  if (!calmo && imgs.length > 1) setInterval(() => { i = (i + 1) % imgs.length; mostrar(i); }, 6000);
}

// ------------------------------------------------------------ seções com dados do portal

function cartaoAbertura(b, ind) {
  const c = $('#abertura-cartao');
  const el = $('b', c);
  el.dataset.alvo = ind.beneficiados;
  el.dataset.conta = '';
  $('#ac-sub').textContent = `em ${fmtNum(b.projetos.filter(p => p.status !== 'Planejado').length)} projetos · ${fmtNum(ind.municipios)} municípios`;
  c.hidden = false;
  setTimeout(() => contar(el), 700);
}

async function areas(b, fotos) {
  const resumo = calc.porArea(b, null);
  const usadas = new Set();
  const html = [];
  for (const a of ATUACAO) {
    const r = resumo.filter(x => a.areasPortal.includes(x.area));
    const soma = k => r.reduce((s, x) => s + x[k], 0);
    const projetosArea = new Set(b.projetos.filter(p => a.areasPortal.includes(p.area)).map(p => p.id));
    // uma foto diferente para cada área, mesmo quando duas áreas do quadro são uma só no portal
    const foto = fotos.find(f => projetosArea.has(f.projetoId) && !usadas.has(f.id) && fotoCombina(a.k, f)) || fotos.find(f => projetosArea.has(f.projetoId) && !usadas.has(f.id));
    if (foto) usadas.add(foto.id);
    const url = foto ? await urlFoto(foto) : null;
    html.push(`<a class="area revela" href="${portal('projetos?area=' + encodeURIComponent(a.areasPortal[0]))}">
      ${url ? `<img src="${url}" alt="${esc(legendaDe(foto, b))}" loading="lazy">` : ''}${seloIlustracao(foto)}
      <div class="area-in">
        <span class="area-tag">${esc(a.areasPortal[0] !== a.titulo ? `No portal: ${a.areasPortal[0]}` : 'Área de atuação')}</span>
        <h3>${esc(a.titulo)}</h3>
        <div class="area-num">
          <div><b data-conta data-alvo="${soma('projetos')}">0</b><span>${soma('projetos') === 1 ? 'projeto' : 'projetos'}</span></div>
          <div><b data-conta data-alvo="${soma('pessoas')}">0</b><span>pessoas atendidas</span></div>
        </div>
        <p class="area-inv"><b data-conta data-fmt="moeda" data-alvo="${soma('investido')}">0</b> investidos</p>
        <span class="area-ir">Ver projetos da área →</span>
      </div></a>`);
  }
  $('#areas').innerHTML = html.join('');
}
/** Para Cultura e Esporte (uma área só no portal), prefere a foto com o assunto certo. */
function fotoCombina(k, f) {
  const t = f.titulo.toLowerCase();
  if (k === 'esporte') return /futsal|turma/.test(t);
  if (k === 'cultura') return /festival|oficina|música|teatro|dança|arte/.test(t);
  return true;
}

function circulos(b, ind) {
  const realizados = b.projetos.filter(p => ['Em execução', 'Concluído'].includes(p.status)).length;
  const itens = [
    ['moeda', ind.recebido, 'recebidos e publicados', 'receitas'],
    ['num', ind.beneficiados, 'pessoas atendidas', 'impacto'],
    ['num', ind.familias, 'famílias acompanhadas', 'impacto'],
    ['num', realizados, 'projetos realizados', 'projetos'],
    ['num', ind.municipios, 'municípios alcançados', 'impacto'],
  ];
  $('#circulos').innerHTML = itens.map(([fmt, v, rot, rota], i) =>
    `<a class="circulo revela" style="transition-delay:${i * 80}ms" href="${portal(rota)}"><b data-conta data-fmt="${fmt}" data-alvo="${v}">0</b><span>${esc(rot)}</span></a>`).join('');
  const anos = b.anos.length ? `${Math.min(...b.anos)}–${Math.max(...b.anos)}` : '';
  $('#numeros-sub').textContent = `Números do portal de transparência${anos ? `, exercícios ${anos}` : ''}${b.demonstracao ? ' — hoje, dados de exemplo' : ''}. Clique em cada um para ver o detalhe.`;
}

async function projetos(b, fotos) {
  const ordem = { 'Em execução': 0, 'Concluído': 1, 'Suspenso': 2, 'Planejado': 3 };
  const ps = b.projetos.filter(p => p.status !== 'Planejado').sort((x, y) => ordem[x.status] - ordem[y.status] || y.orcamento - x.orcamento).slice(0, 6);
  const html = [];
  for (const p of ps) {
    const r = calc.resumoProjeto(b, p);
    const foto = fotos.find(f => f.projetoId === p.id);
    const url = foto ? await urlFoto(foto) : null;
    const fis = r.execFisica ?? 0;
    html.push(`<a class="projeto revela" href="${portal('projetos/' + encodeURIComponent(p.id))}">
      <div class="projeto-foto">${url ? `<img src="${url}" alt="${esc(legendaDe(foto, b))}" loading="lazy">` : ''}<span class="area-tag">${esc(p.area)}</span>${seloIlustracao(foto)}</div>
      <div class="projeto-corpo">
        <h3>${esc(p.nome)}</h3>
        <p>${esc(p.objetivo)}</p>
        <div class="barra" role="img" aria-label="Metas cumpridas: ${fmtPct(fis, 0)}"><i data-largura="${Math.min(100, fis * 100)}%"></i></div>
        <div class="projeto-pe"><span><b>${fmtNum(r.beneficiarios)}</b> pessoas</span><span><b>${fmtPct(fis, 0)}</b> das metas</span><span>${esc(p.status)}</span></div>
      </div></a>`);
  }
  $('#lista-projetos').innerHTML = html.join('') || '<p>Nenhum projeto publicado ainda.</p>';
}

const CORES = ['#00257D', '#0051BF', '#007BDF', '#0B7FAE', '#E89A00', '#021444'];
function parceiros(b) {
  const recebido = id => b.receitas.filter(r => r.parceiroId === id).reduce((s, r) => s + r.valor, 0);
  const lista = b.parceiros.filter(p => p.tipo !== 'Pessoa física')
    .map(p => ({ ...p, total: recebido(p.id) })).sort((x, y) => y.total - x.total).slice(0, 12);
  const iniciais = n => n.replace(/\(.*?\)/g, '').replace(/—.*$/, '').split(/\s+/).filter(w => w.length > 2 && !/^(de|da|do|dos|das|ltda\.?|s\.a\.)$/i.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '•';
  $('#lista-parceiros').innerHTML = lista.map((p, i) => `<div class="parceiro revela" style="transition-delay:${(i % 4) * 60}ms">
      <span class="monograma" style="background:${CORES[i % CORES.length]}" aria-hidden="true">${esc(iniciais(p.nome))}</span>
      <div><b>${esc(p.nome)}</b><span>${esc(p.tipo)}${p.total ? ` · ${fmtMoedaCurta(p.total)} repassados` : ''}</span></div></div>`).join('')
    || '<p class="centro">Os parceiros aparecem aqui assim que forem publicados no portal.</p>';
}

// ------------------------------------------------------------ dinâmica e tipografia em movimento

/** Título da abertura letra a letra; com o mouse perto, a letra engrossa (Inter variável: peso contínuo). */
function letras() {
  const h1 = $('.titulo-caixas');
  h1.setAttribute('aria-label', `${INSTITUTO.lema}`);
  let i = 0;
  for (const sp of $$(':scope > span:not(.rotativo)', h1)) {
    sp.innerHTML = [...sp.textContent].map(c => `<i class="letra${c === ' ' ? ' espaco' : ''}" style="--i:${i++}" aria-hidden="true">${c === ' ' ? '&nbsp;' : esc(c)}</i>`).join('');
  }
  if (calmo || matchMedia('(hover: none)').matches) return;
  const ls = $$('.letra', h1);
  h1.addEventListener('pointermove', e => {
    for (const l of ls) {
      const r = l.getBoundingClientRect();
      const f = Math.max(0, 1 - Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) / 240);
      l.style.setProperty('--w', Math.round(380 + 520 * f));
      l.style.transform = `translateY(${(-f * 10).toFixed(1)}px)`;
    }
  });
  h1.addEventListener('pointerleave', () => ls.forEach(l => { l.style.removeProperty('--w'); l.style.transform = ''; }));
}

/** A terceira linha do título alterna as áreas de atuação do quadro institucional. */
function rotativo() {
  const el = $('#rotativo');
  const frases = ATUACAO.map(a => `${/^(esporte|meio)/i.test(a.titulo) ? 'pelo' : 'pela'} ${a.titulo.toLowerCase()}`);
  el.textContent = frases[0];
  if (calmo) return;
  let i = 0;
  setInterval(() => {
    el.classList.remove('entra'); el.classList.add('sai');
    setTimeout(() => { i = (i + 1) % frases.length; el.textContent = frases[i]; el.classList.remove('sai'); el.classList.add('entra'); }, 340);
  }, 2600);
}

/** Títulos das seções: cada palavra numa máscara, para subir em sequência quando a seção aparece. */
function palavras() {
  for (const t of $$('.titulo-grande')) {
    let n = 0;
    const partes = [];
    for (const no of t.childNodes) {
      if (no.nodeType === 3) partes.push(no.textContent.split(/(\s+)/).map(w => /^\s+$/.test(w) || !w ? w : `<span class="palavra"><i style="--i:${n++}">${esc(w)}</i></span>`).join(''));
      else partes.push(no.outerHTML);
    }
    t.innerHTML = partes.join('');
  }
}

/** Faixas de palavras gigantes que andam com a rolagem (quanto mais rápido se rola, mais rápido andam). */
function cinetica() {
  const palavrasFaixa = [INSTITUTO.lema, ...ATUACAO.map(a => a.titulo), 'Transparência'];
  const html = palavrasFaixa.map((p, i) => `<b class="${i === 0 ? 'degrade' : ''}">${esc(p)}</b><b class="estrela">✦</b>`).join('');
  const trilhos = $$('.cinetica-trilho');
  trilhos.forEach(t => { t.innerHTML = html + html; });
  if (calmo) return;
  let ultimoY = scrollY, vel = 0;
  const pos = trilhos.map(() => 0);
  const passo = () => {
    const dy = scrollY - ultimoY; ultimoY = scrollY;
    vel = vel * 0.9 + Math.abs(dy) * 0.12;
    trilhos.forEach((t, k) => {
      const metade = t.scrollWidth / 2;
      pos[k] = (pos[k] + (0.6 + vel) * Number(t.dataset.sentido)) % metade;
      const x = pos[k] > 0 ? pos[k] - metade : pos[k];
      t.style.transform = `translateX(${x}px)`;
    });
    requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

/** Profundidade: ilustrações e fotos das áreas andam em velocidades diferentes da página; barra de progresso. */
function profundidade() {
  const decos = $$('.deco[data-vel]');
  const prog = $('#progresso');
  let pendente = false;
  const atualizar = () => {
    pendente = false;
    const total = document.documentElement.scrollHeight - innerHeight;
    prog.style.setProperty('--p', total > 0 ? (scrollY / total).toFixed(4) : 0);
    if (calmo) return;
    for (const d of decos) {
      const r = d.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      d.style.translate = `0 ${(r.top * Number(d.dataset.vel)).toFixed(1)}px`;
    }
    for (const a of $$('.area')) {
      const r = a.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      a.style.setProperty('--py', `${((r.top + r.height / 2 - innerHeight / 2) * -0.08).toFixed(1)}px`);
    }
  };
  addEventListener('scroll', () => { if (!pendente) { pendente = true; requestAnimationFrame(atualizar); } }, { passive: true });
  atualizar();
}

/** Cartões de projeto inclinam acompanhando o mouse; a luz da faixa marinho segue o mouse. */
function toque() {
  if (calmo || matchMedia('(hover: none)').matches) return;
  const lista = $('#lista-projetos');
  lista.addEventListener('pointermove', e => {
    const c = e.target.closest('.projeto');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width) - .5) * 10}deg`);
    c.style.setProperty('--rx', `${(.5 - ((e.clientY - r.top) / r.height)) * 8}deg`);
  });
  lista.addEventListener('pointerout', e => { const c = e.target.closest('.projeto'); if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); } });
  const faixa = $('#numeros');
  faixa.addEventListener('pointermove', e => {
    const r = faixa.getBoundingClientRect();
    faixa.style.setProperty('--mx', `${e.clientX - r.left}px`);
    faixa.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

/** Momentos: as imagens publicadas em duas fileiras infinitas, em sentidos opostos. */
async function momentos(fotos, b) {
  if (!fotos.length) { $('#momentos').hidden = true; return; }
  const itens = [];
  for (const f of fotos) {
    const url = await urlFoto(f);
    if (url) itens.push(`<a class="momento" href="${portal('projetos/' + encodeURIComponent(f.projetoId))}"><img src="${url}" alt="" loading="lazy">${seloIlustracao(f)}<span class="momento-leg">${esc(legendaDe(f, b))}</span></a>`);
  }
  const metade = Math.ceil(itens.length / 2);
  const f1 = itens.slice(0, metade), f2 = itens.slice(metade).concat(itens.slice(0, Math.max(0, metade - (itens.length - metade))));
  // cada fileira repetida duas vezes: o movimento de -50% fecha o laço sem emenda
  $('#fileira-1').innerHTML = f1.join('') + f1.join('');
  $('#fileira-2').innerHTML = f2.join('') + f2.join('');
  $$('#fileira-1 a, #fileira-2 a').slice(f1.length).forEach(a => a.setAttribute('tabindex', '-1'));
  if (fotos.every(ehIlustracao)) $('#momentos-sub').textContent = 'Por enquanto, fotos ilustrativas de banco de imagens: não retratam o Instituto. As fotos reais entram pelo portal (Documentos → Fotografia) e aparecem aqui sozinhas.';
}

/** Rodapé: crédito de cada foto de banco de imagens em uso (licença Unsplash — o crédito é cortesia, mas é o certo). */
function creditos(fotos) {
  // um crédito por autor, com um link para cada foto dele
  const porAutor = new Map();
  for (const f of fotos) if (ehBanco(f)) {
    const urlsAutor = porAutor.get(f.fonte.autor) || [];
    if (!urlsAutor.includes(f.fonte.url)) urlsAutor.push(f.fonte.url);
    porAutor.set(f.fonte.autor, urlsAutor);
  }
  if (!porAutor.size) return;
  const links = [...porAutor].map(([autor, us]) => `${esc(autor)} (${us.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">foto${us.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(', ')})`).join(' · ');
  $('#creditos').innerHTML = `Fotos ilustrativas (não retratam o Instituto): <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a> — ${links}.`;
}

// ------------------------------------------------------------ início

async function iniciar() {
  // rota do portal digitada ou colada com a página já aberta (o redirecionar.js só roda no carregamento)
  addEventListener('hashchange', () => { if (/^#\//.test(location.hash)) location.replace('portal.html' + location.hash); });
  textosInstitucionais();
  letras();
  rotativo();
  palavras();
  cinetica();
  comportamento();
  profundidade();
  toque();
  observar(document);
  try {
    await prepararBase();
  } catch (e) {
    console.error(e);
    return; // sem base local (modo que bloqueia armazenamento): o site fica só com os textos
  }
  const b = basePublica();
  $('#faixa-exemplo').hidden = !b.demonstracao;
  const ind = calc.indicadores(b, null);
  const fotos = b.documentos.filter(d => d.categoria === 'Fotografia' && d.arquivo?.tipo?.startsWith('image/'));
  cartaoAbertura(b, ind);
  creditos(fotos);
  circulos(b, ind);
  parceiros(b);
  await Promise.all([abertura(fotos, b), areas(b, fotos), projetos(b, fotos), momentos(fotos, b)]);
  const fotoTransp = fotos.find(f => /cestas|convivência/i.test(f.titulo)) || fotos[0];
  const u = await urlFoto(fotoTransp);
  if (u) {
    $('#foto-transparencia').src = u;
    $('#foto-transparencia').alt = legendaDe(fotoTransp, b);
    $('.foto-arco').insertAdjacentHTML('beforeend', seloIlustracao(fotoTransp));
  }
  observar(document);
}

iniciar();
