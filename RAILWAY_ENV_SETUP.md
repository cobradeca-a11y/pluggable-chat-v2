# Configuração de Variáveis de Ambiente no Railway

Este documento detalha o processo para configurar e atualizar as variáveis de ambiente necessárias para o backend do **Pluggable Chat** hospedado no [Railway](https://railway.app).

---

## 1. Acesso ao Dashboard Railway

1. Acesse [https://railway.app](https://railway.app) e faça login na sua conta.
2. Na página inicial do **Dashboard**, clique no projeto correspondente ao seu backend (ex: `pluggable-chat-v2`).
3. Clique no serviço do backend (geralmente com ícone do GitHub ou Python) dentro do mapa do projeto.
4. No menu lateral do serviço, clique na aba **Variables** (Variáveis).

---

## 2. Seção: Variáveis Atuais

Verifique quais variáveis já estão presentes e qual o status atual delas para o funcionamento básico:

| Variável | Status Esperado | Descrição |
|---|---|---|
| `LLM_PROVIDER` | ✅ Obrigatória | Define o modelo padrão (ex: `openrouter`, `claude`, `mock`). |
| `ALLOWED_ORIGIN` | ✅ Obrigatória | Deve apontar para a URL do seu frontend (ex: `https://pluggable-chat-v2.vercel.app`). |
| `OPENROUTER_API_KEY` | ⚠️ Condicional | Necessária apenas se você for usar o OpenRouter. |

---

## 3. Seção: Adicionar Novas Variáveis

Para incluir novas variáveis, como as configurações recém-implementadas do **Claude**, **Ollama**, ou dos provedores multimodais (**Gemini, DALL-E 3, Sora, Runway, Suno e Midjourney**), clique no botão **New Variable** (ou **Add Variable**) na aba *Variables*.

Insira as seguintes variáveis com seus respectivos valores (ajuste as chaves reais antes de salvar):

```env
LLM_PROVIDER=openrouter
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
CLAUDE_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=AIzaSy...
RUNWAY_API_KEY=sua_chave
SUNO_API_KEY=sua_chave
MIDJOURNEY_API_KEY=sua_chave
RATE_LIMIT_RPM=30
ACTIVE_MIDDLEWARE=rate_limit,request_logger
```

> [!TIP]
> **Dica Visual:** No Railway, você pode usar o botão **Raw Editor** para colar todas as variáveis de uma vez no formato `CHAVE=VALOR`, poupando o trabalho de adicionar uma por uma.

---

## 4. Deploy & Validação

### Como redeployar após mudanças
O Railway aplicará um **redeploy automático** no seu serviço sempre que uma variável de ambiente for criada, modificada ou deletada. Aguarde cerca de 1 a 2 minutos para que o contêiner reinicie com os novos valores.

### Como checar logs
1. Dentro do serviço do backend, vá até a aba **Deployments**.
2. Clique no deploy mais recente que está rodando.
3. Acesse a aba **Deploy Logs** para ver em tempo real o startup do Uvicorn e os middlewares em ação.

### Validar Health Check
Após o deploy concluir com sucesso, acesse a URL do seu backend para testar o healthcheck da API:
```bash
curl https://pluggable-chat-v2-production.up.railway.app/api/health
```
A resposta esperada deve ser `{"status": "ok"}`.
Para verificar se os novos provedores subiram corretamente:
```bash
curl https://pluggable-chat-v2-production.up.railway.app/api/plugins
```

---

## 5. Troubleshooting (Resolução de Problemas)

> [!WARNING]
> **Variável não reconhecida**
> - **Causa:** O servidor iniciou antes do Railway carregar o .env atualizado.
> - **Solução:** Na aba *Deployments*, clique nos três pontos (...) ao lado do último deploy e selecione **Restart**.

> [!CAUTION]
> **Build fails / Application Crash**
> - **Causa:** Erro de sintaxe nas variáveis (como aspas duplas desnecessárias) ou falta de variáveis obrigatórias.
> - **Solução:** O Railway passa as variáveis exatamente como digitadas. Não envolva strings com aspas (ex: `ACTIVE_MIDDLEWARE="rate_limit"` causará falha no Pydantic; use apenas `ACTIVE_MIDDLEWARE=rate_limit`).

> [!IMPORTANT]
> **Connection refused (Ollama Local)**
> - **Causa:** O backend hospedado na nuvem (Railway) está tentando se conectar ao `localhost:11434` da nuvem, e não do seu computador local.
> - **Solução:** Para rodar o Ollama via Railway, seria necessário expor seu IP local via `Ngrok` ou rodar o backend localmente junto com o Ollama.
