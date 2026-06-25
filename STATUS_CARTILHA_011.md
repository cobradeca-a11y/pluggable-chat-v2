# STATUS CARTILHA: TASK_011 (Persistência no localStorage)

## O que foi feito
O chat passou a contar com memória local, de forma que as interações não sejam perdidas caso o usuário feche a aba ou recarregue a página, conferindo estabilidade à UX.

Arquivos modificados:
1. `hooks/useChat.ts`:
   - Adicionada constante `CHAT_STORAGE_KEY` e `TTL_MS` (7 dias).
   - Implementado um estado auxiliar `isInitialized` para indicar que a carga inicial já ocorreu, evitando sobreposição indevida do array vazio inicial do React sobre o array salvo do client.
   - Criado `useEffect` primário para checar a chave `pluggable_chat_history`. Se houver dados, decodifica o JSON, verifica a idade (`timestamp`). Se passar de 7 dias, exclui; caso contrário, joga as mensagens na tela.
   - Criado `useEffect` secundário para salvar o estado `messages` sempre que houver mutação (e se já tiver sido inicializado), embutindo o `timestamp` dinâmico do `Date.now()`.
   - Adicionada a função exposta `clearChat()`.
2. `app/page.tsx`:
   - Desestruturada a função `clearChat` a partir do `useChat`.
   - Adicionado um botão interativo na barra superior de título (**Novo Chat**), ao lado do indicador de "Online". Ele possui um ícone de "+" moderno e é condicional: só aparece quando há histórico (tamanho de `messages` > 0).

## Validações
- [x] Build da aplicação frontend: **PASS** (`npm run build` compilou de forma otimizada em ~1.8s).
- [x] Checagem de tipos TypeScript: **PASS** (`npx tsc --noEmit`).

## Screenshots Mentais
- **Carregamento Inicial**: Ao dar F5, o React carrega primeiro uma tela vazia bem rapida (para match com o server SSR), e o useEffect puxa os dados do localStorage restaurando a conversa como estava. Não há warning de "Hydration Mismatch".
- **Botão Novo Chat**: Posicionado no lado superior direito, na altura do header. É renderizado num container `flex gap-2`. Quando apertado, toda a timeline zera imediatamente e o campo de input ganha foco ou fica pronto para uso, excluindo o estado no localStorage simultaneamente.
- **Expiração (TTL)**: Um usuário inativo que logue 8 dias após enviar uma mensagem terá sua sessão descartada pelo comparador silencioso, iniciando com o layout de boas vindas ("Como posso ajudar?").

## Próximo Passo
Aguardando revisão do PM. O próximo passo é iniciar a **TASK_012: Seletor de Provider + Configurações**, visando plugar nativamente a UI às opções abertas do backend (Mock, OpenRouter, Ollama).
