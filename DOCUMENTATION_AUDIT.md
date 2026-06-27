# Relatório de Auditoria de Documentação (DOCUMENTATION_AUDIT.md)

Este documento apresenta a análise comparativa entre a documentação existente no repositório e o estado atual do código da arquitetura Pluggable Chat, verificando a consistência, status e implementação.

---

## 1. `AGENTS.md` vs Código
**Status:** 🔲 Correções necessárias

- ✅ **Features listadas estão realmente implementadas?** Sim. Todas as features da UI e integrações de streaming multimodais conferem com o código (`useChat`, SSE, components de Video/Imagem).
- ✅ **Status correto (✅ vs 🔲)?** Sim, as tabelas de features da UI estão atualizadas (S2 COMPLETA).
- ❌ **Providers registrados no registry?** **INCONFORMIDADE.** Na seção *"Provedores disponíveis"*, o arquivo lista apenas `openrouter`, `ollama` e `mock`. Os provedores `flux`, `kling`, `claude` e `gpt4o` foram implementados, estão no registry do código, mas não foram adicionados à tabela do `AGENTS.md`. Além disso, a seção *"Backlog futuro"* lista "Provider: Anthropic direto" e "Provider: Gemini" como se não tivessem sido feitos, mas Claude e GPT-4o já são realidade.

---

## 2. `ROADMAP_PROVIDERS.md` vs Code
**Status:** 🔲 Correções necessárias

- ❌ **Status de implementação correto?** **INCONFORMIDADE.** A tabela mostra `GPT-4o` e `Claude 3.5 Sonnet` com o status `🔲 Próxima`, mas eles acabaram de ser implementados com sucesso na S3.1 e S3.2. Devem ser atualizados para `✅`.
- ✅ **Categorias (Texto/Imagem/Vídeo) condizem?** Sim, as categorias estão logicamente mapeadas.
- ❌ **Links para provider files existem?** **INCONFORMIDADE.** Não existem links clicáveis para os arquivos `.py` no catálogo do roadmap, o que quebra o requisito do checklist.

---

## 3. `PROVIDERS_CATALOG.md` vs Código
**Status:** 🔲 Correções necessárias

- ✅ **API endpoints listados estão corretos?** Sim, conferem com os endpoints da OpenAI, Anthropic, Ollama, etc.
- ✅ **Response fields correspondem ao parsing real?** Sim, o mapeamento `data.choices[0].message.content` bate com o parser no código.
- ❌ **Flags multimodais (can_image/can_video):** **INCONFORMIDADE GRAVE.** No `PROVIDERS_CATALOG.md`, o Claude e o GPT-4o estão listados com `Capabilities: can_image=true`. Porém, no código (backend/main.py e routers), `can_image` é estritamente usado para identificar provedores que *GERAM* imagens (ex: Flux). Como o Claude/GPT-4o apenas recebem imagens (anexos) mas não geram, no código eles retornam `can_image=False` via API. A documentação induz ao erro sobre o significado da flag.

---

## 4. Providers Implementados
**Status:** ✅ Sincronizado

- ✅ `mock.py` — Implementado conforme spec.
- ✅ `openrouter.py` — Implementado conforme spec.
- ✅ `ollama.py` — Implementado conforme spec.
- ✅ `flux.py` — Implementado conforme spec (mocked).
- ✅ `kling.py` — Implementado conforme spec (mocked).
- ✅ `claude.py` — Implementado com validação end-to-end e multi-blocos.
- ✅ `gpt4o.py` — Implementado com vision models payload parsing.

---

## 5. Config & Env
**Status:** ✅ Sincronizado

- ✅ Todas as variáveis em `.env.example` existem no `config.py` (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `CLAUDE_API_KEY`, `CLAUDE_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`).
- ✅ Valores defaults batem perfeitamente.
- ✅ Nenhuma variável oculta sem documentação em `.env`.

---

## 6. Frontend vs Backend
**Status:** ✅ Sincronizado

- ✅ `/api/plugins` retorna a lista dinâmica completa.
- ✅ Flags `can_text`, `can_image` e `can_video` interagem corretamente.
- ✅ `SettingsModal.tsx` NÃO possui hardcode. Ele usa um `.filter(p => p.can_text)` map para renderizar dinamicamente os provedores na UI. Portanto, assim que o backend levanta o Claude ou GPT-4o, eles aparecem automaticamente como "Provedores de Texto" para seleção.

---

## 7. Testes
**Status:** ✅ Sincronizado

- ✅ Todos os provedores implementados possuem sua assertion no `tests/test_e2e.py` (ex: `test_claude_registered`, `test_gpt4o_registered`, `test_generate_video_mock`).

---

## 🛠 Recomendações de Correção (Action Items)

1. **Atualizar `AGENTS.md`**: Adicionar `flux`, `kling`, `claude` e `gpt4o` na tabela de provedores. Remover as referências do Claude/GPT do backlog.
2. **Atualizar `ROADMAP_PROVIDERS.md`**: Mudar os status de Claude e GPT-4o para `✅` e adicionar colunas com hiperlinks (`file:///...`) para os plugins na pasta `backend/plugins/providers/`.
3. **Corrigir `PROVIDERS_CATALOG.md`**: Ajustar a documentação do Claude e GPT-4o para `can_image=false` e `supported_attachments=[image/png...]` com uma nota de que `can_image` é exclusivo para "Geração de imagem", e a capacidade de visão advém de `supported_attachments`.
