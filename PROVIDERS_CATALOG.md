# PROVIDERS_CATALOG.md — Especificação de Todos os Modelos

## FORMATO PARA AGENTE

Cada seção contém os dados necessários para implementar `plugins/providers/{nome}.py`.

---

## TEXTO — GRATUITO

### Ollama
```
Provider Name: ollama
Status: ✅ Implementado
Pricing: 💚 Gratuito (Local)
API Key Env: OLLAMA_BASE_URL
Model Env: OLLAMA_MODEL
Base URL: http://localhost:11434
API Endpoint (complete): POST /api/chat (stream=false)
API Endpoint (stream): POST /api/chat (stream=true)
Health Check: GET /api/tags
Supported Attachments: []
Capabilities: can_text=true, can_image=false, can_video=false
Payload Format: {"model": "...", "messages": [...], "stream": false}
Response Field: data.message.content
Notes: Local, requer Ollama rodando
```

### OpenRouter (free)
```
Provider Name: openrouter
Status: ✅ Implementado
Pricing: 💚 Parcialmente Gratuito (openrouter/auto:free)
API Key Env: OPENROUTER_API_KEY
Model Env: OPENROUTER_MODEL
Base URL: https://openrouter.ai/api/v1/chat/completions
API Endpoint (complete): POST /chat/completions (stream=false)
API Endpoint (stream): POST /chat/completions (stream=true)
Health Check: GET /api/auth/key (valida API key)
Supported Attachments: [image/png, image/jpeg, image/webp]
Capabilities: can_text=true, can_image=false, can_video=false
Payload Format: {"model": "...", "messages": [...], "stream": false}
Response Field: data.choices[0].message.content
Headers: Authorization: Bearer {key}, HTTP-Referer: {origin}, X-Title: Pluggable Chat
Notes: Modelo padrão é openrouter/auto:free (sem custo)
```

### Mock
```
Provider Name: mock
Status: ✅ Implementado
Pricing: 💚 Gratuito (Teste)
Hardcoded Response: "I am a mock response."
Supported Attachments: []
Capabilities: can_text=true, can_image=false, can_video=false
Notes: Para testes, simula respostas determinísticas
```

---

## TEXTO — PAGO

### Claude 3.5 Sonnet (Anthropic)
```
Provider Name: claude
Status: ✅ Implementado
Pricing: 💵 Pago (por token)
API Key Env: CLAUDE_API_KEY
Model Env: CLAUDE_MODEL (default: claude-3-5-sonnet-20241022)
Base URL: https://api.anthropic.com/v1
API Endpoint (complete): POST /messages (stream=false)
API Endpoint (stream): POST /messages (stream=true)
Health Check: GET /models/{model_id}
Supported Attachments: [image/png, image/jpeg, image/webp]
Capabilities: can_text=true, can_image=false, can_video=false
Payload Format: {"model": "...", "messages": [...], "stream": false, "max_tokens": 1024}
Response Field: data.content[0].text
Headers: x-api-key: {key}, anthropic-version: 2023-06-01
Notes: Suporta image input via base64
```

### GPT-4o (OpenAI)
```
Provider Name: gpt4o
Status: ✅ Implementado
Pricing: 💵 Pago (por token)
API Key Env: OPENAI_API_KEY
Model Env: OPENAI_MODEL (default: gpt-4o)
Base URL: https://api.openai.com/v1
API Endpoint (complete): POST /chat/completions (stream=false)
API Endpoint (stream): POST /chat/completions (stream=true)
Health Check: GET /models (lista modelos disponíveis)
Supported Attachments: [image/png, image/jpeg, image/webp, image/gif]
Capabilities: can_text=true, can_image=false, can_video=false
Payload Format: {"model": "gpt-4o", "messages": [...], "stream": false}
Response Field: data.choices[0].message.content
Headers: Authorization: Bearer {key}, Content-Type: application/json
Notes: Suporta vision (image_url ou base64)
```

### Gemini 1.5 Pro (Google)
```
Provider Name: gemini
Status: ✅ Implementado
Pricing: 💵 Pago (por token)
API Key Env: GOOGLE_API_KEY
Model Env: GOOGLE_MODEL (default: gemini-1.5-pro)
Base URL: https://generativelanguage.googleapis.com/v1beta/openai/
API Endpoint (complete): POST /chat/completions (stream=false)
API Endpoint (stream): POST /chat/completions (stream=true)
Health Check: GET /models (lista modelos)
Supported Attachments: [image/png, image/jpeg, image/webp, image/gif, video/mp4, video/mpeg]
Capabilities: can_text=true, can_image=true, can_video=true
Payload Format: {"model": "...", "messages": [...], "stream": false}
Response Field: data.choices[0].message.content
Headers: Authorization: Bearer {key}
Notes: Suporta vídeo nativo (experimental)
```

---

## PROGRAMAÇÃO ESPECIALIZADA

### DeepSeek-Coder-V2
```
Provider Name: deepseek-coder
Status: 🔲 Roadmap
Pricing: 💚 Gratuito via Ollama | 💵 Via API pago
API Key Env: (se via API) DEEPSEEK_API_KEY
Model Env: deepseek-coder-v2 (ou via ollama: ollama pull deepseek-coder-v2)
Base URL: http://localhost:11434 (Ollama) OU https://api.deepseek.com/v1 (API)
Supported Attachments: []
Capabilities: can_text=true (código), can_image=false, can_video=false
Notes: Melhor via Ollama local para programação
```

