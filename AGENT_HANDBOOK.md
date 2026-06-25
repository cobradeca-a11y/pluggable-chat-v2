# 🤖 AGENT HANDBOOK — Pluggable Chat

**Para:** Agentes de IA (Gemini 3.1 ou similares)  
**Data:** 2026-06-23  
**Versão:** 1.0  

> 🎯 **Leia isto primeiro antes de qualquer task.**

---

## ⚡ 5 REGRAS DE OURO

1. **NUNCA** modifique `core/protocol.py`, `core/registry.py`, `core/loader.py`
2. **SEMPRE** pergunta o plano antes de executar
3. **SEMPRE** rode validações `mypy` + `pytest` + `ruff` antes de reportar
4. **NUNCA** hardcode API keys — sempre variáveis de ambiente
5. **SE BLOQUEAR** — não invente. Reporte ao PM imediatamente.

---

## 🔄 CICLO DE TRABALHO (READ THIS CAREFULLY)

### Fase 1: RECEBER TAREFA
- PM te envia um arquivo `.md` com `# TAREFA:`
- Você **lê inteiro** sem fazer nada ainda
- Note: escopo, deliverable, restrições

### Fase 2: DESCREVER PLANO (✋ PAUSA AQUI)
Você escreve em português/inglês:

```markdown
Entendo a tarefa. Aqui está meu plano:

1. Ler arquivo X em Y
2. Criar novo arquivo Z em W
3. Rodar validação com comando C
4. Reportar resultado em cartilha

Confirme se está tudo correto antes de eu executar.
```

**ESPERE resposta do PM ("Aprovado" ou ajuste) ANTES de prosseguir.**

### Fase 3: EXECUTAR (depois de Aprovado)
```bash
# Seu workflow:
1. Abrir terminal / rodar código
2. Testar cada passo
3. Capturar output
4. Copiar resultado final
5. VALIDAR com mypy/pytest/ruff
```

### Fase 4: REPORTAR (Cartilha de Status)
Crie arquivo `STATUS_CARTILHA_NNNN.md`:
- O que fez ✅
- Onde colocou ✅
- Validações que passaram ✅
- Bloqueadores ⚠️
- Próximo passo 🚀

---

## 📁 ESTRUTURA DO PROJETO (MEMORIZE)

```
pluggable-chat/
├── AGENTS.md                    ← Contrato do projeto
├── backend/
│   ├── .env.example             ← Variáveis esperadas
│   ├── core/                    ← 🔒 IMUTÁVEL
│   │   ├── protocol.py          ← Nunca toque
│   │   ├── registry.py          ← Nunca toque
│   │   └── loader.py            ← Nunca toque
│   ├── plugins/
│   │   ├── providers/           ← Adicionar providers aqui
│   │   │   ├── openrouter.py
│   │   │   ├── ollama.py
│   │   │   └── mock.py
│   │   ├── middleware/          ← Adicionar middleware aqui
│   │   │   ├── rate_limit.py
│   │   │   └── request_logger.py
│   │   └── tools/               ← Para futuro
│   ├── app/
│   │   ├── config.py            ← Settings (pydantic)
│   │   ├── schemas/
│   │   │   └── chat.py          ← DTOs
│   │   └── routers/
│   │       └── chat.py          ← Endpoints
│   ├── main.py                  ← Entry point
│   ├── requirements.txt
│   └── tests/                   ← Unit tests aqui
│
└── frontend/
    ├── .env.local.example
    ├── package.json
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── hooks/
    │   └── lib/
    └── (build config files)
```

**Memorize:** 
- `core/` = 🔒 imutável
- Novos providers → `plugins/providers/novo.py`
- Novos middleware → `plugins/middleware/novo.py`
- Testes → `backend/tests/`

---

## 🧪 VALIDAÇÕES QUE VOCÊ DEVE RODAR

Antes de qualquer PR ou reporte:

```bash
# Backend — tipos
mypy backend/ --ignore-missing-imports

# Backend — linter
ruff check backend/

# Backend — testes
pytest backend/tests/ -v

# Frontend — build
cd frontend && npm run build

# Frontend — tipos
cd frontend && npx tsc --noEmit

# Verificar saúde do backend
curl http://localhost:8000/api/chat/health

# Listar plugins carregados
curl http://localhost:8000/api/plugins
```

**Se QUALQUER um falhar → REPORTE NO STATUS, não ignore.**

---

## 🆕 COMO ADICIONAR UM NOVO PROVIDER

**Template que você copia:**

1. Crie arquivo: `backend/plugins/providers/seu_provedor.py`

```python
from core.protocol import LLMProvider, Message
from core.registry import register_provider
from typing import AsyncIterator

@register_provider("seu-provedor")  # ← Use este ID em .env
class SeuProvedor(LLMProvider):
    
    async def complete(self, messages: list[Message]) -> str:
        """Completar sem streaming"""
        # Sua implementação aqui
        return "resposta"
    
    async def stream(self, messages: list[Message]) -> AsyncIterator[str]:
        """Completar com streaming"""
        yield "resposta"
        yield " por partes"
    
    async def health(self) -> bool:
        """Verificar se tá funcionando"""
        return True
```

