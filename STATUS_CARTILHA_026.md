# Status Cartilha 026 — Painel Dedicado de Personas na Sidebar (TASK_013)

## O que foi feito
Adicionei a capacidade de gerenciar e selecionar **Personas** diretamente a partir de um novo painel lateral (Sidebar), em vez de limitar a experiência de Personas a um simples *dropdown* na parte inferior do chat. Isso foi feito reaproveitando inteiramente a inteligência (API e estado local) que já residia no sistema.

## Como foi implementado
1. **Frontend - UI da Sidebar (`Sidebar.tsx`)**:
   - Dividi a Sidebar existente em um sistema de abas (*Tabs*): **Conversas** e **Personas**.
   - A aba "Conversas" preserva 100% da funcionalidade de histórico (buscar, excluir, renomear, nova conversa).
   - A aba "Personas" consome o estado global através de `personasHook` (injetado via `page.tsx`). Nela, o usuário visualiza uma lista com todas as suas Personas cadastradas.
   - Cada Persona exibe o seu nome e um *preview* de 2 linhas do seu `system_prompt`, além de um botão claro para exclusão.
   - Um botão verde "+ Nova" permite criar novas personas pelo painel nativamente — que agora reaproveita toda a lógica do modal gerador de Personas via Inteligência Artificial que já tínhamos, totalmente integrado na interface com desfoque e foco adequado.

2. **Frontend - Componentes Auxiliares**:
   - `page.tsx` foi atualizado para passar o `personasHook` (do `useChat() -> usePersonas`) de forma reativa para a `Sidebar`.
   - `ChatInput.tsx` teve as suas props ajustadas, mas mantive a injeção do componente `PersonaSelector.tsx` no rodapé, garantindo que tudo opere sob a mesma "Single Source of Truth".

## Decisões de UX e Recomendações
Como instruído, **não** removi o dropdown original da área do chat (rodapé). No entanto, noto que o painel lateral é consideravelmente superior em experiência (permite ver os prompts e excluir de forma mais visual). O dropdown inferior agora atua primariamente como um mero atalho de troca rápida. 

**Sugestão:** Podemos remover a opção de *criar nova persona* pelo dropdown e deixá-lo exclusivo para apenas *trocar* entre as personas existentes. A aba lateral ficaria sendo o verdadeiro "Gerenciador de Personas". Mas, por enquanto, tudo coexiste e funciona perfeitamente bem, pois ambos usam o mesmo estado central.
