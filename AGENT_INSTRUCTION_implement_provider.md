# AGENT_INSTRUCTION_implement_provider.md — Como Implementar Qualquer Provider

## FLUXO PADRÃO

1. **Agente recebe**: "Implementar provider {NOME}"
2. **Agente busca em PROVIDERS_CATALOG.md** a seção `{NOME}`
3. **Agente extrai dados** (API key, URL, endpoints, formato payload)
4. **Agente implementa** `backend/plugins/providers/{nome}.py`
5. **Agente atualiza** `.env.example`, `config.py`, testes
6. **Agente valida** com pytest + ruff + mypy

---

## TEMPLATE: Estrutura do Provider

```python
# backend/plugins/providers/{nome}.py

import httpx
from typing import List, AsyncIterator, Optional
from core.protocol import LLMProvider, Message, Attachment
from core.registry import register_provider
from app.config import settings
import logging

logger = logging.getLogger(__name__)

@register_provider("{provider_name}")
class {ProviderClass}(LLMProvider):
    """
    Provider: {NOME}
    Pricing: {Gratuito/Pago}
    Capabilities: can_text={T/F}, can_image={T/F}, can_video={T/F}
    """
    
    def __init__(self):
        self.api_key = settings.{API_KEY_ENV}
        self.model = settings.{MODEL_ENV}
        self.base_url = "{BASE_URL}"
        self.timeout = 60.0
    
    @property
    def supported_attachments(self) -> List[str]:
        return {ATTACHMENTS_LIST}  # Ex: ["image/png", "image/jpeg"]
    
    async def complete(
        self, 
        messages: List[Message], 
        attachment: Optional[Attachment] = None
    ) -> str:
        """Completação síncrona"""
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": False
        }
        
        # Se suporta attachments e há um anexo, processar
        if attachment and self.supported_attachments:
            # Implementar lógica de anexo específica do provider
            pass
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{ENDPOINT_COMPLETE}",
                json=payload,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            return data["{RESPONSE_FIELD}"]
    
    async def stream(
        self, 
        messages: List[Message], 
        attachment: Optional[Attachment] = None
    ) -> AsyncIterator[str]:
        """Completação com streaming"""
        payload = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": True
        }
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/{ENDPOINT_STREAM}",
                json=payload,
                headers=self.headers,
                timeout=self.timeout
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if not line or not line.strip():
                        continue
                    
                    try:
                        # Parse específico do provider (SSE, JSON lines, etc)
                        data = parse_response_line(line)
                        chunk = data.get("{CHUNK_FIELD}", "")
                        if chunk:
                            yield chunk
                    except Exception as e:
                        logger.warning(f"Erro ao parsear linha: {e}")
                        continue
    
    async def health(self) -> bool:
        """Health check"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{HEALTH_ENDPOINT}",
                    headers=self.headers,
                    timeout=5.0
                )
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Health check falhou: {e}")
            return False
```

---

## CHECKLIST POR TAREFA

### Tarefa: Implementar Provider {NOME}

- [ ] **Leitura**: Consultou PROVIDERS_CATALOG.md seção `{NOME}`?
- [ ] **Config**: Adicionou `{API_KEY_ENV}` e `{MODEL_ENV}` em `backend/app/config.py`?
- [ ] **Env Example**: Atualizou `backend/.env.example`?
- [ ] **Provider File**: Criou `backend/plugins/providers/{nome}.py`?
  - [ ] `@register_provider("{nome}")`?
  - [ ] `complete()` implementado?
  - [ ] `stream()` implementado?
  - [ ] `health()` implementado?
  - [ ] `supported_attachments` retorna lista correta?
- [ ] **Tests**: Adicionou em `backend/tests/test_e2e.py`?
  - [ ] `test_{nome}_registered()` — valida registro no registry
  - [ ] (Opcional) `test_{nome}_complete()` — testa chamada real se API key válida
- [ ] **Validation**:
  ```bash
  cd backend && pytest tests/ -v
  cd backend && ruff check . && mypy . --ignore-missing-imports
  ```
- [ ] **Resultado**: Todos os testes passam? ✅

---

## MAPEAMENTO: CATALOG → CÓDIGO

Ao ler a seção do provider no catalog, mapear assim:

| Catalog Field | Código Python | Exemplo |
|---|---|---|
| `API Key Env` | `self.api_key = settings.{ENV_VAR}` | `settings.OPENAI_API_KEY` |
| `Model Env` | `self.model = settings.{ENV_VAR}` | `settings.OPENAI_MODEL` |
| `Base URL` | `self.base_url = "{URL}"` | `https://api.openai.com/v1` |
| `API Endpoint (complete)` | URL para `client.post()` | `/chat/completions` |
| `API Endpoint (stream)` | URL para `client.stream()` | `/chat/completions` |
| `Health Check` | `client.get()` no `health()` | `GET /models` |
| `Supported Attachments` | `supported_attachments` property | `["image/png", "image/jpeg"]` |
| `Response Field` | Parse em `complete()` | `data.choices[0].message.content` |
| `Payload Format` | Dict em `complete()/stream()` | `{"model": ..., "messages": ...}` |
| `Headers` | `self.headers = {...}` | `{"Authorization": "Bearer ..."}` |

---

## EXEMPLO: Implementar GPT-4o

**Agente lê:**
```
### GPT-4o (OpenAI)
Provider Name: gpt4o
Pricing: 💵 Pago
API Key Env: OPENAI_API_KEY
Model Env: OPENAI_MODEL (default: gpt-4o)
Base URL: https://api.openai.com/v1
API Endpoint (complete): POST /chat/completions (stream=false)
...
Headers: Authorization: Bearer {key}, Content-Type: application/json
```

**Agente implementa:**
1. `config.py`: Adiciona `OPENAI_API_KEY`, `OPENAI_MODEL`
2. `.env.example`: `OPENAI_API_KEY=` | `OPENAI_MODEL=gpt-4o`
3. `plugins/providers/gpt4o.py`: Segue template, preenche campos
4. `test_e2e.py`: Novo teste `test_gpt4o_registered()`
5. `pytest` → 8 passed ✅

---

## ERROS COMUNS & SOLUÇÃO

| Erro | Causa | Solução |
|---|---|---|
| "Provider not found in registry" | @register_provider faltando | Verificar decorator @register_provider("{nome}") |
| "AttributeError: settings.XXX" | Config não tem variável | Adicionar em backend/app/config.py Field() |
| "Falha de tipagem mypy" | AsyncIterator não importado | `from typing import AsyncIterator` |
| "Streaming vazio" | Response parsing incorreto | Debugar a linha exata do JSON/SSE |
| "Health check sempre False" | Header ou URL errada | Validar headers e base_url vs documentação API |

---

## PRÓXIMAS STEPS

Após implementar um provider:

1. ✅ Backend pronto (provider.py)
2. → **Frontend**: Adicionar provider ao SettingsModal (automático via `/api/plugins`)
3. → **Integração**: Testar fluxo completo end-to-end

O frontend já lê `/api/plugins` automaticamente — não precisa de mudança no React.
