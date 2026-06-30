# AGENTS.md — Pluggable Chat

> Leia este arquivo inteiro antes de qualquer ação.
> Ele é o contrato de operação deste projeto para agentes humanos e de IA.

---

## O que é este projeto

Interface de chat com IA de arquitetura **plug and play**.

Trocar de provedor de LLM, adicionar ferramentas, ou mudar middleware
exige apenas criar um arquivo novo e definir uma variável de ambiente.
Nenhum arquivo existente precisa ser modificado.

Stack:

- **Backend:** Python 3.11+ · FastAPI · httpx (async) · Pydantic v2
- **Frontend:** Next.js 15 · React 19 · TypeScript · Tailwind CSS v4
- **Padrão de plugin:** Strategy + Registry automático por decorator
- **Deploy:** Frontend na Vercel · Backend no Railway

---

## Estrutura de pastas

```
pluggable-chat/

├── AGENTS.md                        ← VOCÊ ESTÁ AQUI
├── AGENT_HANDBOOK.md                ← guia operacional para agentes
├── AGENT_INSTRUCTION_implement_provider.md
├── PROVIDERS_CATALOG.md             ← catálogo detalhado de providers
├── LOCAL_OLLAMA_SETUP.md            ← setup Ollama local
├── OLLAMA_MODELS.md                 ← modelos disponíveis no Ollama
├── RAILWAY_ENV_SETUP.md             ← setup Railway produção
├── ROADMAP_PROVIDERS.md             ← roadmap de novos providers
├── PLAN_S2_IMPLEMENTATION.md        ← plano de implementação S2 multimodal
├── SPEC_providers_claude_gpt4o.md   ← spec dos providers Claude e GPT-4o
├── DOCUMENTATION_AUDIT.md           ← auditoria de documentação
├── SETUP_VALIDATION_REPORT.md       ← relatório de validação de setup
├── TASK_*.md                        ← tarefas operacionais (001–002)
├── STATUS_CARTILHA_*.md             ← relatórios de status (001–017)
├── AUTH_LOG.md                      ← log da Tarefa B (S4)
├── COMPLETION_REPORT.md             ← relatório final do projeto (S4)
├── DEPLOYMENT_LOG.md                ← log de deploy (Tarefa A)
├── IMPLEMENTATION_LOG.md            ← log de implementação final

├── backend/

│   ├── .env.example                 ← variáveis de ambiente
│   ├── requirements.txt
│   ├── railway.toml                 ← config de deploy Railway
│   ├── Procfile                     ← entrypoint Railway (web: uvicorn)
│   ├── main.py                      ← entrypoint uvicorn + CORS + plugin discovery

│   ├── core/
│   │   ├── protocol.py              ← contrato LLMProvider (Protocol) — IMUTÁVEL
│   │   ├── registry.py              ← registry central de plugins — IMUTÁVEL
│   │   └── loader.py                ← auto-discovery de plugins — IMUTÁVEL

│   ├── plugins/
│   │   ├── providers/               ← um arquivo = um provedor de LLM

│   │   │   ├── openrouter.py, ollama.py, ollama_cloud.py, mock.py
│   │   │   └── claude.py, gpt4o.py, gemini.py
│   │   ├── middleware/              ← um arquivo = um middleware
│   │   │   ├── rate_limit.py        ← limite de requisições por IP
│   │   │   └── request_logger.py    ← log estruturado de cada request
│   │   └── tools/                   ← ferramentas futuras da IA
│   │       └── .gitkeep

│   ├── app/
│   │   ├── config.py                ← settings via pydantic-settings
│   │   ├── schemas/
│   │   │   └── chat.py              ← ChatRequest, ChatResponse, ImageRequest
│   │   └── routers/
│   │       ├── chat.py              ← todos os endpoints de chat e geração
│   │       └── auth.py              ← endpoints de autenticação (Magic Link)

│   └── tests/
│       ├── test_setup.py            ← smoke test de imports
│       └── test_e2e.py              ← testes E2E (plugins, providers, chat, geração)

└── frontend/

    ├── .env.local.example
    ├── package.json

    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx             ← UI principal + layout com sidebar
    │   │   ├── globals.css
    │   │   └── login/
    │   │       └── page.tsx         ← UI de autenticação (Magic Link)

    │   ├── components/
    │   │   ├── Sidebar.tsx          ← lista de conversas com busca, rename, export, delete
    │   │   ├── ChatInput.tsx
    │   │   ├── MessageBubble.tsx     ← bolha de mensagem (texto + markdown)
    │   │   ├── MessageBubbleImage.tsx ← bolha para imagens geradas (DALL-E, Flux, Midjourney)
    │   │   ├── MessageBubbleVideo.tsx ← bolha para vídeos gerados (Sora, Runway, Kling)
    │   │   ├── SettingsModal.tsx
    │   │   ├── Toast.tsx
    │   │   └── TypingIndicator.tsx

    │   ├── hooks/
    │   │   ├── useAuth.ts           ← gerencia estado de login e persistência local
    │   │   ├── useChat.ts           ← estado + streaming + chamada à API + memória (MEMORY_WINDOW=20)
    │   │   ├── useConversations.ts  ← gerencia histórico no Supabase/localStorage
    │   │   ├── useActiveModel.ts    ← provider/model ativo + supported_attachments
    │   │   ├── useVideoGeneration.ts ← polling de status para geração de vídeo
    │   │   ├── useAvailableModels.ts ← busca modelos disponíveis do provedor ativo
    │   │   └── useTheme.ts          ← tema claro/escuro

    │   └── lib/
    │       ├── types.ts             ← tipos TypeScript (Message, Attachment, Conversation...)
    │       └── export.ts            ← exportAsMarkdown, exportAsJson

    └── ...config files
```

