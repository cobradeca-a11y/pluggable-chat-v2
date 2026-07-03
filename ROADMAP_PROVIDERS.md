# ROADMAP PROVIDERS

Arquitetura Plug and Play — cada modelo é um provider isolado.

| Modelo | Categoria | Especialidade | Dev | Status | Plugin |
|---|---|---|---|---|---|
| Ollama | 🛠️ Plataforma Local | Offline | Ollama | ✅ | [ollama.py](backend/plugins/providers/ollama.py) |
| DeepSeek-Coder-V2 | 💻 Código | Avançado | DeepSeek | 🔲 | - |
| Qwen2.5-Coder | 💻 Código | Lógica | Alibaba | 🔲 | - |
| Llama 3.3 | 📊 Finanças | Análise | Meta | 🔲 | - |
| Mistral | 📊 Finanças | Dados | Mistral AI | 🔲 | - |
| Phi-3 | 🎮 Games | NPCs | Microsoft | 🔲 | - |
| GPT-4o | 📝 Texto/Multimodal | Geral | OpenAI | ✅ | [gpt4o.py](backend/plugins/providers/gpt4o.py) |
| Claude 3.5 Sonnet | 📝 Texto/Lógica | Raciocínio | Anthropic | ✅ | [claude.py](backend/plugins/providers/claude.py) |
| Gemini 1.5 Pro | 📝 Texto/Multimodal | Geral+vídeo | Google | ✅ | [gemini.py](backend/plugins/providers/gemini.py) |
| DALL-E 3 | 🖼️ Imagem | Alta qualidade | OpenAI | ✅ | - |
| Midjourney | 🖼️ Imagem | Artístico | Midjourney | ✅ (OpenRouter) | [openrouter.py](backend/plugins/providers/openrouter.py) |
| Flux | 🖼️ Imagem | Realismo | Black Forest | ✅ (OpenRouter) | [openrouter.py](backend/plugins/providers/openrouter.py) |
| Sora | 🎬 Vídeo | Texto→vídeo | OpenAI | ✅ | - |
| Runway Gen-3 | 🎬 Vídeo | Transformação | Runway | ✅ | - |
| Kling | 🎬 Vídeo | Cinemático | Kling | ✅ (OpenRouter) | [openrouter.py](backend/plugins/providers/openrouter.py) |
| Suno | 🎵 Áudio/Música | Geração | Suno AI | ✅ (OpenRouter) | [openrouter.py](backend/plugins/providers/openrouter.py) |
