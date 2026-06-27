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

├── backend/

│   ├── .env.example                 ← variáveis de ambiente

│   ├── requirements.txt

│   ├── railway.toml                 ← config de deploy Railway

│   ├── main.py                      ← entrypoint uvicorn + CORS

│   ├── core/

│   │   ├── protocol.py              ← contrato LLMProvider (Protocol) — IMUTÁVEL

│   │   ├── registry.py              ← registry central de plugins — IMUTÁVEL

│   │   └── loader.py                ← auto-discovery de plugins — IMUTÁVEL

│   ├── plugins/

│   │   ├── providers/               ← um arquivo = um provedor de LLM

│   │   │   ├── openrouter.py        ← OpenRouter (padrão em produção)

│   │   │   ├── ollama.py            ← Ollama (local, sem API key)

│   │   │   └── mock.py              ← Mock determinístico para testes

│   │   ├── middleware/              ← um arquivo = um middleware

│   │   │   ├── rate_limit.py        ← limite de requisições por IP

│   │   │   └── request_logger.py    ← log estruturado de cada request

│   │   └── tools/                   ← ferramentas futuras da IA

│   │       └── .gitkeep

│   └── app/

│       ├── config.py                ← settings via pydantic-settings

│       ├── schemas/

│       │   └── chat.py              ← ChatRequest, ChatResponse, Message

│       └── routers/

│           └── chat.py              ← POST /api/chat, POST /api/chat/stream

└── frontend/

    ├── .env.local.example

    ├── package.json

    ├── src/

    │   ├── app/

    │   │   ├── layout.tsx

    │   │   ├── page.tsx             ← UI principal + layout com sidebar

    │   │   └── globals.css

    │   ├── components/

    │   │   ├── Sidebar.tsx          ← lista de conversas com busca, rename, export, delete

    │   │   ├── ChatInput.tsx

    │   │   ├── MessageBubble.tsx

    │   │   ├── SettingsModal.tsx

    │   │   ├── Toast.tsx

    │   │   └── TypingIndicator.tsx

    │   ├── hooks/

    │   │   ├── useChat.ts           ← estado + streaming + chamada à API + memória (MEMORY_WINDOW=20)

    │   │   ├── useConversations.ts  ← gerencia histórico no localStorage

    │   │   ├── useActiveModel.ts    ← provider/model ativo + supported_attachments

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

# Listar plugins carregados:
curl http://localhost:8000/api/plugins

# Testar chat (sem frontend):
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Olá!"}]}'
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
| `LLM_PROVIDER` | `mock` | Provedor ativo. Opções: `openrouter`, `ollama`, `mock` |
| `OPENROUTER_API_KEY` | — | Obrigatório se `LLM_PROVIDER=openrouter` |
| `OPENROUTER_MODEL` | `openrouter/auto:free` | Modelo do OpenRouter |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL do Ollama local |
| `OLLAMA_MODEL` | `llama3.2` | Modelo do Ollama |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | Origem CORS do frontend — em produção: `https://pluggable-chat-v2.vercel.app` |
| `ACTIVE_MIDDLEWARE` | `rate_limit,request_logger` | Middleware ativos (separados por vírgula) |
| `RATE_LIMIT_RPM` | `30` | Requisições por minuto por IP |

---

## Variáveis de ambiente (frontend)

| Variável | Padrão | Descrição |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL do backend FastAPI |

---

## Contratos que nunca devem ser quebrados

1. **`core/protocol.py` é imutável.** Nunca modifique a assinatura de `LLMProvider`.
   Adicionar métodos opcionais é permitido com `NotImplementedError` como default.

2. **Plugins nunca importam uns aos outros.** Cada plugin é independente.
   Dependências compartilhadas vão em `core/`.

3. **A chave de API nunca vai ao frontend.** Toda chamada ao provedor passa pelo backend.

4. **O sistema deve iniciar mesmo sem `.env`.** Use `mock` como provider fallback
   para que o projeto rode em testes sem nenhuma configuração.

5. **Todo plugin deve implementar `health() -> bool`.** O endpoint `/api/plugins`
   mostra o status de cada plugin em tempo real.

6. **`NEXT_PUBLIC_API_URL` nunca deve ser hardcoded no código.**
   Toda referência à URL do backend usa `process.env.NEXT_PUBLIC_API_URL`.

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

---

## Provedores disponíveis

| ID | Arquivo | Requer | Gratuito |
|---|---|---|---|
| `openrouter` | `plugins/providers/openrouter.py` | `OPENROUTER_API_KEY` | Sim (tier free) |
| `ollama` | `plugins/providers/ollama.py` | Ollama rodando localmente | Sim (100%) |
| `mock` | `plugins/providers/mock.py` | Nada | Sim |
| `flux` | `plugins/providers/flux.py` | Nada (Mock local) | Sim |
| `kling` | `plugins/providers/kling.py` | Nada (Mock local) | Sim |
| `claude` | `plugins/providers/claude.py` | `CLAUDE_API_KEY` | Não |
| `gpt4o` | `plugins/providers/gpt4o.py` | `OPENAI_API_KEY` | Não |

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
| Sidebar com histórico | ✅ Implementado | `SPEC_sidebar_conversas.md` |
| Indicador de modelo no rodapé | ✅ Implementado | — |
| Memória de conversas | ✅ Implementado | `SPEC_sprint_S1.md` |
| Upload de imagens | ✅ Implementado | `SPEC_sprint_S1.md` |
| Renomear conversa | ✅ Implementado | `SPEC_sprint_S1.md` |
| Exportar conversa | ✅ Implementado | `SPEC_sprint_S1.md` |
| Busca no histórico | ✅ Implementado | `SPEC_sprint_S1.md` |
| Atalhos de teclado | ✅ Implementado | `SPEC_sprint_S1.md` |
| Suporte a Imagem (Flux mock) | ✅ Implementado | `SPEC_sprint_S2_multimodal.md` |
| Suporte a Vídeo (Kling mock) | ✅ Implementado | `SPEC_sprint_S2_multimodal.md` |

Status: **S2 COMPLETA** | Backlog restante bloqueado

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
- **Autenticação** — login simples (magic link ou OAuth) para separar histórico por usuário
- **Histórico no servidor** — mover conversas do localStorage para banco de dados (Supabase/PostgreSQL)
- **Provider: Gemini** — plugin `gemini.py` via Google AI Studio
- **Provider: Azure OpenAI** — plugin `azure_openai.py`
- **Ferramenta: web search** — plugin em `tools/` que injeta resultados de busca no contexto
- **Ferramenta: RAG simples** — upload de documentos, embeddings, busca semântica antes de responder
- **Streaming com cancelamento real** — backend cancela a requisição ao provider quando o usuário clica "parar"
- **Rate limit por usuário** — quando autenticação estiver implementada
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