---

## Como rodar

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edite .env com sua chave
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                      # http://localhost:3000
```

### Verificar que tudo funciona

```bash
# Backend health check:
curl http://localhost:8000/api/health

# Listar plugins carregados (retorna capabilities: can_text, can_image, can_video, can_audio):
curl http://localhost:8000/api/plugins

# Testar chat (sem frontend):
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Olá!"}]}'

# Testar geração de imagem:
curl -X POST http://localhost:8000/api/generate/image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "um gato astronauta", "provider": "flux"}'
```

---

## URLs de produção

| Serviço | URL |
|---|---|
| Frontend (Vercel) | `https://pluggable-chat-v2.vercel.app` |
| Backend (Railway) | `https://pluggable-chat-v2-production.up.railway.app` |

---

## Como adicionar um novo provedor de LLM

1. Crie `backend/plugins/providers/meu_provedor.py`
2. Implemente o Protocol `LLMProvider` (veja `core/protocol.py`)
3. Decore a classe com `@register_provider("meu-provedor")`
4. No `.env`, defina `LLM_PROVIDER=meu-provedor`
5. Reinicie o backend

**Nenhum outro arquivo precisa ser modificado.**

Exemplo mínimo:

```python
from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider
from typing import AsyncIterator, List, Optional

@register_provider("meu-provedor")
class MeuProvedor(LLMProvider):
    @property
    def supported_attachments(self) -> List[str]:
        return []  # ex: ["image/png", "image/jpeg"]

    async def complete(self, messages: List[Message], attachment: Optional[Attachment] = None) -> str:
        return "resposta aqui"

    async def stream(self, messages: List[Message], attachment: Optional[Attachment] = None) -> AsyncIterator[str]:
        yield "resposta "
        yield "aqui"

    async def health(self) -> bool:
        return True

    # Para provedores de áudio/vídeo/imagem, implemente os métodos equivalentes (ex: generate_audio)
    # Todos os métodos opcionais (imagem, vídeo, áudio) levantam NotImplementedError por padrão.
```

---

## Como adicionar um novo middleware

1. Crie `backend/plugins/middleware/meu_middleware.py`
2. Exporte uma função `setup(app: FastAPI) -> None`
3. Decore com `@register_middleware("meu-middleware")`
4. No `.env`, adicione `"meu-middleware"` à lista `ACTIVE_MIDDLEWARE`

Exemplo:

```python
from fastapi import FastAPI
from core.registry import register_middleware

@register_middleware("meu-middleware")
def setup(app: FastAPI) -> None:
    @app.middleware("http")
    async def meu_middleware(request, call_next):
        # sua lógica aqui
        return await call_next(request)
```

---

## Variáveis de ambiente (backend)

