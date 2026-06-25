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

---

## Estrutura de pastas

```
pluggable-chat/

├── AGENTS.md                        ← VOCÊ ESTÁ AQUI

├── backend/

│   ├── .env.example                 ← variáveis de ambiente

│   ├── requirements.txt

│   ├── main.py                      ← entrypoint uvicorn

│   ├── core/

│   │   ├── protocol.py              ← contrato LLMProvider (Protocol)

│   │   ├── registry.py              ← registry central de plugins

│   │   └── loader.py                ← auto-discovery de plugins

│   ├── plugins/

│   │   ├── providers/               ← um arquivo = um provedor de LLM

│   │   │   ├── openrouter.py        ← OpenRouter (padrão)

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

    │   │   ├── page.tsx             ← UI principal

    │   │   └── globals.css

    │   ├── components/

    │   │   ├── MessageBubble.tsx

    │   │   ├── ChatInput.tsx

    │   │   └── MarkdownRenderer.tsx

    │   ├── hooks/

    │   │   └── useChat.ts           ← estado + streaming

    │   └── lib/

    │       ├── types.ts

    │       └── api.ts               ← chama o backend FastAPI

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

curl http://localhost:8000/api/chat/health

# Listar plugins carregados:

curl http://localhost:8000/api/plugins

# Testar chat (sem frontend):

curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Olá!"}]}'
```

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
from core.protocol import LLMProvider, Message

from core.registry import register_provider

from typing import AsyncIterator

@register_provider("meu-provedor")

class MeuProvedor(LLMProvider):

    async def complete(self, messages: list[Message]) -> str:

        return "resposta aqui"

    async def stream(self, messages: list[Message]) -> AsyncIterator[str]:

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

| `LLM_PROVIDER` | `openrouter` | Provedor ativo. Opções: `openrouter`, `ollama`, `mock` |

| `OPENROUTER_API_KEY` | — | Obrigatório se `LLM_PROVIDER=openrouter` |

| `OPENROUTER_MODEL` | `openrouter/auto:free` | Modelo do OpenRouter |

| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL do Ollama local |

| `OLLAMA_MODEL` | `llama3.2` | Modelo do Ollama |

| `ALLOWED_ORIGIN` | `http://localhost:3000` | Origem CORS do frontend |

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

---

## Provedores disponíveis

| ID | Arquivo | Requer | Gratuito |

|---|---|---|---|

| `openrouter` | `plugins/providers/openrouter.py` | `OPENROUTER_API_KEY` | Sim (tier free) |

| `ollama` | `plugins/providers/ollama.py` | Ollama rodando localmente | Sim (100%) |

| `mock` | `plugins/providers/mock.py` | Nada | Sim |

---

## Middleware disponíveis

| ID | Arquivo | Função |

|---|---|---|

| `rate_limit` | `plugins/middleware/rate_limit.py` | Limita req/min por IP |

| `request_logger` | `plugins/middleware/request_logger.py` | Loga cada request com duração |

---

## Regras para agentes de IA operando este projeto

- **Nunca modifique** `core/protocol.py`, `core/registry.py`, `core/loader.py`

  sem aprovação explícita. Esses arquivos são a fundação do sistema.

- **Sempre rode** os comandos de validação após qualquer modificação.

- **Ao criar um plugin**, siga o template da seção "Como adicionar" acima.

- **Ao reportar erro**, inclua: qual provider está ativo, o traceback completo,

  e o output de `curl http://localhost:8000/api/plugins`.

- **Nunca hardcode** API keys. Use sempre variáveis de ambiente via `settings`.

- **Testes primeiro**: se a tarefa é adicionar funcionalidade, crie o teste antes.
