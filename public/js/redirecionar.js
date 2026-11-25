// O sistema (portal de transparência) mudou de index.html para portal.html quando
// o site institucional virou a página de entrada. Endereços antigos com rota do
// portal — "…/#/projetos", o QR Code do pôster "…/#/institucional" — seguem para o
// sistema antes de o site desenhar. Âncoras do próprio site ("#quem-somos") ficam.
// Script clássico e síncrono no <head>: roda antes de qualquer coisa aparecer.
if (/^#\//.test(location.hash)) location.replace('portal.html' + location.hash);
