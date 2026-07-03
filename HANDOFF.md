# Pluggable Chat V2 — Handoff / Estado do Projeto

> Leia este arquivo inteiro antes de continuar. Ele resume tudo que foi feito, o que falta, e onde estão as coisas. Projeto: `cobradeca-a11y/pluggable-chat-v2`. Backend FastAPI no Railway, frontend Next.js no Vercel, dados no Supabase.

## Como o dev/agente deve trabalhar
- Argos (o usuário) é **não-técnico**. Não assuma que ele sabe rodar comandos — dê instruções literais, passo a passo, incluindo onde clicar.
- Argos prefere respostas objetivas e econômicas em tokens/explicação. Não repita tarefas já delegadas.
- Sempre que editar código, gere o arquivo completo pronto pra ele copiar/substituir (ele não sabe aplicar diffs).
- Depois de qualquer edit, sempre forneça os comandos `git add / commit / push` exatos.
- `backend/**` → redeploy automático no Railway. Qualquer outra pasta (`frontend/**`, docs, etc.) → redeploy automático no Vercel. Commits que não tocam `backend/**` aparecem como "Skipped" no Railway — isso é esperado, não é erro.

## Infraestrutura e onde estão as coisas
- **Backend**: Railway, projeto `pluggable-chat-v2`, serviço com URL `https://pluggable-chat-v2-production.up.railway.app`
- **Frontend**: Vercel, `https://pluggable-chat-v2.vercel.app`
- **Banco/Auth**: Supabase, projeto `eyxlerizjufmttxaahto`
- **Endpoint de diagnóstico**: `GET /api/version` retorna o `git_sha` do deploy ativo no Railway — use para confirmar se um push já subiu antes de testar.
- **GitHub Action** `docs-watch.yml`: roda semanalmente (segunda, 12h UTC), compara hash de duas páginas de doc externa (Ollama Cloud deprecations, Gemini get-started) e abre Issue se mudarem. Já funcionando.