| Variável | Padrão | Descrição |
|---|---|---|
| `LLM_PROVIDER` | `mock` | Provedor ativo. Qualquer ID da tabela "Provedores disponíveis" |
| `OPENROUTER_API_KEY` | — | Obrigatório se `LLM_PROVIDER=openrouter` |
| `OPENROUTER_MODEL` | `openrouter/auto:free` | Modelo do OpenRouter |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL do Ollama local |
| `OLLAMA_MODEL` | `llama3.2` | Modelo do Ollama |
| `CLAUDE_API_KEY` | — | Obrigatório se `LLM_PROVIDER=claude` |
| `CLAUDE_MODEL` | `claude-3-5-sonnet-20241022` | Modelo da Anthropic |
| `OPENAI_API_KEY` | — | Obrigatório se `LLM_PROVIDER=gpt4o` |
| `OPENAI_MODEL` | `gpt-4o` | Modelo da OpenAI |
| `GOOGLE_API_KEY` | — | Obrigatório se `LLM_PROVIDER=gemini` |
| `GOOGLE_MODEL` | `gemini-1.5-pro` | Modelo do Google Gemini |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | Origem CORS do frontend — em produção: `https://pluggable-chat-v2.vercel.app` |
| `ACTIVE_MIDDLEWARE` | `rate_limit,request_logger` | Middleware ativos (separados por vírgula) |
| `RATE_LIMIT_RPM` | `100` | Requisições por minuto por IP |
| `SUPABASE_URL` | — | URL da API do Supabase |
| `SUPABASE_KEY` | — | Chave anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Chave de serviço do Supabase |

---

## Variáveis de ambiente (frontend)

| Variável | Padrão | Descrição |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://pluggable-chat-v2-production.up.railway.app` | URL do backend FastAPI. Fallback hardcoded aponta para produção para que o deploy na Vercel funcione sem `.env.local`. Em dev local, defina `http://localhost:8000` no `.env.local`. |
| `NEXT_PUBLIC_SUPABASE_URL` | — | URL pública da API do Supabase para o cliente web. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Chave anônima (pública) do Supabase. |

---

## Contratos que nunca devem ser quebrados

1. **`core/protocol.py` é imutável.** Nunca modifique a assinatura de `LLMProvider`.
   Adicionar métodos opcionais é permitido com `NotImplementedError` como default.
   *Métodos opcionais registrados no Protocol:*
   - `generate_image(prompt: str) -> str` (retorna URL da imagem)
   - `generate_video(prompt: str) -> dict` (retorna `job_id`)
   - `check_video_status(job_id: str) -> dict` (retorna `status`, `progress`, `url`)
   - `generate_audio(prompt: str) -> dict` (retorna `job_id`)
   - `check_audio_status(job_id: str) -> dict` (retorna `status`, `url`)

2. **Plugins nunca importam uns aos outros.** Cada plugin é independente.
   Dependências compartilhadas vão em `core/`.

3. **A chave de API nunca vai ao frontend.** Toda chamada ao provedor passa pelo backend.

4. **O sistema deve iniciar mesmo sem `.env`.** Use `mock` como provider fallback
   para que o projeto rode em testes sem nenhuma configuração.

5. **Todo plugin deve implementar `health() -> bool`.** O endpoint `/api/plugins`
   mostra capabilities detalhadas (`can_text`, `can_image`, `can_video`, `can_audio`).

6. **`NEXT_PUBLIC_API_URL` deve usar `process.env.NEXT_PUBLIC_API_URL` com fallback para produção.**
   O fallback hardcoded `https://pluggable-chat-v2-production.up.railway.app` existe em 4 arquivos
   (`useChat.ts`, `useVideoGeneration.ts`, `useActiveModel.ts`, `SettingsModal.tsx`) para que o
   deploy na Vercel funcione sem configuração extra. Em dev local, use `.env.local`.

---

## Comandos de validação (rode antes de abrir PR)

```bash
# Backend — testes unitários:
pytest backend/tests/ -v

# Backend — checar tipos:
mypy backend/ --ignore-missing-imports

# Backend — linter:
ruff check backend/

# Frontend — build:
cd frontend && npm run build

# Frontend — tipos:
cd frontend && npx tsc --noEmit
```

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Health check do backend |
| `POST` | `/api/auth/send-link` | Envia o Magic Link para login |
| `POST` | `/api/auth/verify` | Verifica token e retorna sessão |
| `GET` | `/api/plugins` | Lista providers com capabilities (`can_text/image/video/audio`) |
| `GET` | `/api/plugins/{provider}/models` | Lista modelos suportados por um provedor específico |
| `POST` | `/api/chat` | Chat síncrono (retorna `ChatResponse`) |
| `POST` | `/api/chat/stream` | Chat via SSE (streaming) |
| `POST` | `/api/generate/image` | Geração de imagem (retorna URL) |
| `POST` | `/api/generate/video` | Inicia geração de vídeo (retorna `job_id`) |
| `GET` | `/api/generate/video/{job_id}` | Polling do status do vídeo |
| `POST` | `/api/generate/audio` | Inicia geração de áudio (retorna `job_id`) |
| `GET` | `/api/generate/audio/{job_id}` | Polling do status do áudio |

