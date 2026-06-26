# TASK_002_DEPLOY_BACKEND: Deploy Backend (Railway)

**ID:** task-20260626-002
**Tempo:** 30 min

---

## 🎯 Objetivo
Colocar backend online no Railway (URL pública, porta automática).

---

## 📤 Deliverable
- [x] `backend/railway.toml` criado
- [x] `backend/Procfile` criado  
- [x] GitHub repo atualizado
- [ ] PM cria projeto Railway manual
- [ ] URL pública funcional (ex: pluggable-chat.railway.app)
- [ ] `/api/health` responde publicamente
- [x] STATUS_CARTILHA_017.md (Ajustado para 017 devido à cronologia real)

---

## 📋 Plano Executado pelo Agent

1. Criado `backend/railway.toml` definindo builder `nixpacks` e comando de start.
2. Criado `backend/Procfile` apontando uvicorn para `$PORT`.
3. Validado `requirements.txt` (todas dependências estavam corretas).
4. Git commit + push realizados com sucesso.
5. Nova cartilha de status 017 registrada.

---

## ⚠️ Próximos Passos — PM Faz Manual

```text
1. railway.app → Sign in com GitHub
2. New Project → Deploy from GitHub
3. Selecione: cobradeca-a11y/pluggable-chat-v2
4. Configure vars:
   LLM_PROVIDER=mock (ou openrouter)
   OPENROUTER_API_KEY=seu-key
5. Deploy
6. Anote URL gerada
```
