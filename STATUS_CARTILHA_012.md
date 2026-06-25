# STATUS CARTILHA: TASK_012 (Seletor de Provider + Configurações)

## O que foi feito
A aplicação agora permite alternar dinamicamente o modelo e provedor (Mock, OpenRouter, Ollama) de Inteligência Artificial pela interface (UI), sem a necessidade de reconfigurar o Backend via `.env` ou reiniciá-lo.

Arquivos modificados/criados:
1. `backend/app/schemas/chat.py`:
   - Adicionadas propriedades opcionais ao `ChatRequest` (`provider`, `model`, `api_key`), permitindo que a interface envie preferências sem quebrar a assinatura original exigida pelo `protocol.py`.
2. `backend/app/routers/chat.py`:
   - Atualizado `_get_active_provider(request)` para escutar os parâmetros do request antes de instanciar a classe correspondente.
   - Utilizada injeção dinâmica segura (via `hasattr` e `setattr`) nas instâncias dos provedores (ex: `OpenRouterProvider`), sobrescrevendo `model`, `api_key` e manipulando os headers para incluir o `Bearer {api_key}` sem violar o isolamento do core.
3. `frontend/src/lib/types.ts`:
   - Refletiu a atualização do backend com os campos opcionais em `ChatRequest`.
   - Adicionada a tipagem `ProviderSettings` para a UI.
4. `frontend/src/components/SettingsModal.tsx` **(Novo)**:
   - Componente interativo desenhado no estilo "Dark Mode Glassmorphism", contendo seletores simplificados de provedor e modelo, incluindo campo oculto (tipo password) para a API Key.
5. `frontend/src/hooks/useChat.ts`:
   - Incorporado o estado `providerSettings` e salvamento persistente `pluggable_chat_settings` via `localStorage`.
   - A requisição principal POST `/api/chat` agora injeta o payload adicional com as configurações se estiverem presentes.
6. `frontend/src/app/page.tsx`:
   - Inserido o botão interativo (ícone de engrenagem) que lança o modal.
   - Adicionado o **Badge** ao lado do botão de Novo Chat informando de forma visual o nome do provider logado ou "Padrão".

## Validações
- [x] Testes E2E e unitários (`pytest`): **PASS** (100% de sucesso).
- [x] Tipagem estática python (`mypy`): **PASS** (sem erros nos 6 arquivos checados).
- [x] Build da aplicação frontend (`npm run build`): **PASS**.
- [x] Checagem TypeScript (`tsc`): **PASS**.

## Próximo Passo
Aguardando avaliação final do PM. A base está completamente funcional. Nenhuma task remanescente sinalizada para a versão atual.
