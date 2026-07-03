# Status Cartilha 020 — Provider/modelo default pré-selecionado (TASK_007)

## O que foi investigado
Na investigação do código, não havia um "gate visual" ou modal travando o usuário explicitamente. O "bloqueio" ocorria de forma silenciosa: o hook `useChat.ts` inicializava o estado `providerSettings` vazio (`{ provider: "", model: "" }`). Com isso, a primeira mensagem era enviada sem provider especificado. O backend, não recebendo provider, caía no fallback hardcoded (`mock`), e devolvia uma resposta de teste ("I am a mock response") em vez de acionar uma IA real, o que inutilizava o primeiro uso até que o usuário manualmente fosse nas Configurações selecionar um modelo.

## O que foi alterado
1. Em `frontend/src/hooks/useChat.ts`: 
   - A inicialização do estado `providerSettings` foi alterada para `{ provider: "gemini", model: "gemini-3.5-flash" }`.
   - Na função que carrega o `localStorage`, adicionei uma verificação: se os dados salvos estiverem vazios ou incompletos (sem o campo `provider`), o hook não sobrescreve o state, mantendo o default (Gemini).
2. Não foi necessário mexer no backend (`chat.py`), pois ele já aceita e respeita o provider enviado pelo frontend.
3. Não foi necessário mexer no modal de configurações (`SettingsModal.tsx`), pois ele lê diretamente o state e já mostra o Gemini pré-selecionado na primeira abertura.

## Como testar manualmente
1. Acesse o site no navegador.
2. Abra o Console do DevTools (F12) > Application > Local Storage.
3. Exclua a chave `pluggable_chat_settings` (se existir) para simular um usuário acessando pela primeira vez.
4. Recarregue a página (F5).
5. Escreva e envie uma mensagem diretamente, sem abrir as Configurações.
6. A mensagem será processada e a resposta virá do `gemini-3.5-flash`! O rodapé acima do input também já exibirá a label `gemini · gemini-3.5-flash`.
7. Opcionalmente, abra as configurações, troque para outro (ex: `openrouter`), mande outra mensagem e recarregue a página: sua nova escolha terá sido salva normalmente.

## Testes Automatizados
Os testes E2E do backend (`pytest backend/tests/ -v`) e a checagem de tipos do frontend (`npx tsc --noEmit`) rodaram e passaram perfeitamente. Nenhuma quebra.
