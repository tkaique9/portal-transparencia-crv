// Ilustrações dos DADOS DE EXEMPLO, desenhadas no canvas.
//
// Não são fotos e dizem isso na própria imagem. Servem para a demonstração
// mostrar como o portal fica com imagens de cada projeto; as fotos reais
// entram pela área restrita (Documentos → categoria Fotografia, vinculada ao
// projeto) e passam a aparecer nos mesmos lugares.

const W = 1200, H = 750;
const PELES = ['#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#5c3a1e', '#a86b3c'];
const ROUPAS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#e34948', '#14325c', '#ffffff'];
const CABELOS = ['#1d1410', '#3b2414', '#6b4423', '#0f0f0f', '#8a6a3a'];

function rng(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ------------------------------------------------------------ peças

function rr(g, x, y, w, h, r, cor) { g.fillStyle = cor; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
function circ(g, x, y, r, cor) { g.fillStyle = cor; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function grad(g, y0, y1, c0, c1) { const l = g.createLinearGradient(0, y0, 0, y1); l.addColorStop(0, c0); l.addColorStop(1, c1); return l; }

/** Pessoa estilizada com os pés em (x, y). s = escala; pose: 'em pé' | 'sentada' | 'braco' (braço levantado) */
function pessoa(g, x, y, s, r, { pose = 'em pé', camisa, crianca = false, jaleco = false, chapeu = false, item = null } = {}) {
  const pele = PELES[Math.floor(r() * PELES.length)];
  const roupa = jaleco ? '#f4f6f8' : camisa || ROUPAS[Math.floor(r() * ROUPAS.length)];
  const calca = ['#2b3445', '#3d4f6b', '#5a4632', '#1f2a36'][Math.floor(r() * 4)];
  const k = crianca ? 0.72 : 1;
  const alt = 150 * s * k;
  const ombro = y - alt * 0.72;
  const cab = 17 * s * k;
  if (pose !== 'sentada') {
    rr(g, x - 13 * s * k, y - alt * 0.42, 11 * s * k, alt * 0.42, 5 * s, calca);
    rr(g, x + 2 * s * k, y - alt * 0.42, 11 * s * k, alt * 0.42, 5 * s, calca);
  } else {
    rr(g, x - 14 * s * k, y - alt * 0.44, 34 * s * k, 11 * s * k, 5 * s, calca);
    rr(g, x + 10 * s * k, y - alt * 0.44, 11 * s * k, alt * 0.3, 5 * s, calca);
  }
  rr(g, x - 17 * s * k, ombro, 34 * s * k, alt * (pose === 'sentada' ? 0.3 : 0.34), 12 * s * k, roupa);
  if (jaleco) { g.strokeStyle = '#c9d1dc'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, ombro + 6 * s); g.lineTo(x, ombro + alt * 0.33); g.stroke(); }
  // braços
  g.strokeStyle = roupa; g.lineCap = 'round'; g.lineWidth = 9 * s * k;
  g.beginPath(); g.moveTo(x - 15 * s * k, ombro + 8 * s); g.lineTo(x - 22 * s * k, ombro + alt * 0.3); g.stroke();
  g.beginPath(); g.moveTo(x + 15 * s * k, ombro + 8 * s);
  if (pose === 'braco') g.lineTo(x + 34 * s * k, ombro - 26 * s * k); else g.lineTo(x + 22 * s * k, ombro + alt * 0.3);
  g.stroke();
  if (pose === 'braco') circ(g, x + 35 * s * k, ombro - 28 * s * k, 5 * s * k, pele);
  if (item) item(x + 24 * s * k, ombro + alt * 0.3);
  // cabeça
  rr(g, x - 5 * s * k, ombro - 8 * s * k, 10 * s * k, 10 * s * k, 3, pele);
  circ(g, x, ombro - cab - 4 * s * k, cab, pele);
  g.fillStyle = CABELOS[Math.floor(r() * CABELOS.length)];
  g.beginPath(); g.arc(x, ombro - cab - 7 * s * k, cab * 1.02, Math.PI * 1.02, Math.PI * 1.98); g.fill();
  if (r() > 0.55) { g.beginPath(); g.ellipse(x - cab * 0.7, ombro - cab, cab * 0.42, cab * 0.95, 0.2, 0, Math.PI * 2); g.fill(); }
  if (chapeu) { rr(g, x - cab * 1.05, ombro - cab * 2.9, cab * 2.1, cab * 1.3, cab * 0.5, '#ffffff'); rr(g, x - cab * 1.15, ombro - cab * 1.75, cab * 2.3, cab * 0.4, 3, '#e8ecf1'); }
}

function arvore(g, x, y, s, cor = '#2f8f46') {
  rr(g, x - 7 * s, y - 70 * s, 14 * s, 70 * s, 4, '#7a5432');
  circ(g, x, y - 92 * s, 42 * s, cor);
  circ(g, x - 28 * s, y - 70 * s, 30 * s, cor);
  circ(g, x + 28 * s, y - 72 * s, 32 * s, cor);
}
function muda(g, x, y, s, r) {
  rr(g, x - 14 * s, y - 22 * s, 28 * s, 22 * s, 4 * s, '#a0522d');
  g.strokeStyle = '#2f8f46'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x, y - 22 * s); g.lineTo(x, y - 44 * s - r() * 10 * s); g.stroke();
  g.fillStyle = '#3fae5a';
  g.beginPath(); g.ellipse(x - 9 * s, y - 40 * s, 10 * s, 5 * s, -0.5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x + 9 * s, y - 46 * s, 10 * s, 5 * s, 0.5, 0, Math.PI * 2); g.fill();
}
function nuvem(g, x, y, s) { g.fillStyle = 'rgba(255,255,255,.9)'; for (const [dx, dy, rr2] of [[0, 0, 28], [30, -10, 34], [62, 0, 26], [30, 8, 30]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, rr2 * s, 0, Math.PI * 2); g.fill(); } }
function ceuAberto(g, c0 = '#8ec5f0', c1 = '#e6f3fb') {
  g.fillStyle = grad(g, 0, H * 0.7, c0, c1); g.fillRect(0, 0, W, H);
  circ(g, 1030, 120, 54, 'rgba(255,236,160,.95)');
  nuvem(g, 160, 120, 1.1); nuvem(g, 620, 80, 0.8);
}
function chao(g, y, c0, c1) { g.fillStyle = grad(g, y, H, c0, c1); g.fillRect(0, y, W, H - y); }
function parede(g, cor, rodape = '#c9b79c') { g.fillStyle = cor; g.fillRect(0, 0, W, H); g.fillStyle = rodape; g.fillRect(0, H * 0.74, W, H * 0.26); }
function janela(g, x, y, w, h) {
  rr(g, x - 8, y - 8, w + 16, h + 16, 6, '#ffffff');
  g.fillStyle = grad(g, y, y + h, '#9fd0f5', '#e3f2fc'); g.fillRect(x, y, w, h);
  circ(g, x + w * 0.75, y + h * 0.3, 18, 'rgba(255,236,160,.9)');
  g.fillStyle = '#ffffff'; g.fillRect(x + w / 2 - 3, y, 6, h); g.fillRect(x, y + h / 2 - 3, w, 6);
}
function mesa(g, x, y, w, cor = '#b07a45') { rr(g, x, y, w, 16, 4, cor); rr(g, x + 10, y + 16, 10, 60, 2, '#7a5432'); rr(g, x + w - 20, y + 16, 10, 60, 2, '#7a5432'); }

// ------------------------------------------------------------ cenas

const CENAS = {
  'educar-1'(g, r) { // aula de reforço
    parede(g, '#f3e9d2');
    janela(g, 950, 110, 180, 150);
    rr(g, 150, 90, 560, 280, 10, '#7a5432'); rr(g, 166, 106, 528, 248, 6, '#2f5d46');
    g.fillStyle = 'rgba(255,255,255,.9)'; g.font = 'bold 64px Georgia, serif'; g.fillText('A  B  C', 210, 190);
    g.font = '52px Georgia, serif'; g.fillText('2 + 3 = 5', 210, 290);
    pessoa(g, 790, 560, 1.25, r, { pose: 'braco', camisa: '#14325c' });
    for (let i = 0; i < 4; i++) {
      const x = 170 + i * 200;
      pessoa(g, x + 75, 690, 1.15, r, { pose: 'sentada', crianca: true });
      mesa(g, x, 662, 150, '#d39b5e');
      rr(g, x + 40, 648, 46, 14, 2, ['#e34948', '#2a78d6', '#eda100', '#1baf7a'][i]);
    }
  },
  'educar-2'(g, r) { // formação de professores
    parede(g, '#e8eef6', '#b9c6d8');
    rr(g, 380, 70, 440, 260, 8, '#ffffff'); rr(g, 380, 70, 440, 26, 8, '#14325c');
    const alt = [80, 130, 110, 170, 200];
    alt.forEach((h, i) => rr(g, 430 + i * 72, 300 - h, 42, h, 4, ['#2a78d6', '#2a78d6', '#1baf7a', '#1baf7a', '#eb6834'][i]));
    rr(g, 140, 560, 920, 26, 10, '#9a6a3c');
    for (let i = 0; i < 6; i++) pessoa(g, 210 + i * 160, 600, 1.05, r, { pose: i === 2 ? 'braco' : 'sentada' });
    rr(g, 140, 560, 920, 26, 10, '#b07a45');
    for (let i = 0; i < 6; i++) rr(g, 190 + i * 160, 548, 60, 12, 2, '#ffffff');
  },
  'saude-1'(g, r) { // unidade móvel
    ceuAberto(g); chao(g, 520, '#9ccf7a', '#6fae55');
    arvore(g, 110, 560, 1.3); arvore(g, 1110, 540, 1.1, '#3a9b52');
    rr(g, 300, 260, 560, 250, 26, '#ffffff'); rr(g, 760, 300, 150, 210, 20, '#ffffff');
    rr(g, 790, 320, 90, 70, 8, '#9fd0f5'); rr(g, 300, 400, 610, 30, 0, '#1baf7a');
    rr(g, 500, 300, 40, 110, 4, '#e34948'); rr(g, 465, 335, 110, 40, 4, '#e34948');
    for (const x of [380, 820]) { circ(g, x, 515, 46, '#2b3445'); circ(g, x, 515, 20, '#9aa6b5'); }
    g.fillStyle = '#ffffff'; g.font = 'bold 30px system-ui, sans-serif'; g.fillText('SAÚDE EM MOVIMENTO', 590, 470);
    pessoa(g, 240, 640, 1.1, r, { jaleco: true });
    for (let i = 0; i < 5; i++) pessoa(g, 420 + i * 120, 680 - (i % 2) * 10, 1.05 - (i === 3 ? 0.25 : 0), r, { crianca: i === 3 });
  },
  'saude-2'(g, r) { // prevenção na comunidade
    ceuAberto(g, '#a7d8f0', '#f1f8fc'); chao(g, 500, '#a8d58a', '#7bb862');
    g.fillStyle = '#1baf7a'; g.beginPath(); g.moveTo(230, 300); g.lineTo(600, 180); g.lineTo(970, 300); g.closePath(); g.fill();
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#1baf7a'; g.beginPath(); g.moveTo(230 + i * 92.5, 300); g.lineTo(276 + i * 92.5, 330); g.lineTo(322 + i * 92.5, 300); g.fill(); }
    rr(g, 236, 300, 10, 250, 2, '#cfd6df'); rr(g, 955, 300, 10, 250, 2, '#cfd6df');
    rr(g, 420, 230, 360, 50, 8, '#ffffff'); g.fillStyle = '#14325c'; g.font = 'bold 30px system-ui, sans-serif'; g.fillText('Cuide da sua saúde', 455, 266);
    mesa(g, 380, 520, 440, '#ffffff');
    rr(g, 430, 500, 60, 20, 4, '#e34948'); rr(g, 520, 494, 50, 26, 4, '#2a78d6'); rr(g, 600, 504, 80, 16, 4, '#eda100');
    pessoa(g, 500, 520, 1.05, r, { jaleco: true }); pessoa(g, 700, 520, 1.05, r, { jaleco: true });
    for (let i = 0; i < 6; i++) pessoa(g, 140 + i * 190, 720, 1.1 - (i % 3 === 1 ? 0.3 : 0), r, { crianca: i % 3 === 1 });
  },
  'viveiro-1'(g, r) { // produção de mudas
    ceuAberto(g, '#b5dcf3', '#f2f9fd'); chao(g, 470, '#c9a46c', '#a8834f');
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 6;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(600, 470, 520 - i * 4, 330, 0, Math.PI, 0); g.stroke(); }
    g.fillStyle = 'rgba(230,245,255,.35)'; g.beginPath(); g.ellipse(600, 470, 520, 330, 0, Math.PI, 0); g.fill();
    for (let x = 110; x <= 1090; x += 98) { g.beginPath(); g.moveTo(x, 470); g.lineTo(x, 470 - Math.sqrt(Math.max(0, 1 - ((x - 600) / 520) ** 2)) * 330); g.stroke(); }
    for (let fila = 0; fila < 3; fila++) {
      rr(g, 120, 540 + fila * 66, 960, 12, 4, '#7a5432');
      for (let x = 150; x < 1060; x += 46) muda(g, x, 540 + fila * 66, 0.9 + fila * 0.08, r);
    }
    pessoa(g, 1000, 520, 1.1, r, { chapeu: false, item: (x, y) => { rr(g, x - 6, y - 10, 46, 30, 6, '#2a78d6'); rr(g, x + 38, y - 18, 30, 6, 3, '#2a78d6'); } });
  },
  'viveiro-2'(g, r) { // plantio na nascente
    ceuAberto(g); chao(g, 420, '#8fca6c', '#5d9c46');
    g.fillStyle = '#6fb6e8'; g.beginPath(); g.moveTo(0, 640); g.bezierCurveTo(300, 560, 520, 720, 820, 600); g.bezierCurveTo(980, 540, 1100, 600, W, 560); g.lineTo(W, 620); g.bezierCurveTo(1100, 660, 980, 600, 820, 660); g.bezierCurveTo(520, 780, 300, 620, 0, 700); g.fill();
    for (const [x, y, s] of [[90, 470, 1.2], [260, 440, 0.8], [1080, 450, 1.1], [940, 430, 0.7]]) arvore(g, x, y, s);
    for (let i = 0; i < 7; i++) { const x = 360 + i * 80, y = 520 - (i % 2) * 18; rr(g, x - 2, y - 60, 4, 60, 1, '#c9a46c'); arvore(g, x + 10, y, 0.36, '#3fae5a'); }
    pessoa(g, 300, 600, 1.05, r, { chapeu: false, item: (x, y) => { rr(g, x - 2, y - 60, 6, 110, 2, '#7a5432'); rr(g, x - 12, y + 44, 26, 20, 4, '#9aa6b5'); } });
    pessoa(g, 900, 590, 1, r, { pose: 'braco' });
    pessoa(g, 760, 600, 0.9, r, { crianca: true });
  },
  'renda-1'(g, r) { // panificação
    parede(g, '#f6efe4', '#d9cbb4');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) rr(g, 60 + i * 140, 90 + j * 70, 130, 60, 4, j % 2 ? '#ffffff' : '#eef3f7');
    rr(g, 820, 250, 300, 260, 16, '#4b5563'); rr(g, 850, 300, 240, 140, 10, '#1f2937'); circ(g, 970, 370, 46, '#eb6834'); circ(g, 970, 370, 26, '#ffd765');
    rr(g, 80, 520, 700, 40, 8, '#b07a45'); rr(g, 100, 560, 660, 150, 6, '#8a5c32');
    for (let i = 0; i < 7; i++) { g.fillStyle = '#d99a4e'; g.beginPath(); g.ellipse(150 + i * 90, 506, 38, 18, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#b06e2a'; g.lineWidth = 3; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(140 + i * 90 + k * 12, 496); g.lineTo(152 + i * 90 + k * 12, 512); g.stroke(); } }
    pessoa(g, 230, 520, 1.15, r, { jaleco: true, chapeu: true });
    pessoa(g, 450, 520, 1.15, r, { jaleco: true, chapeu: true, pose: 'braco' });
    pessoa(g, 660, 520, 1.15, r, { jaleco: true, chapeu: true });
  },
  'renda-2'(g, r) { // feira de empreendimentos
    ceuAberto(g, '#9fd2f2', '#f4fafd'); chao(g, 560, '#d8c6a5', '#bfa77f');
    const cores = ['#eb6834', '#2a78d6', '#1baf7a', '#e87ba4'];
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 290;
      rr(g, x, 330, 250, 200, 6, '#f7f1e6');
      for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#ffffff' : cores[i]; g.beginPath(); g.moveTo(x - 10 + k * 45, 290); g.lineTo(x + 35 + k * 45, 290); g.lineTo(x + 35 + k * 45, 340); g.quadraticCurveTo(x + 12 + k * 45, 362, x - 10 + k * 45, 340); g.fill(); }
      rr(g, x - 10, 450, 270, 22, 4, '#9a6a3c');
      for (let k = 0; k < 5; k++) circ(g, x + 25 + k * 50, 436, 16, ['#eda100', '#e34948', '#1baf7a', '#d99a4e', '#6250d6'][(k + i) % 5]);
      pessoa(g, x + 125, 450, 0.85, r);
    }
    for (let i = 0; i < 7; i++) pessoa(g, 90 + i * 170, 730, 1.1 - (i === 2 || i === 5 ? 0.3 : 0), r, { crianca: i === 2 || i === 5 });
  },
  'esporte-1'(g, r) { // futsal
    g.fillStyle = grad(g, 0, 260, '#7fb9e6', '#d7ecf9'); g.fillRect(0, 0, W, 260);
    rr(g, 0, 200, W, 80, 0, '#c9d1dc');
    for (let x = 0; x < W; x += 40) rr(g, x, 200, 4, 80, 0, '#a8b3c2');
    g.fillStyle = '#2e8b57'; g.fillRect(0, 280, W, H - 280);
    g.fillStyle = '#e07a3a'; g.fillRect(60, 320, W - 120, H - 340);
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeRect(60, 320, W - 120, H - 340);
    g.beginPath(); g.moveTo(W / 2, 320); g.lineTo(W / 2, H - 20); g.stroke();
    g.beginPath(); g.arc(W / 2, 535, 80, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#f4f6f8'; g.lineWidth = 8; g.strokeRect(60, 440, 70, 170);
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; for (let y = 450; y < 610; y += 16) { g.beginPath(); g.moveTo(60, y); g.lineTo(130, y); g.stroke(); }
    circ(g, 700, 640, 16, '#ffffff'); g.fillStyle = '#14325c'; g.beginPath(); g.arc(700, 640, 6, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 6; i++) pessoa(g, 240 + i * 150, 690 - (i % 2) * 70, 0.95, r, { crianca: true, camisa: i % 2 ? '#2a78d6' : '#ffd765', pose: i === 4 ? 'braco' : 'em pé' });
  },
  'esporte-2'(g, r) { // festival
    ceuAberto(g, '#93cbef', '#eef7fc'); chao(g, 520, '#96cf72', '#6cae55');
    for (let fio = 0; fio < 2; fio++) {
      const y0 = 70 + fio * 70;
      g.strokeStyle = '#7a8796'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(W / 2, y0 + 70, W, y0); g.stroke();
      for (let i = 0; i < 18; i++) { const x = 20 + i * 66; const yy = y0 + 70 * 4 * (x / W) * (1 - x / W) * 0.5 * 2 / 2; g.fillStyle = ROUPAS[i % 7]; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 40, yy); g.lineTo(x + 20, yy + 42); g.fill(); }
    }
    const pod = [[480, 330, 150, '#ffd765', '1'], [330, 400, 150, '#d0d6de', '2'], [630, 430, 150, '#e0a36b', '3']];
    for (const [x, y, w, cor, n] of pod) { rr(g, x, y, w, 560 - y, 6, cor); g.fillStyle = '#14325c'; g.font = 'bold 56px system-ui, sans-serif'; g.fillText(n, x + w / 2 - 16, y + 70); }
    pessoa(g, 555, 330, 0.95, r, { crianca: true, pose: 'braco' });
    pessoa(g, 405, 400, 0.95, r, { crianca: true });
    pessoa(g, 705, 430, 0.95, r, { crianca: true });
    for (let i = 0; i < 6; i++) pessoa(g, 110 + i * (i < 3 ? 70 : 0) + (i >= 3 ? 860 + (i - 3) * 90 : 0), 720, 1, r, { crianca: i % 2 === 0 });
  },
  'familias-1'(g, r) { // grupo de convivência
    parede(g, '#eef0e8', '#c9c2ae');
    janela(g, 120, 100, 200, 170); janela(g, 880, 100, 200, 170);
    rr(g, 450, 90, 300, 190, 8, '#ffffff'); g.fillStyle = '#6250d6'; g.font = 'bold 34px system-ui, sans-serif'; g.fillText('Roda de', 520, 170); g.fillText('conversa', 510, 220);
    g.fillStyle = 'rgba(98,80,214,.12)'; g.beginPath(); g.ellipse(600, 660, 470, 70, 0, 0, Math.PI * 2); g.fill();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const ang = Math.PI * (0.15 + 0.7 * i / (n - 1));
      const x = 600 - Math.cos(ang) * 420, y = 690 - Math.sin(ang) * 40;
      pessoa(g, x, y, 1.05, r, { pose: i === 3 ? 'braco' : 'sentada', crianca: i === 5 });
    }
    arvore(g, 1150, 720, 0.5, '#3a9b52');
  },
  'familias-2'(g, r) { // entrega de cestas
    parede(g, '#f1ece2', '#cbbd9f');
    rr(g, 70, 90, 360, 120, 8, '#6250d6'); g.fillStyle = '#ffffff'; g.font = 'bold 34px system-ui, sans-serif'; g.fillText('Rede de Apoio', 110, 165);
    rr(g, 120, 470, 960, 30, 8, '#9a6a3c'); rr(g, 140, 500, 920, 160, 6, '#7a5432');
    for (let i = 0; i < 6; i++) {
      const x = 160 + i * 150;
      rr(g, x, 380, 120, 92, 6, '#c8a46a'); rr(g, x, 380, 120, 16, 4, '#a8834f');
      for (let k = 0; k < 4; k++) circ(g, x + 22 + k * 26, 376, 14, ['#e34948', '#eda100', '#1baf7a', '#eb6834'][(k + i) % 4]);
      rr(g, x + 48, 350, 16, 30, 4, '#ffffff');
    }
    pessoa(g, 330, 700, 1.15, r, { item: (x, y) => rr(g, x - 6, y - 36, 70, 54, 6, '#c8a46a') });
    pessoa(g, 560, 700, 0.85, r, { crianca: true });
    pessoa(g, 780, 700, 1.15, r, { camisa: '#6250d6', pose: 'braco' });
    pessoa(g, 980, 700, 1.1, r);
  },
};

export const CENAS_DISPONIVEIS = Object.keys(CENAS);

/** Desenha a cena e devolve um PNG. A faixa inferior diz que é ilustração. */
export async function ilustracao(cena, legenda, semente = 1) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  CENAS[cena](g, rng(semente));
  // vinheta suave para dar profundidade
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,20,40,.18)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(15,32,58,.8)'; g.fillRect(0, H - 54, W, 54);
  g.fillStyle = '#ffffff'; g.font = '600 24px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(legenda, 26, H - 19);
  g.fillStyle = '#ffd765'; g.font = 'bold 15px system-ui, sans-serif'; g.textAlign = 'right'; g.fillText('IMAGEM ILUSTRATIVA — EXEMPLO', W - 26, H - 21);
  return new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.86));
}