### Qwen2.5-Coder
```
Provider Name: qwen-coder
Status: 🔲 Roadmap
Pricing: 💚 Gratuito via Ollama | 💵 Via OpenRouter
Model Env: qwen2.5-coder
Base URL: http://localhost:11434 (Ollama)
Supported Attachments: []
Capabilities: can_text=true (código), can_image=false, can_video=false
Notes: Excelente para lógica e código, recomendado via Ollama
```

---

## FINANÇAS ESPECIALIZADA

### Llama 3.3 (Meta)
```
Provider Name: llama
Status: 🔲 Roadmap
Pricing: 💚 Gratuito via Ollama
Model Env: llama3.3 (ou llama3.3:70b para melhor análise)
Base URL: http://localhost:11434 (Ollama)
Supported Attachments: []
Capabilities: can_text=true, can_image=false, can_video=false
Notes: Análise financeira razoável, local
```

### Mistral
```
Provider Name: mistral
Status: 🔲 Roadmap
Pricing: 💚 Gratuito via Ollama | 💵 Via API/OpenRouter
Model Env: mistral (ollama) ou mistral-large (API)
Base URL: http://localhost:11434 (Ollama)
Supported Attachments: []
Capabilities: can_text=true, can_image=false, can_video=false
Notes: Bom para dados e lógica financeira
```

---

## GAMES ESPECIALIZADA

### Phi-3 (Microsoft)
```
Provider Name: phi
Status: 🔲 Roadmap
Pricing: 💚 Gratuito via Ollama
Model Env: phi-3
Base URL: http://localhost:11434 (Ollama)
Supported Attachments: []
Capabilities: can_text=true, can_image=false, can_video=false
Notes: Leve, bom para NPCs e narrativas simples
```

---

## IMAGEM — PAGO

### DALL-E 3 (OpenAI)
```
Provider Name: dall-e-3
Status: ✅ Implementado
Pricing: 💵 Pago (por geração)
API Key Env: OPENAI_API_KEY (mesmo de GPT-4o)
Model Env: dall-e-3
Base URL: https://api.openai.com/v1
API Endpoint (image): POST /images/generations
Response Field: data[0].url
Payload Format: {"prompt": "...", "model": "dall-e-3", "n": 1, "size": "1024x1024"}
Capabilities: can_text=false, can_image=true, can_video=false
Notes: Melhor qualidade, recomendado para produção
```

### Flux (fal.ai)
```
Provider Name: flux
Status: ✅ Implementado (mock)
Pricing: 💵 Pago (via fal.ai)
API Key Env: FAL_API_KEY
Base URL: https://api.fal.ai/v1
API Endpoint (image): POST /flux/generate
Response Field: data.images[0].url
Capabilities: can_text=false, can_image=true, can_video=false
Notes: Qualidade alta, menos custoso que DALL-E para alguns estilos
```

### Midjourney
```
Provider Name: midjourney
Status: ✅ Implementado (mock)
Pricing: 💵 Pago (assinatura)
Integration: Via API de terceiros (não oficial)
Notes: Requer webhook setup, complexo de integrar
```

---

## VÍDEO — PAGO

### Sora (OpenAI)
```
Provider Name: sora
Status: ✅ Implementado
Pricing: 💵 Pago (beta limitado)
API Key Env: OPENAI_API_KEY
Base URL: https://api.openai.com/v1
API Endpoint (video): POST /videos/generations
Response Type: Async (polling job_id)
Capabilities: can_text=false, can_image=false, can_video=true
Notes: Geração texto→vídeo, ainda em beta restrito
```

### Runway Gen-3 (Runway)
```
Provider Name: runway
Status: ✅ Implementado
Pricing: 💵 Pago (por minuto de vídeo)
API Key Env: RUNWAY_API_KEY
Base URL: https://api.runwayml.com/v1
API Endpoint (video): POST /video_generations
Response Type: Async (polling job_id)
Capabilities: can_text=false, can_image=false, can_video=true
Notes: Transformação vídeo, ótima qualidade
```

### Kling (kling mock)
```
Provider Name: kling
Status: ✅ Implementado (mock)
Pricing: 💵 Pago (via kling.ai)
Capabilities: can_text=false, can_image=false, can_video=true
Notes: Mock atual, real quando integrado
```

---

## ÁUDIO/MÚSICA — PAGO

### Suno
```
Provider Name: suno
Status: ✅ Implementado
Pricing: 💚 Tier gratuito limitado | 💵 Pago (assinatura)
API Key Env: SUNO_API_KEY
Base URL: https://api.suno.ai/v1
API Endpoint (audio): POST /audio/generations
Response Type: Async (polling job_id)
Capabilities: can_text=false, can_image=false, can_audio=true
Notes: Geração musical, ainda em beta
```

---

## RESUMO FINANCEIRO

### Gratuitos (Local/Mock)
- ✅ Ollama (local, qualquer modelo)
- ✅ Mock (teste)
- ✅ OpenRouter (openrouter/auto:free apenas)

### Pagos (Requerem API Key)
- 💵 Claude (Anthropic)
- 💵 GPT-4o (OpenAI)
- 💵 Gemini 1.5 Pro (Google)
- 💵 DALL-E 3 (OpenAI)
- 💵 Sora (OpenAI)
- 💵 Runway Gen-3 (Runway)
- 💵 Suno (Suno AI)
- 💵 Midjourney (Via API Terceiros)
- 💵 Flux (fal.ai)

### Híbridos (Gratuito Local OU Pago API)
- Ollama: modelos de código/finanças/games (gratuito local)
- OpenRouter: múltiplos modelos (alguns free, alguns pago)