2. No `.env`, configure:
```
LLM_PROVIDER=seu-provedor
```

3. Reinicie backend:
```bash
uvicorn main:app --reload
```

4. Teste:
```bash
curl http://localhost:8000/api/plugins
```

---

## 🆕 COMO ADICIONAR UM NOVO MIDDLEWARE

**Template:**

1. Crie: `backend/plugins/middleware/seu_middleware.py`

```python
from fastapi import FastAPI
from core.registry import register_middleware

@register_middleware("seu-middleware")
def setup(app: FastAPI) -> None:
    @app.middleware("http")
    async def seu_middleware(request, call_next):
        # Sua lógica aqui
        response = await call_next(request)
        return response
```

2. No `.env`:
```
ACTIVE_MIDDLEWARE=rate_limit,request_logger,seu-middleware
```

3. Reinicie backend.

---

## ⚙️ VARIÁVEIS DE AMBIENTE QUE VOCÊ VAI USAR

### Backend (`.env`)
```
LLM_PROVIDER=mock              # Qual provider ativo
OPENROUTER_API_KEY=...        # Se usar OpenRouter
OLLAMA_BASE_URL=...           # Se usar Ollama
ALLOWED_ORIGIN=...            # CORS origin
ACTIVE_MIDDLEWARE=...         # Quais middleware rodam
RATE_LIMIT_RPM=30             # Rate limit
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Nota:** Nunca, NUNCA hardcode keys. Use sempre `.env`.

---

## 🚨 ERROS COMUNS E COMO EVITAR

| Erro | Causa | Solução |
|---|---|---|
| `ImportError: cannot import name 'LLMProvider'` | Você importou de lugar errado | Use `from core.protocol import LLMProvider` |
| `ModuleNotFoundError: No module named 'plugins'` | Faltam dependências | `pip install -r requirements.txt` |
| `KeyError: 'seu-provedor'` | Provider não foi registrado | Verificar se tem `@register_provider("seu-provedor")` |
| `CORS error no frontend` | CORS origin errado | Verificar `ALLOWED_ORIGIN=http://localhost:3000` |
| `TypeError: async generator expected` | `stream()` não usa `yield` | Use `async def stream(self, ...) -> AsyncIterator[str]:` com `yield` |

---

## 📊 COMO REPORTAR STATUS (CARTILHA)

**Sempre use este template:**

```markdown
# STATUS CARTILHA — [Nome Tarefa]

**Data:** YYYY-MM-DD  
**Agente:** Você  
**Tarefa ID:** task-NNNNNN-NN  

---

## ✅ O que foi feito

- **Tarefa:** Adicionar provider llama-local
- **Arquivo criado:** `backend/plugins/providers/llama-local.py`
- **Linhas:** 47 linhas de código
- **Tempo gasto:** 8 minutos

---

## 🧪 Validações

| Validação | Status | Nota |
|---|---|---|
| mypy check | ✓ PASS | 0 erros |
| ruff check | ✓ PASS | 0 erros |
| pytest | ⏭️ SKIP | Sem testes unitários (ok para now) |
| import test | ✓ PASS | `from plugins.providers.llama_local import LlamaLocal` funciona |
| health() | ✓ PASS | Retorna True |

---

## 🎯 Próximo Passo

1. **Imediato** (agent fazer agora):
   - [ ] Criar teste unitário para health()

2. **Curto prazo** (você/PM decidir):
   - [ ] Testar streaming com dados reais

---

## 🔗 Arquivos Modificados/Criados

- ✨ Novo: `backend/plugins/providers/llama-local.py`
- 📝 Modificado: `.env.example` (adicionado `LLAMA_LOCAL_BASE_URL`)

---

## 💬 Observações

Se houver algo inesperado, ou se descobrir que falta algo no projeto,
coloque aqui para o PM ver.
```

---

## 🎬 PRIMEIRO PASSO AGORA

1. **Leia** `AGENTS.md` (o documento que você recebeu)
2. **Acesse** `TASK_001_VALIDATE_SETUP.md` (próximo arquivo)
3. **Descreva** seu plano (não execute ainda)
4. **Espere** aprovação do PM

---

## 🆘 SE BLOQUEAR

**Não invente. Siga isso:**

1. Pare de executar
2. Descreva exatamente onde travou:
   ```
   Bloqueador em: [arquivo] linha [N]
   Erro: [mensagem completa]
   Tentei: [o que tentou]
   Próxima tentativa: [sugestão]
   ```
3. Espere o PM responder

---

## ✨ BOM TRABALHO! 

Siga as regras, pergunta antes de executar, e documente tudo.

Qualquer dúvida → volte pra este handbook.

**Now go read AGENTS.md and TASK_001_VALIDATE_SETUP.md** 👉
