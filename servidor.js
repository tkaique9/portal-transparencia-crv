// Servidor estático mínimo, só para desenvolvimento local.
//
// Nesta fase o portal não tem back-end: todos os dados moram no navegador
// (IndexedDB). O servidor existe porque o navegador recusa módulos ES abertos
// por file://. Ele não grava nada e só serve a pasta public/.
//
// Uso: npm start  →  http://localhost:8080   (PORT=xxxx para outra porta)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORTA = Number(process.env.PORT) || 8080;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Política de segurança: só scripts da própria origem (nenhum inline, nenhum
// CDN), documentos abertos a partir de blob: (PDF e imagens guardados no
// IndexedDB), nada de <object>/<embed> e a página não pode ser emoldurada.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

http.createServer((req, res) => {
  let rota;
  try { rota = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400); return res.end(); }
  if (rota.endsWith('/')) rota += 'index.html';
  const arquivo = path.normalize(path.join(RAIZ, rota));
  if (!arquivo.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }

  fs.readFile(arquivo, (erro, dados) => {
    if (erro) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    res.end(dados);
  });
}).listen(PORTA, () => console.log(`Portal de Transparência em http://localhost:${PORTA}`));