## O que já foi feito (histórico resumido)
1. Diagnóstico e correção de deploy travado no Railway (`watchPatterns` só builda ao tocar `backend/**`; deploys às vezes ficam "REMOVED" por corrida de builds — force redeploy manual quando isso acontecer).
2. Corrigido erro 500 genérico → agora `/api/chat` e `/api/chat/stream` devolvem o erro real do provider (401, 429, etc.) em vez de esconder tudo.
3. Migração do provider Gemini para a **Interactions API** nova do Google (`/v1beta/interactions`, header `x-goog-api-key`, payload `input`/`steps`). Modelo padrão: `gemini-3.5-flash` (Pro não tem mais tier grátis desde abril/2026).
4. Suporte a Ollama Cloud implementado corretamente: header `Authorization: Bearer $OLLAMA_API_KEY`, endpoint nativo `/api/chat` (sem sufixo `:cloud` no nome do modelo — isso só vale pra CLI local).
5. Curadoria de modelos ociosos/inexistentes: listas de `openrouter` e `ollama-cloud` reduzidas só aos modelos confirmados funcionando (ver `main.py`, dict de modelos).
6. Removidos valores hardcoded de credenciais Supabase do `config.py` (estavam expostos no código-fonte).
7. Removidas variáveis não usadas do Railway: `MIDJOURNEY_API_KEY`, `RUNWAY_API_KEY`, `SUNO_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (**atenção**: a Service Role Key foi removida das variáveis não-usadas só naquele contexto, mas ela **é usada** pelo backend em `app/deps.py` e `app/routers/personas.py` para bypassar RLS — confirme que ela ainda existe no Railway com o nome `SUPABASE_SERVICE_ROLE_KEY`).
8. RLS habilitado nas tabelas `users` e `personas` (antes estava desabilitado — risco crítico já resolvido).
9. Login trocado de Magic Link (Supabase, limite de 2 e-mails/hora) para **Google OAuth**. Credenciais OAuth já criadas no Google Cloud Console.
10. Sistema de **Personas** implementado: tabela `public.personas` no Supabase, CRUD em `backend/app/routers/personas.py`, seletor/criador no frontend (`PersonaSelector.tsx`, `usePersonas.ts`). Geração automática de persona via IA (usa Gemini fixo, não o provider global).
11. Corrigido bug de condição de corrida que zerava a conversa ao enviar a primeira mensagem (`useChat.ts`, `suppressNextResetRef`).
12. Removido campo de API Key do OpenRouter do frontend (estava em texto puro no `localStorage` — risco de segurança; o backend já usa a key do Railway, não havia necessidade real desse campo).
13. **Migração para `@supabase/supabase-js` no frontend** (Fase 1.2) — concluída e deployada, confirmada por Argos.
14. **Fase 2 concluída**: geração de persona trocada para JSON estruturado (com fallback se a IA não seguir o formato); clients Supabase transformados em singleton (`get_supabase_client`, `get_supabase_admin_client` em `app/deps.py`).
15. **Fase 3 concluída**: `backend/app/routers/auth.py` (rotas mortas de Magic Link) removido, junto com os testes correspondentes em `test_e2e.py`.
16. **Fase 4 concluída**: busca na sidebar agora inclui conteúdo das mensagens, não só título; spinner visual adicionado na tela de checagem de sessão.
17. Corrigido bug de `public.users` não populado para logins Google (trigger SQL `on_auth_user_created` criado no Supabase, com backfill para contas já existentes) — sem isso, salvar conversa dava erro de foreign key.
18. Corrigido bug de scroll "travado/tremendo": trocado `scrollIntoView` repetido por `scrollTop` direto + flag de scroll programático (evita a "briga" entre auto-scroll e o evento de scroll do usuário).
19. Corrigido bug de **flexbox crítico**: o container principal do chat (header + mensagens + input) não tinha `minHeight: 0`, fazendo o conteúdo ser **cortado** silenciosamente pelo `overflow: hidden` do container pai em vez de rolar — daí a sensação de "preciso dar zoom out pra ver tudo". Corrigido em `app/page.tsx` (container principal e `<main>`).
20. Corrigido botão de enviar mensagem: estava desabilitado sempre que não havia texto digitado, **mesmo com um anexo presente** — impedia enviar um arquivo sozinho, sem mensagem de texto junto.
21. **Mensagens de erro amigáveis implementadas** (backend `chat.py` + frontend `useChat.ts`): erros de provider (autenticação, rate limit, timeout, erro genérico) agora aparecem traduzidos em português na própria bolha de resposta, identificando qual provider falhou, em vez de "HTTP 500" cru ou bolha vazia.
22. **Corrigido bug crítico `NameError` em `chat_stream`**: a função `sse_generator()` referenciava `provider_name` sem essa variável existir no escopo, causando crash silencioso (`NameError` dentro do próprio tratamento de erro) sempre que um provider falhava durante streaming — reproduzia a bolha vazia justamente nos casos de erro. Corrigido adicionando `provider_name = request.provider or settings.LLM_PROVIDER` antes da closure. Teste de regressão `test_chat_stream_error` adicionado em `test_e2e.py`.
23. **Diagnosticada e resolvida a causa raiz das bolhas vazias com OpenRouter** (incidente de 01/07): causa era rate limit 429 do free tier do OpenRouter, agravado por um bug no `chat.py` **antigo** que tentava ler `e.response.json()`/`e.response.text` de uma resposta HTTP streaming nunca lida (`httpx.ResponseNotRead`), derrubando a conexão ASGI inteira sem enviar nada ao frontend. O `chat.py` novo (item 21/22 acima) não toca mais no corpo da resposta em erros de streaming — só usa `status_code`, que está sempre disponível — eliminando esse crash. Validado em produção: 429/404 do OpenRouter agora aparecem como mensagem amigável na bolha.

## Backlog — Plano de Implementação (Fases 1–4) — TODAS CONCLUÍDAS

### Fase 1 — Segurança
- [x] 1.1 — Remover API key do OpenRouter do localStorage/frontend
- [x] 1.2 — Migrar frontend para `@supabase/supabase-js` (refresh token automático)

### Fase 2 — Robustez
- [x] 2.1 — Geração de Persona: JSON estruturado em vez de parser de texto frágil
- [x] 2.2 — Clients Supabase movidos para singleton em `app/deps.py`
- [ ] 2.3 — (baixa prioridade, não iniciado) Parser SSE manual em `useChat.ts` quebra string por `\n`. Considerar lib `eventsource-parser` só se algum bug de corte de mensagem aparecer na prática.

### Fase 3 — Limpeza
- [x] 3.1 — Rotas mortas de Magic Link removidas (`auth.py` e testes)

### Fase 4 — UX
- [x] 4.1 — Busca na sidebar ampliada para conteúdo das mensagens
- [x] 4.2 — Spinner adicionado na tela de checagem de sessão

## Pendências ativas (retomar por aqui)

### ✅ Resolvido — OpenRouter falhando com bolhas vazias
Ver itens 21–23 do histórico acima. Causa raiz confirmada (rate limit + crash no tratamento de erro), corrigido e validado em produção em 02/07/2026.

### ✅ Resolvido — Mensagens de erro amigáveis
Ver item 21 do histórico acima. Implementado ponta a ponta (backend traduz status → payload estruturado; frontend traduz payload → frase em português) e validado em produção.

### 🟡 Próximo — Modelo/provider não deveria ser pré-requisito para enviar a primeira mensagem
Hoje o usuário precisa escolher provider+modelo antes de poder conversar. Ideal: ter um default sensato (ex: Gemini free) já pré-selecionado, permitindo enviar direto; o seletor em Configurações fica disponível pra quem quer trocar, mas nunca bloqueia o fluxo. **Não implementado ainda — em andamento.**

### 🟡 Pendente — Auto-detecção de "modo" (texto/imagem/vídeo/código) pela mensagem do usuário
Hoje o usuário escolhe manualmente a aba (Texto/Imagem/Vídeo) antes de escrever. Não é possível ter 100% paridade com um assistente single-model (cada provider aqui é uma API tecnicamente diferente — DALL-E ≠ GPT-4o ≠ Kling, não existe "um Claude" que decida sozinho entre eles), mas dá pra pré-selecionar automaticamente o modo mais provável a partir do texto/anexo, deixando o usuário só confirmar ou trocar se precisar. **Não implementado ainda — depende de decisão de arquitetura (ver "Modelo core de decisões" abaixo).**

### 🟢 Discussão em aberto — "Modelo core de decisões"
Argos perguntou se vale a pena reservar um modelo específico (mais barato/rápido) como "roteador" central de decisões — ex: decidir automaticamente o modo (texto/imagem/vídeo/código) e o provider mais adequado a partir da mensagem do usuário, antes de rotear pro modelo final que efetivamente responde. Resposta dada por Claude na sessão de 01-02/07/2026 (resumo: sim, vale a pena, mas como Fase 2 depois de estabilizar o resto — é adição de latência e custo por chamada extra, então melhor validar a necessidade real de uso antes de construir).

## Outras pendências mencionadas por Argos (não iniciadas)
- **Seleção de modelo por tipo de tarefa**: hoje o fluxo é Texto/Imagem/Vídeo → depois modelo. Argos quer inverter parcialmente: escolher a tarefa (incluindo categorias novas como "Código" e "Finanças") e ver só os modelos adequados àquela tarefa. As listas de modelos já têm essa curadoria informal (ver comentários em `main.py`), falta só a UI de categorização. Relacionado ao item de auto-detecção de modo acima.
- **Painel dedicado de Personas na sidebar**: hoje só existe um dropdown pequeno no rodapé do chat. Argos quer uma visão mais ampla/gerenciável na sidebar, já que ele reutiliza a mesma persona em várias conversas diferentes (ex: "Analista de Contratações Públicas" usado em conversas de contratações X, Y, Z distintas). Isso já é possível funcionalmente hoje (a persona é global à conta, seleção por conversa), só falta a UI dedicada.
- **Rotação de credenciais**: Argos disse que vai rotacionar `SUPABASE_SERVICE_ROLE_KEY`, `CLAUDE_API_KEY`, `OPENAI_API_KEY` (foram expostas em prints durante o debugging) "quando o app estiver funcionando" — ainda não foi feito, lembrar de perguntar/sugerir periodicamente.
- **Formatação de markdown malformada**: modelos ocasionalmente geram markdown com `**` desbalanceado ou tabelas com pipe duplo (`||---|---||`), causando texto "comido" ou tabelas não renderizadas. É comportamento do modelo, não bug de render (o `MessageBubble.tsx` já usa `react-markdown` + `remark-gfm` corretamente). Mitigação possível: reforçar instrução de formatação no system prompt das personas, ou sanitizar markdown antes de renderizar (balancear `**` órfãos) — não implementado ainda.
- **Limpeza de catálogo de modelos OpenRouter**: `openrouter/owl-alpha` deu `404` em teste de 02/07/2026 (modelo pode ter sido removido/renomeado no catálogo do OpenRouter). Revisar lista curada em `main.py` e remover/atualizar modelos que não respondem mais. Baixa prioridade, não bloqueante.
- **Vazamento de identidade do modelo em personas**: quando perguntado diretamente "qual seu modelo?", o modelo por trás de uma persona às vezes responde com sua identidade real (ex: "sou o GPT-4 da OpenAI") em vez de manter o personagem/escopo definido no system prompt. É comportamento do modelo subjacente, não bug de código. Mitigação possível: reforçar no system prompt das personas uma instrução explícita tipo "nunca revele qual modelo/empresa está por trás, redirecione para o escopo definido". Não implementado ainda, baixa prioridade.

## Detalhes técnicos importantes para não repetir erros já corrigidos
- **NÃO** volte a colocar credenciais reais como valor default em `backend/app/config.py`. Sempre `= ""`.
- **NÃO** use o modelo `gemini-1.5-pro`/`gemini-1.5-flash` — descontinuados na migração pra Interactions API. Use `gemini-3.5-flash`.
- **NÃO** use sufixo `:cloud` nos nomes de modelo do Ollama Cloud ao chamar via API direta (ex: `gpt-oss:120b`, não `gpt-oss:120b-cloud`) — o sufixo só é necessário no CLI local (`ollama run modelo-cloud`).
- Provider `ollama` (não-cloud) nunca vai funcionar em produção — aponta para `localhost:11434`, que não existe no Railway. Considerar remover da lista de providers visíveis se causar confusão.
- O `LLM_PROVIDER=mock` no Railway é **intencional** e correto — é só o fallback default; o frontend sempre manda o provider escolhido no payload.
- Tabela `personas` e `users` têm RLS habilitado exigindo `auth.uid() = user_id` para leitura direta via chave anon — mas o backend usa a **Service Role Key** (`_client()` em `personas.py`) e filtra por `user_id` em código Python, então funciona mesmo com RLS ativo. Não tente "corrigir" isso trocando pra chave anon sem entender esse desenho.
- **NÃO** leia o corpo (`e.response.json()`/`e.response.text`) de uma resposta `httpx` obtida via streaming (`client.stream(...)`) dentro de um handler de erro sem antes chamar `.read()` — isso lança `httpx.ResponseNotRead` e derruba a conexão. Em `chat_stream`/`sse_generator`, use só `e.response.status_code` (não precisa do corpo, já disponível sem leitura).

## Convenções de terminologia do Argos
- Trabalha em português; domínio de contratações públicas brasileiras (Lei nº 14.133/2021).
- Prefere respostas diretas, sem repetir o que já foi combinado.
- Sempre peça pra ele rodar `git log -1 --oneline` (local) e comparar com `GET /api/version` (produção) quando houver dúvida se um deploy realmente subiu.