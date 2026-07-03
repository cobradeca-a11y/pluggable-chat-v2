import { Attachment } from './types';

const IMAGE_KEYWORDS = [
  'gere uma imagem', 'gerar uma imagem', 'crie uma imagem', 'criar uma imagem',
  'desenhe', 'desenhar', 'pinte', 'pintar', 'ilustre', 'ilustrar',
  'faça uma imagem', 'uma foto de', 'imagem de', 'foto de', 'desenho de',
  'gere uma variação'
];

const VIDEO_KEYWORDS = [
  'gere um vídeo', 'gerar um vídeo', 'crie um vídeo', 'criar um vídeo',
  'anime', 'animar', 'faça um vídeo', 'um vídeo de', 'vídeo de', 'animação de'
];

export function detectMode(text: string, attachment: Attachment | null): 'text' | 'image' | 'video' {
  // 1. Se há anexo, a prioridade é o que o anexo dita, a menos que o texto explicitamente peça uma geração baseada nele
  if (attachment) {
    if (attachment.type.startsWith('video/')) return 'video';
    
    // Para imagens anexadas, normalmente o usuário quer fazer perguntas SOBRE a imagem (modo texto).
    // Mas se ele usar uma keyword de vídeo (ex: "anime essa imagem"), muda pra vídeo.
    const lowerText = text.toLowerCase();
    for (const kw of VIDEO_KEYWORDS) {
      if (lowerText.includes(kw)) return 'video';
    }
    // Se usar keyword de imagem (ex: "faça uma variação desta imagem"), muda pra imagem.
    for (const kw of IMAGE_KEYWORDS) {
      if (lowerText.includes(kw)) return 'image';
    }
    
    // Fallback pra anexo de imagem: modo texto (visão computacional / perguntas sobre a imagem)
    return 'text';
  }

  // 2. Se não há anexo, busca keywords no texto
  const lowerText = text.toLowerCase();
  
  for (const kw of VIDEO_KEYWORDS) {
    if (lowerText.includes(kw)) return 'video';
  }
  
  for (const kw of IMAGE_KEYWORDS) {
    if (lowerText.includes(kw)) return 'image';
  }

  // 3. Fallback padrão
  return 'text';
}