Schemas principais: `ChatRequest`, `ChatResponse`, `ImageRequest` (ver `app/schemas/chat.py`).

---

## Decisões de arquitetura registradas

| Data | Decisão | Motivo |
|---|---|---|
| 2026-06 | Auto-discovery por decorator, não por arquivo de config | Zero edição de arquivo central ao adicionar plugin |
| 2026-06 | httpx em vez de requests | Async nativo, connection pool, streaming |
| 2026-06 | Protocol em vez de ABC | Duck typing explícito, sem herança obrigatória |
| 2026-06 | SSE para streaming em vez de WebSocket | Mais simples, stateless, funciona com qualquer proxy |
| 2026-06 | pydantic-settings para config | Validação em startup, não em runtime |
| 2026-06 | Mock provider incluído no core | Testes sem dependência de API externa |
| 2026-06 | Frontend na Vercel, backend no Railway | Vercel é nativo Next.js; Railway suporta Python sem configuração extra |
| 2026-06 | CORS configurado via variável de ambiente `ALLOWED_ORIGIN` | Permite trocar domínio de produção sem alterar código |
| 2026-06 | Histórico de conversas em localStorage (máx 50, expiração 90 dias) | Sem backend extra, sem auth, funciona offline; limitação aceitável para uso pessoal |
| 2026-06 | `supported_attachments` como property no Protocol | Permite frontend detectar capacidades do provider sem lógica hardcoded |
| 2026-06 | Upload limitado a imagens (PNG, JPEG, WEBP) via base64 | OpenRouter suporta content blocks de imagem; PDF bloqueado com Toast até provider suportar |
| 2026-06 | MEMORY_WINDOW=20 mensagens no payload ao backend | Evita estourar contexto; histórico completo salvo no localStorage |
| 2026-06 | Exportação de conversa client-side via Blob + createObjectURL | Sem backend, sem dependência externa |
| 2026-06 | Título da conversa gerado da primeira mensagem do usuário (máx 40 chars) | Sem input manual; rename manual disponível via duplo clique na sidebar |
| 2026-06 | Suporte a áudio como capability primeira classe | Suno requer `generate_audio` + `check_audio_status` |
| 2026-06 | 6 novos provedores (Gemini, DALL-E, Sora, Runway, Midjourney, Suno) | Expandir multimodalidade |
| 2026-06 | Componentes separados por tipo de mídia (MessageBubbleImage/Video) | Isolamento de lógica de renderização por modalidade |
| 2026-06 | Polling client-side com `useVideoGeneration` hook | Timeout 10min, intervalo 3s, máx 200 polls |
| 2026-06 | `ImageRequest` schema separado de `ChatRequest` | Endpoints de geração multimodal usam prompt direto, sem histórico de mensagens |
| 2026-06 | Provider/model/api_key overrides via request body | Frontend pode selecionar provider dinamicamente sem reiniciar backend |

---

## Provedores disponíveis

| ID | Arquivo | Requer | Gratuito |
|---|---|---|---|
| `openrouter` | `plugins/providers/openrouter.py` | `OPENROUTER_API_KEY` | Sim (tier free) |
| `ollama` | `plugins/providers/ollama.py` | Ollama rodando localmente | Sim (100%) |
| `ollama-cloud`| `plugins/providers/ollama_cloud.py` | API Cloud Oficial | Sim |
| `mock` | `plugins/providers/mock.py` | Nada | Sim |
| `claude` | `plugins/providers/claude.py` | `CLAUDE_API_KEY` | Não |
| `gpt4o` | `plugins/providers/gpt4o.py` | `OPENAI_API_KEY` | Não |
| `gemini` | `plugins/providers/gemini.py` | `GOOGLE_API_KEY` | Sim (tier free) |

---

## Middleware disponíveis

| ID | Arquivo | Função |
|---|---|---|
| `rate_limit` | `plugins/middleware/rate_limit.py` | Limita req/min por IP |
| `request_logger` | `plugins/middleware/request_logger.py` | Loga cada request com duração |

---

