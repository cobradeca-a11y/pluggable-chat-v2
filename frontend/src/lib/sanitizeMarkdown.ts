export function sanitizeMarkdown(text: string): string {
  if (!text) return text;

  // Separar o texto em blocos de código e não-código para não interferir em trechos como `if (a || b)`
  const tokens: { type: 'code' | 'text', content: string }[] = [];
  
  // O regex captura blocos de código ```...``` e código inline `...`
  const regex = /(```[\s\S]*?```|`[^`]+`)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    tokens.push({ type: 'code', content: match[0] });
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.substring(lastIndex) });
  }

  let boldCount = 0;

  for (const token of tokens) {
    if (token.type === 'text') {
      // Conta as ocorrências de **
      const matches = token.content.match(/\*\*/g);
      if (matches) {
        boldCount += matches.length;
      }

      // Corrige pipes duplicados apenas em contextos de tabela
      const lines = token.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        if (line.includes('|')) {
          // Substitui || no início da linha (ignorando espaços)
          line = line.replace(/^([ \t]*)\|\|/, '$1|');
          // Substitui || no fim da linha (ignorando espaços)
          line = line.replace(/\|\|([ \t]*)$/, '|$1');
          
          // Se for o separador da tabela (ex: |---|---|)
          if (/^[ \t]*\|?[\- \t|]+\|?[ \t]*$/.test(line)) {
              line = line.replace(/\|\|/g, '|');
          } else {
              // Se a linha começa e termina com |, é seguro assumir que é uma linha de tabela
              if (/^[ \t]*\|.*\|[ \t]*$/.test(line)) {
                  line = line.replace(/\|\|/g, '|');
              }
          }
          lines[i] = line;
        }
      }
      token.content = lines.join('\n');
    }
  }

  let sanitized = tokens.map(t => t.content).join('');

  // Balanceia ** órfãos
  if (boldCount % 2 !== 0) {
    sanitized += '**';
  }

  return sanitized;
}
