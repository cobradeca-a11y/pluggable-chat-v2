# Status Cartilha 018 — Auditoria de Documentação (TASK_003)

## 1. `AGENTS.md` — tabela "Provedores disponíveis"
- **Estado encontrado:** Já correto. A tabela já contém `claude` e `gpt4o`. O backlog futuro não cita Claude/GPT-4o como pendentes. Os provedores `flux` e `kling` não foram adicionados à tabela porque não existem como arquivos individuais de plugin `.py` no diretório (eles estão cobertos via OpenRouter/Mock e não estão registrados diretamente no registry).
- **O que foi alterado:** Nenhuma alteração foi necessária.
- **Arquivos tocados:** Nenhum.

## 2. `ROADMAP_PROVIDERS.md` — status e links
- **Estado encontrado:** Parcialmente correto / Precisava de correção. A coluna de status já estava marcada corretamente como `✅` para GPT-4o e Claude 3.5 Sonnet (inconformidade já havia sido resolvida anteriormente). No entanto, não havia a coluna com os links relativos para os arquivos `.py`.
- **O que foi alterado:** Adicionada a coluna `Plugin` à tabela. Inseridos os hiperlinks relativos aos arquivos para os provedores já implementados localmente em `backend/plugins/providers/` (ex: `gpt4o.py`, `claude.py`, `gemini.py`, `ollama.py`, `openrouter.py`).
- **Arquivos tocados:** `ROADMAP_PROVIDERS.md`

## 3. `PROVIDERS_CATALOG.md` — flag `can_image`
- **Estado encontrado:** Parcialmente correto / Precisava de correção. A propriedade `can_image` documentada para Claude e GPT-4o já estava como `false` e a do Gemini estava corretamente como `true` (pois a classe `GeminiProvider` implementa efetivamente o método `generate_image`). Faltava, no entanto, uma explicação explícita.
- **O que foi alterado:** Adicionada uma nota explicativa na seção `Notes` do Claude e do GPT-4o detalhando a distinção de que `can_image=false` significa que o provedor não *gera* imagens, embora aceite imagens como anexo de visão através do array `supported_attachments`.
- **Arquivos tocados:** `PROVIDERS_CATALOG.md`