## Status das features de UI

| Feature | Status | Spec |
|---|---|---|
| Chat com streaming SSE | ✅ Implementado | — |
| Tema claro/escuro | ✅ Implementado | — |
| Modal de configurações | ✅ Implementado | — |
| Toast de notificações | ✅ Implementado | — |
| Auto-scroll inteligente | ✅ Implementado | — |
| Sidebar com histórico | ✅ Implementado | — |
| Indicador de modelo no rodapé | ✅ Implementado | — |
| Memória de conversas | ✅ Implementado | — |
| Upload de imagens | ✅ Implementado | — |
| Renomear conversa | ✅ Implementado | — |
| Exportar conversa | ✅ Implementado | — |
| Busca no histórico | ✅ Implementado | — |
| Atalhos de teclado | ✅ Implementado | — |
| Suporte a Imagem (Flux mock) | ✅ Implementado | — |
| Suporte a Vídeo (Kling mock) | ✅ Implementado | — |
| Bolha dedicada para imagens | ✅ Implementado | `MessageBubbleImage.tsx` |
| Bolha dedicada para vídeos | ✅ Implementado | `MessageBubbleVideo.tsx` |
| Polling de vídeo com progresso | ✅ Implementado | `useVideoGeneration.ts` |
| Markdown nas respostas | ✅ Implementado | `react-markdown` + `remark-gfm` |
| Seletor dinâmico de modelos | ✅ Implementado | `/api/plugins/{provider}/models` |
| Geração de imagem (DALL-E 3, Flux, Midjourney) | ✅ Expandido | Integrado via OpenRouter |
| Geração de vídeo (Sora, Runway, Kling) | ✅ Expandido | Integrado via OpenRouter |
| Geração de áudio (Suno) | ✅ Expandido | Integrado via OpenRouter |
| Autenticação (Magic Link / Supabase) | ✅ Implementado | `useAuth.ts` |
| Histórico em Nuvem (Supabase) | ✅ Implementado | `useConversations.ts` |

Status: **S4 COMPLETA (Autenticação + Cloud Sync)** | Backlog restante bloqueado

---

## Backlog futuro (não implementar ainda)

Estas features foram identificadas como desejáveis mas **não devem ser implementadas
sem instrução explícita do dono do projeto**. Registradas aqui para não se perderem.

### Frontend
- **Busca no histórico** — implementado parcialmente (busca no conteúdo está no backlog)
- **Pré-visualização de código** — syntax highlight nos blocos de código das respostas
- **Upload de PDF** — enviar PDF junto à mensagem (suporte do provider pendente, por ora apenas imagens)
- **Modo compacto** — densidade maior de mensagens para telas menores
- **Internacionalização** — suporte a múltiplos idiomas na UI

### Backend
- **Provider: Azure OpenAI** — plugin `azure_openai.py`
- **Ferramenta: web search** — plugin em `tools/` que injeta resultados de busca no contexto
- **Ferramenta: RAG simples** — upload de documentos, embeddings, busca semântica antes de responder
- **Streaming com cancelamento real** — backend cancela a requisição ao provider quando o usuário clica "parar"
- **Rate limit por usuário** — vinculado ao user_id do Supabase
- **Logs estruturados** — integração com Sentry ou Datadog

### Infraestrutura
- **CI/CD com testes** — GitHub Actions rodando pytest e tsc antes do merge
- **Preview deploys** — Vercel já faz isso; Railway precisaria de configuração extra
- **Secrets management** — Vault ou Railway Environments para separar staging/produção
- **Monitoramento** — uptime check + alertas de erro no Railway

---

## Regras para agentes de IA operando este projeto

- **Nunca modifique** `core/protocol.py`, `core/registry.py`, `core/loader.py`
  sem aprovação explícita. Esses arquivos são a fundação do sistema.

- **Sempre rode** os comandos de validação após qualquer modificação.

- **Ao criar um plugin**, siga o template da seção "Como adicionar" acima.

- **Ao reportar erro**, inclua: qual provider está ativo, o traceback completo,
  e o output de `curl http://localhost:8000/api/plugins`.

- **Nunca hardcode** API keys, URLs de produção ou origens CORS. Use sempre
  variáveis de ambiente via `settings` (backend) ou `process.env` (frontend).

- **Testes primeiro**: se a tarefa é adicionar funcionalidade, crie o teste antes.

- **Antes de implementar qualquer feature do backlog**, confirme com o dono do projeto.
