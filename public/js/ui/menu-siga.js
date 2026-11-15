// Menu lateral no padrão SIGA-MG — porta do static/siga/menu.js do
// app-disponibilidade-frota, com as mesmas regras:
//   - alternarMenu(): no computador recolhe/expande (trilho de 60 px, lembrado
//     em "menu-recolhido"); no celular abre e fecha a gaveta.
//   - seções: clicar no título abre e fecha (lembrado em "menu-secoes-fechadas";
//     a seção da tela atual sempre abre).
//   - grupo com telas embaixo: abre na guia; no trilho, a lista abre ao lado.
//   - busca: nome, subtítulo, dica, seção e grupo, sem acento; setas escolhem,
//     Enter abre, Esc limpa. Ctrl+K ou "/" (fora de um campo) vão para a busca.
// Diferença do original: o portal troca de tela sem recarregar, então a tela
// atual é marcada por marcarAtual() a cada mudança de rota, e não no HTML.

const ler = k => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const norm = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CH_SECOES = 'menu-secoes-fechadas', CH_RECOLHIDO = 'menu-recolhido';

/** O nome da tela: o texto solto do link (pílula: o texto do span). */
function nomeDe(a) {
  if (a.classList.contains('siga-pilula')) return a.textContent.trim();
  let t = '';
  for (let n = a.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) t += n.textContent;
  return t.trim();
}

let app, nav, celular, links = [], flyout = null;

const trilho = () => app.classList.contains('menu-recolhido') && !celular.matches;

function marcarSecao(g, fechar) {
  g.classList.toggle('sg-fechada', fechar);
  g.querySelector('.gl')?.setAttribute('aria-expanded', fechar ? 'false' : 'true');
}
function alternarSecao(g) {
  const fechar = !g.classList.contains('sg-fechada');
  marcarSecao(g, fechar);
  let fechadas = [];
  try { fechadas = JSON.parse(ler(CH_SECOES) || '[]') || []; } catch { fechadas = []; }
  fechadas = fechadas.filter(s => s !== g.dataset.secao);
  if (fechar) fechadas.push(g.dataset.secao);
  gravar(CH_SECOES, JSON.stringify(fechadas));
}

function fecharFlyout() {
  if (!flyout) return;
  flyout.classList.remove('sg-flyout');
  flyout.querySelector('.sg-mod-btn')?.setAttribute('aria-expanded', flyout.classList.contains('sg-aberto') ? 'true' : 'false');
  flyout = null;
}
function abrirFlyout(mod, btn) {
  fecharFlyout();
  const r = btn.getBoundingClientRect();
  mod.style.setProperty('--sg-fly-x', Math.round(r.right + 8) + 'px');
  mod.style.setProperty('--sg-fly-y', Math.round(Math.max(8, Math.min(r.top, innerHeight - 320))) + 'px');
  mod.classList.add('sg-flyout');
  btn.setAttribute('aria-expanded', 'true');
  flyout = mod;
}

/** O title leva o texto inteiro (o nome vai em até 2 linhas, o subtítulo em 1): no trilho é o único jeito de ver o nome. */
function titulos() {
  const inteiro = (nome, dica, desc) => { const extra = dica || desc || ''; return extra && extra !== nome ? `${nome} — ${extra}` : nome; };
  for (const a of links) if (!a.closest('.sg-filhos')) a.title = inteiro(nomeDe(a), a.dataset.dica, a.dataset.desc);
  for (const b of nav.querySelectorAll('.sg-mod-btn')) b.title = inteiro(b.querySelector('.sg-mod-t').textContent.trim(), b.dataset.dica, b.querySelector('.sg-mod-d')?.textContent.trim());
  const rec = document.querySelector('.sg-recolher');
  if (rec) rec.title = trilho() ? 'Expandir o menu' : 'Recolher o menu (fica só a coluna de ícones)';
}

export function alternarMenu() {
  if (celular.matches) { app.classList.toggle('menu-aberto'); return; }
  const r = app.classList.toggle('menu-recolhido');
  gravar(CH_RECOLHIDO, r ? '1' : '0');
  fecharFlyout();
  titulos();
  dispatchEvent(new Event('resize')); // gráficos se ajustam à largura nova
}

/**
 * Marca a tela atual (link ou pílula com href igual à rota), abre a seção e o
 * grupo dela e devolve {grupo, tela} para a barra de cima.
 */
