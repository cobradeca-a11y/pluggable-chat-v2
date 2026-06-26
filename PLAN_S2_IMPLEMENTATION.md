# PLAN_S2_IMPLEMENTATION.md — Suporte a Imagem e Vídeo

## 1. Estratégia e Arquitetura

O sistema passará a suportar roteamento multimodal através de novos endpoints específicos (`/api/generate/image` e `/api/generate/video`), preservando a rotação de chat e streaming de texto original (`/api/chat`).

Como o arquivo `protocol.py` é o contrato principal, a extensão se dará via métodos opcionais. Isso garante 100% de compatibilidade reversa com os plugins `openrouter.py`, `ollama.py` e `mock.py`, sem que precisem ser alterados.

### Diagrama de Fluxo Multimodal

```text
[ Frontend (Next.js) ]
  |-- Chat Input (Modos: Texto | Imagem | Vídeo)
  |
  +-- (Texto) ----> POST /api/chat (ou /stream)
  |
  +-- (Imagem) ---> POST /api/generate/image
  |
  +-- (Vídeo) ----> POST /api/generate/video ---> [Retorna job_id]
                    GET /api/generate/video/{id} (Polling a cada 3s)

[ Backend (FastAPI) ]
  |-- core/protocol.py (Imutável, mas extensível com default Raise)
  |
  +-- Registry carrega o provider ativo (ex: Flux)
  |
  +-- Se provider não implementa o método (ex: gerar imagem em Ollama) -> Retorna HTTP 400/405 de forma amigável.

[ Plugins / Providers ]
  |-- openrouter.py (Mantém-se text-only)
  |-- flux.py       (Image-only: implementa generate_image, raise text)
  |-- kling.py      (Video-only: implementa generate_video e status)
```

---

## 2. Ordem de Implementação (Menor Risco Primeiro)

1. **Protocolo e Schemas (Base)**
   - Adição dos métodos ao `protocol.py` (`NotImplementedError` por padrão).
   - Atualização de `ChatResponse` no `schemas/chat.py` para suportar campo `type`.
2. **Backend: Geração de Imagem**
   - Novo router/endpoint `POST /api/generate/image`.
   - Criação do plugin de teste/real (`flux.py` ou mock de imagem).
3. **Frontend: UI para Imagem**
   - Criação de `MessageBubbleImage.tsx`.
   - Adaptação do `ChatInput` para acionar a rota de imagem se o Provider suportar.
4. **Backend: Geração de Vídeo**
   - Rota de job assíncrona (`POST /api/generate/video`) e rota de status (`GET /api/generate/video/{job_id}`).
   - Plugin de vídeo (ex: Gen-3 ou mock).
5. **Frontend: UI para Vídeo (Polling)**
   - Hook `useVideoGeneration.ts` e componente `MessageBubbleVideo.tsx`.
   - Polling com timeout (ex: 10 minutos) e feedback visual de progresso ("Gerando vídeo... 2m30s restante" ou spinner com cancelar).
6. **Frontend: Atualização do `SettingsModal.tsx`**
   - Adição das categorias (Texto, Imagem, Vídeo) baseadas na introspecção dos métodos implementados nos plugins via `GET /api/plugins`.
   - O endpoint `/api/plugins` passará a retornar flags explícitas para cada modalidade suportada pelo provider:
     `{"name": "flux", "can_text": false, "can_image": true, "can_video": false}`

---

## 3. Arquivos Modificados e Novos

### [MODIFICADOS]
- `backend/core/protocol.py`: Adição de `generate_image`, `generate_video` e `check_video_status`.
- `backend/app/schemas/chat.py`: `ChatResponse` com `type: Literal["text", "image_url", "image_base64"]`.
- `backend/app/routers/chat.py`: Inclusão de tratamento de erros para providers que não suportam as operações textuais.
- `frontend/src/components/MessageBubble.tsx`: Roteamento interno para renderizar imagem/vídeo ou texto dependendo do `message.type`.
- `frontend/src/components/ChatInput.tsx`: Modo de envio multimodal e seletor.
- `frontend/src/components/SettingsModal.tsx`: Agrupamento de providers por tipo.

### [NOVOS]
- `backend/app/routers/generate.py` (ou inclusão direta no router de chat).
- `backend/plugins/providers/flux.py` (Imagem via fal.ai ou outro).
- `backend/plugins/providers/kling.py` (Vídeo).
- `frontend/src/components/MessageBubbleImage.tsx`.
- `frontend/src/components/MessageBubbleVideo.tsx`.
- `frontend/src/hooks/useVideoGeneration.ts`.

---

## 4. Validações Esperadas

1. **Testes Unitários:** O mock provider atual (`mock.py`) não deve falhar em nenhum teste existente, visto que herda o fallback de `NotImplementedError`.
2. **Pipelines:**
   - Backend: `pytest backend/tests/ -v`, `ruff check backend/`, `mypy backend/ --ignore-missing-imports`.
   - Frontend: `cd frontend && npm run build`, `cd frontend && npx tsc --noEmit`.
3. **Teste Manual de Regressão:** Realizar streaming de texto com o OpenRouter para validar que não foi quebrado.

---

## 5. Riscos Conhecidos e Mitigação

- **Risco 1:** Falha de introspecção no Frontend sobre o que o provider suporta.
  **Mitigação:** O endpoint de `health` ou de `/api/plugins` precisa retornar flags adicionais do plugin (ex: `can_generate_image`, `can_generate_video`). Isso precisa ser mapeado usando `hasattr` ou tentativa de invocação no backend.
- **Risco 2:** Loop infinito de Polling no Frontend para geração de vídeo.
  **Mitigação:** Adicionar timeout hard-coded de 10 minutos (ex. max 200 polls) no `useVideoGeneration.ts` e tratar explicitamente o status `"error"`.
- **Risco 3:** Interface congestionada e suja se providers não suportarem operações conjuntas.
  **Mitigação:** `ChatInput` vai desabilitar visualmente anexo de imagem caso o modelo seja exclusivo para texto, ou desabilitar texto se o modelo for apenas para mídia (embora prompts textuais precisem existir em geração de imagem).

> **Bloqueio S2:** Estou aguardando aprovação deste plano antes de editar código (especialmente `protocol.py`).
