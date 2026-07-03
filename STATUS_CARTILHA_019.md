# Status Cartilha 019 — Diagnóstico OpenRouter & Erros Amigáveis (TASK_005)

## Item 1 — Diagnóstico de falha no OpenRouter (Bolhas Vazias)

### Passo a passo para coletar o Deploy Log no Railway
Como Argos, por favor siga estes passos exatos para coletar o log do momento do erro para confirmação:
1. Acesse o painel do Railway (railway.app) e faça login.
2. Clique no projeto `pluggable-chat-v2-production`.
3. Na visualização do projeto, clique no serviço do **Backend** (onde o FastAPI roda).
4. No menu superior desse serviço, clique na aba **"Deployments"**.
5. Role a lista para encontrar o deploy que estava ativo no dia **01/07/2026** (procure pela data/hora).
6. Clique no botão **"View Logs"** (ou na aba "Logs" do deploy específico).
7. No canto superior direito da tela de logs, selecione o intervalo de tempo desejado ou role até o horário de **~23:00 a 23:10 do dia 01/07**.
8. Copie todo o texto de erro/traceback que aparecer e cole aqui na nossa conversa para eu confirmar a análise.

### Diagnóstico Preliminar e Proposta de Fix (Não aplicado)
**Causa Raiz Suspeita:** A falha (bolhas vazias) ocorreu porque o provider `openrouter` falhou em repassar o erro para o `chat.py`. 
No arquivo `backend/plugins/providers/openrouter.py`, dentro do método `stream`, o código lê os chunks da API. Se a API retornar um JSON de erro (ex: Rate Limit 429 embutido no chunk SSE), o JSON é feito o parse com sucesso (`json.loads`), mas o código verifica apenas `if "choices" in data`. Como mensagens de erro não têm a chave `"choices"`, o código **ignora silenciosamente** a mensagem de erro e não faz `yield` de nada, nem lança exceção. O stream termina vazio.
Como não há exceção lançada, o `try/except` do `chat.py` não é acionado, enviando um stream vazio para o frontend, resultando na bolha vazia.

**Proposta de Correção (em `openrouter.py`):**
Adicionar a verificação de erro logo após o parse do JSON:
```python
data = json.loads(data_str)
if "error" in data:
    raise Exception(f"OpenRouter Error: {json.dumps(data['error'])}")
if "choices" in data and len(data["choices"]) > 0:
```
Dessa forma, a exceção será capturada pelo `chat.py` e repassada ao frontend como um erro. **Aguardando aprovação para aplicar.**

---

## Item 2 — Mensagens de Erro Amigáveis

### O que foi feito:
1. **No Backend (`backend/app/routers/chat.py`):**
   - Modifiquei o bloco `try/except` do endpoint `/api/chat/stream` para que os erros sejam serializados em JSON (`[ERROR] {"provider": "...", "status": 401, "body": "..."}`). Isso padroniza a entrega dos erros para o frontend de forma fácil de ler.

2. **No Frontend (`frontend/src/hooks/useChat.ts`):**
   - O hook `useChat.ts` agora intercepta os dados iniciados por `[ERROR]` na resposta de stream.
   - Fazemos o parse do JSON de erro e traduzimos códigos de erro técnicos para mensagens em português na própria bolha de chat (com `isError = true`).
   - Códigos tratados: `401/403` (Autenticação), `429` (Rate limit), `0/504` (Timeout/Falha de rede), e genéricos `>=500`.
   - Se a requisição for no modo síncrono (ex: imagem/vídeo) e falhar via `fetch`, os erros são transformados em objetos contendo o `status`, que caem no `catch` e recebem o mesmo tratamento amigável, substituindo a mensagem de erro padrão estática.
   - O nome do provider que falhou é interpolado na mensagem de erro para maior clareza (ex: "Falha de autenticação no openrouter. Verifique sua chave...").

Os testes automatizados (`pytest backend/tests/ -v`) foram executados e todos passaram com sucesso, confirmando que as alterações não quebraram o comportamento existente.