export function marcarAtual(pagina) {
  let ativo = null;
  for (const a of links) {
    const on = a.getAttribute('href').replace(/^#\/?/, '') === pagina;
    a.classList.toggle('on', on);
    if (on) { a.setAttribute('aria-current', 'page'); ativo = a; } else a.removeAttribute('aria-current');
  }
  for (const m of nav.querySelectorAll('.sg-mod')) {
    const contem = !!m.querySelector('a.on');
    m.classList.toggle('sg-contem', contem);
    if (contem) { m.classList.add('sg-aberto'); m.querySelector('.sg-mod-btn').setAttribute('aria-expanded', 'true'); }
  }
  const g = ativo?.closest('.navgroup[data-secao]');
  if (g?.classList.contains('sg-fechada')) marcarSecao(g, false);
  app.classList.remove('menu-aberto');
  fecharFlyout();
  if (ativo && ativo.offsetParent !== null) {
    const topo = ativo.offsetTop, fim = topo + ativo.offsetHeight;
    if (topo < nav.scrollTop || fim > nav.scrollTop + nav.clientHeight) nav.scrollTop = Math.max(0, topo - nav.clientHeight / 3);
  }
  return ativo ? { grupo: ativo.dataset.grupo || '', tela: nomeDe(ativo) } : null;
}

export function iniciarMenu() {
  app = document.getElementById('app');
  nav = document.getElementById('menu-nav');
  celular = matchMedia('(max-width: 900px)');
  links = [...nav.querySelectorAll('a')];
  if (ler(CH_RECOLHIDO) === '1') app.classList.add('menu-recolhido');

  // seções fechadas na visita anterior
  let fechadas = [];
  try { fechadas = JSON.parse(ler(CH_SECOES) || '[]') || []; } catch { fechadas = []; }
  for (const g of nav.querySelectorAll('.navgroup[data-secao]')) if (fechadas.includes(g.dataset.secao)) marcarSecao(g, true);

  nav.addEventListener('click', e => {
    const sec = e.target.closest('.sg-sec');
    if (sec) { alternarSecao(sec.closest('.navgroup')); return; }
    const btn = e.target.closest('.sg-mod-btn');
    if (!btn) return;
    const mod = btn.closest('.sg-mod');
    if (trilho()) { mod.classList.contains('sg-flyout') ? fecharFlyout() : abrirFlyout(mod, btn); return; }
    const aberto = mod.classList.toggle('sg-aberto');
    btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  });
  nav.addEventListener('keydown', e => {
    const gl = e.target.closest?.('.gl');
    if (gl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); alternarSecao(gl.closest('.navgroup')); }
  });
  document.addEventListener('mousedown', e => { if (flyout && !flyout.contains(e.target)) fecharFlyout(); });
  nav.addEventListener('scroll', fecharFlyout, { passive: true });

  for (const a of links) {
    const g = a.closest('.navgroup'), gl = g?.querySelector('.gl'), mt = a.closest('.sg-mod')?.querySelector('.sg-mod-t');
    a.dataset.dica = a.getAttribute('title') || '';
    a.dataset.busca = norm([nomeDe(a), a.dataset.dica, a.dataset.desc || '', gl?.textContent || '', mt?.textContent || ''].join(' '));
  }
  for (const b of nav.querySelectorAll('.sg-mod-btn')) b.dataset.dica = b.getAttribute('title') || '';
  titulos();

  document.querySelectorAll('[data-alternar-menu]').forEach(b => b.addEventListener('click', alternarMenu));
  document.getElementById('scrim')?.addEventListener('click', () => app.classList.remove('menu-aberto'));
  const trocou = () => { fecharFlyout(); app.classList.remove('menu-aberto'); titulos(); };
  celular.addEventListener('change', trocou);

  // ---- busca no menu
  const inp = document.getElementById('busca-menu'), vazio = document.getElementById('busca-vazio');
  let achados = [], sel = -1;
  const marcar = () => {
    links.forEach(a => a.classList.remove('busca-sel'));
    if (achados[sel]) { achados[sel].classList.add('busca-sel'); achados[sel].scrollIntoView({ block: 'nearest' }); }
  };
  const filtrar = () => {
    const partes = norm(inp.value).split(/\s+/).filter(Boolean), busca = partes.length > 0;
    for (const a of links) a.hidden = busca && !partes.every(p => a.dataset.busca.includes(p));
    nav.querySelectorAll('.sg-mod').forEach(m => m.classList.toggle('busca-fora', busca && !m.querySelector('a:not([hidden])')));
    nav.querySelectorAll('.navgroup').forEach(g => g.classList.toggle('busca-fora', busca && !g.querySelector('a:not([hidden])')));
    nav.classList.toggle('buscando', busca);
    achados = links.filter(a => !a.hidden && a.offsetParent !== null);
    sel = busca && achados.length ? 0 : -1;
    vazio.hidden = !busca || achados.length > 0;
    marcar();
  };
  inp.addEventListener('input', filtrar);
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!achados.length) return;
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + achados.length) % achados.length;
      marcar();
    } else if (e.key === 'Enter' && achados[sel]) {
      e.preventDefault();
      location.hash = achados[sel].getAttribute('href');
      inp.value = ''; filtrar(); inp.blur();
    } else if (e.key === 'Escape') {
      inp.value = ''; filtrar(); inp.blur();
      app.classList.remove('menu-aberto');
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (flyout) { fecharFlyout(); return; }
      if (app.classList.contains('menu-aberto') && !document.querySelector('.fundo-modal, .galeria-tela')) app.classList.remove('menu-aberto');
      return;
    }
    const digitando = e.target.closest?.('input, textarea, select, [contenteditable]');
    const atalho = ((e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 'k') || (e.key === '/' && !digitando);
    if (!atalho || document.querySelector('.fundo-modal, .galeria-tela')) return;
    e.preventDefault();
    if (celular.matches) app.classList.add('menu-aberto');
    else if (app.classList.contains('menu-recolhido')) alternarMenu();
    inp.focus(); inp.select();
  });
}
