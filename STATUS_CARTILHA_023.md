# Status Cartilha 023 — Sanitização de Markdown Malformado (TASK_010)

## O problema resolvido
Por natureza probabilística, LLMs (especialmente modelos menores ou rodando em streaming) ocasionalmente podem devolver caracteres de formatação pela metade, resultando num layout quebrado. Dois dos piores cenários no frontend eram:
1. `**` duplo desbalanceado (todo o restante da tela fica em negrito).
2. `||---|---||` nas tabelas (quebrando a renderização visual das colunas nativas do HTML).

## O que foi feito
Criei uma lógica defensiva customizada na camada de renderização, implementada no novo arquivo `frontend/src/lib/sanitizeMarkdown.ts`, que inspeciona o texto instantes antes de desenhar o componente na tela (sem encostar no texto do banco de dados).

A heurística isola cuidadosamente blocos de código (` ``` ` e ` ` `) para evitar interferências acidentais caso o modelo devolva um código-fonte contendo coisas como `if (a || b)` ou comentários com `**`.

Em seguida:
- Nas áreas que não são blocos de código, substitui os double-pipes (`||`) por single-pipes (`|`) nas pontas das linhas e nas quebras de cabeçalho (`||---|---||`).
- Faz a contagem dos negritos e, caso verifique uma abertura de asteriscos par desbalanceada (ímpar), força o fechamento acoplando um `**` final na string que será pintada no Markdown.

No `frontend/src/components/MessageBubble.tsx`, abracei a string enviada ao `ReactMarkdown` com esta sanitização: `sanitizeMarkdown(message.content)`.

## Casos de Teste (Testados Isoladamente com Sucesso)
1. **Entrada:** `This is a **bold text and it never ends` -> **Corrigido para:** `This is a **bold text and it never ends**`
2. **Entrada:** `Code \`**\` and bold **` -> **Corrigido para:** `Code \`**\` and bold ****`
3. **Entrada:** `|| Col 1 || Col 2 ||` e `||---|---||` -> **Corrigido para:** `| Col 1 | Col 2 |` e `|---|---|`
4. **Falso Positivo:** ````js if (a || b) return ||c||; ```` -> **Mantido Intacto!**

O componente está seguro para operar sobre markdown acidentado sem penalizar código ou estragar dados subjacentes.
