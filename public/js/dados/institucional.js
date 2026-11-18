// Quadro institucional do Instituto CRV Minas: o texto do documento "QUADRO INSTITUCIONAL" (Word, nov/2026),
// sem mudar uma palavra (só "adolescents" virou "adolescentes"). A página paginas/institucional.js
// apresenta isto; os números que aparecem ao lado vêm da base publicada do portal, nunca daqui.

export const INSTITUTO = { nome: 'Instituto CRV Minas', lema: 'Transformando vidas' };

/** Propósito, missão e visão, na ordem em que se leem: por que existimos, o que fazemos, aonde vamos. */
export const PILARES = [
  { k: 'proposito', titulo: 'Propósito', pergunta: 'Por que existimos',
    texto: 'Transformar vidas, despertar potencialidades e construir oportunidades para um futuro melhor.',
    destaques: ['Transformar vidas', 'despertar potencialidades', 'construir oportunidades'] },
  { k: 'missao', titulo: 'Missão', pergunta: 'O que fazemos',
    texto: 'Promover a transformação social por meio de projetos educacionais, culturais, esportivos e de qualificação profissional, oferecendo oportunidades e contribuindo para o desenvolvimento de crianças, adolescentes e adultos.',
    destaques: ['transformação social', 'educacionais, culturais, esportivos e de qualificação profissional'] },
  { k: 'visao', titulo: 'Visão', pergunta: 'Aonde vamos',
    texto: 'Ser referência em responsabilidade social e desenvolvimento humano, gerando impacto positivo e duradouro nas comunidades do entorno.',
    destaques: ['referência em responsabilidade social e desenvolvimento humano', 'impacto positivo e duradouro'] },
];

/**
 * Atuação. O primeiro item do quadro é o público (fica no centro); os outros são as áreas. `areasPortal` liga
 * cada área do quadro às áreas de atuação cadastradas nos projetos (dados/esquema.js, AREAS): no portal,
 * Cultura e Esporte são uma área só.
 */
export const PUBLICO = 'Crianças, adolescentes e adultos';
export const ATUACAO = [
  { k: 'educacao', titulo: 'Educação', areasPortal: ['Educação'] },
  { k: 'cultura', titulo: 'Cultura', areasPortal: ['Cultura e esporte'] },
  { k: 'esporte', titulo: 'Esporte', areasPortal: ['Cultura e esporte'] },
  { k: 'meio-ambiente', titulo: 'Meio ambiente', areasPortal: ['Meio ambiente'] },
];

export const VALORES = [
  'Ética e transparência',
  'Educação e desenvolvimento',
  'Responsabilidade social',
  'Solidariedade',
  'Respeito e valorização humana',
  'Sustentabilidade',
  'Inclusão e igualdade',
  'Compromisso com a transformação social',
];
