# TAREFA: Validar Setup Local do Pluggable Chat

**ID:** task-20260623-001  
**Prioridade:** 🔴 Bloqueadora  
**Estimativa:** 15 min

---

## 🎯 Objetivo

Verificar que todo o projeto está pronto para desenvolvimento:
- Backend Python pode iniciar
- Frontend pode fazer build
- Plugins carregam corretamente
- Documentação reflete a realidade

---

## 📥 Escopo (Entra)

| Item | Localização |
|---|---|
| Código backend | `backend/` |
| Código frontend | `frontend/` |
| Documentação | `AGENTS.md` |
| Arquivo este | Este MD |

**Restrições:**
- ❌ Não modifique código existente (apenas leia)
- ❌ Não crie provider novo
- ✅ Pode criar arquivo de teste/reporte

---

## 📤 Deliverable (Sai)

- [ ] **Arquivo:** `SETUP_VALIDATION_REPORT.md` (novo)
  - Resultado de cada comando de validação
  - Qualquer coisa faltando ou incompatível
  
- [ ] **Status:** Passar em `mypy`, `pytest`, `build` ou reportar bloqueadores

- [ ] **Cartilha:** Resumo em `STATUS_CARTILHA_001.md`

---

## 📋 Plano de Execução (Agent descreve aqui)

**Agent: responda:**

```
Entendo que preciso:

1. Clonar/ler o projeto do backend e frontend
2. Rodar cada validação listada em AGENTS.md:
   - pytest backend/tests/ -v
   - mypy backend/ --ignore-missing-imports
   - ruff check backend/
   - cd frontend && npm run build
   - cd frontend && npx tsc --noEmit
3. Para cada comando, reportar:
   - Status (PASS/FAIL)
   - Output (sucinto)
   - Bloqueador? (sim/não)
4. Criar arquivo SETUP_VALIDATION_REPORT.md com achados
5. Criar STATUS_CARTILHA_001.md com resumo
6. **NÃO EXECUTAR NADA** até você (PM) confirmar este plano

Confirme se tá tudo certo e se meu plano faz sentido? Tem algo que 
não entendi ou que deveria fazer diferente?
```

---

## ✅ Checklist de Validação (Agent marca ao terminar)

- [ ] Leu AGENTS.md inteiro
- [ ] Validações rodaram sem erro (ou capturaram erro)
- [ ] SETUP_VALIDATION_REPORT.md gerado
- [ ] STATUS_CARTILHA_001.md gerado com tabela de status
- [ ] Nenhum arquivo `core/` foi modificado
- [ ] Código não tem print() (use logging se precisar)
- [ ] Output é factual, sem especulação

---

## ⚠️ INSTRUÇÕES CRÍTICAS PARA O AGENTE

**SEMPRE que receber esta tarefa, responda PRIMEIRO com:**

```
Entendo a tarefa. Aqui está meu plano:

[seu plano em 5-7 linhas]

Confirme se está tudo correto antes de eu executar.
```

**Só execute depois de receber "Aprovado" ou feedback com ajuste.**

**Se bloquear em algo:**
- Não invente solução
- Pergunte ao PM imediatamente
- Copie o erro completo no seu reporte

---

## 🔗 Referências

- AGENTS.md — leia antes de qualquer coisa
- backend/.env.example — variáveis esperadas
- frontend/.env.local.example — variáveis esperadas

---

## 📞 Próxima Tarefa

Após aprovação desta, o PM abrirá nova tarefa para:
- [ ] Setup local com chaves reais (ou mock)
- [ ] Testar endpoint /api/chat com cada provider
