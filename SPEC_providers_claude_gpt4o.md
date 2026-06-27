# SPEC Providers: Claude & GPT-4o

## 1. Plugin Claude (Anthropic)
- Arquivo: `backend/plugins/providers/claude.py`
- Config: `ANTHROPIC_API_KEY` em `.env`
- Methods: `complete()`, `stream()`, `health()`
- supported_attachments: `[image/png, image/jpeg, image/webp]`
- can_text: `true` | can_image: `true` | can_video: `false`

## 2. Plugin GPT-4o (OpenAI)
- Arquivo: `backend/plugins/providers/gpt4o.py`
- Config: `OPENAI_API_KEY` em `.env`
- Methods: `complete()`, `stream()`, `health()`
- supported_attachments: `[image/png, image/jpeg, image/webp, image/gif]`
- can_text: `true` | can_image: `true` | can_video: `false`

## 3. Atualizar /api/plugins
```json
{
  "providers": [
    {"name": "mock", "can_text": true, "can_image": false, "can_video": false},
    {"name": "openrouter", "can_text": true, "can_image": false, "can_video": false},
    {"name": "ollama", "can_text": true, "can_image": false, "can_video": false},
    {"name": "flux", "can_text": false, "can_image": true, "can_video": false},
    {"name": "kling", "can_text": false, "can_image": false, "can_video": true},
    {"name": "claude", "can_text": true, "can_image": true, "can_video": false},
    {"name": "gpt4o", "can_text": true, "can_image": true, "can_video": false}
  ]
}
```

## 4. Decisão de Implementação
- **Qual primeiro?** Claude ou GPT-4o?
- **Risco:** API keys válidas vs mocks
- **Recomendação:** Claude primeiro (mais simples, documentação clara)
