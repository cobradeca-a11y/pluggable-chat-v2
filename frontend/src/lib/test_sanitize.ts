import { sanitizeMarkdown } from './sanitizeMarkdown';

function runTests() {
  const tests = [
    {
      name: "1. Órfão no meio de um texto longo com várias frases depois",
      input: "Este é um texto normal. E aqui temos um **órfão perdido que estraga tudo. A vida continua normal.",
      expected: "Este é um texto normal. E aqui temos um órfão perdido que estraga tudo. A vida continua normal.",
    },
    {
      name: "2. Múltiplos pares válidos ao redor de um único órfão (remove o último)",
      input: "**Primeiro par**. E aí um **órfão. E depois o **segundo par**.",
      expected: "**Primeiro par**. E aí um **órfão. E depois o **segundo par.", 
      // Nota: Remover o último desfaz o par final, mas impede o vazamento até o fim. É a solução mais segura sem um AST completo.
    },
    {
      name: "3. Código e tabelas continuam intactos",
      input: "Tabela:\n| Col A || Col B |\n|---|---|\n| a || b |\n\nCódigo: `**não afeta**`",
      expected: "Tabela:\n| Col A | Col B |\n|---|---|\n| a | b |\n\nCódigo: `**não afeta**`"
    }
  ];

  let passed = 0;
  tests.forEach((t, i) => {
    const res = sanitizeMarkdown(t.input);
    if (res === t.expected) {
      console.log(`✅ Teste ${i+1} (${t.name}) PASSOU`);
      passed++;
    } else {
      console.error(`❌ Teste ${i+1} (${t.name}) FALHOU`);
      console.error(`  Esperado: ${t.expected}`);
      console.error(`  Recebido: ${res}`);
    }
  });
  console.log(`${passed}/${tests.length} testes passaram.`);
}

runTests();
