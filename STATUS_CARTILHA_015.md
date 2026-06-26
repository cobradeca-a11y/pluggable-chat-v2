# STATUS_CARTILHA_015: Níveis de Raciocínio (Temperature e Top-P)

## O que foi feito
- Extensão do schema base `ChatRequest` no backend (Pydantic em `schemas/chat.py`) para captar campos opcionais numéricos: `temperature` (default 0.7) e `top_p` (default 0.9).
- Modificação no `_get_active_provider` em `routers/chat.py` que insere via injeção direta de dependência (método `setattr`) as propriedades extras ao provedor instanciado caso venham declaradas no request.
- Atualização em `openrouter.py` para injetar no JSON Payload da request as opções se existirem.
- Extensão do painel de Configurações (`SettingsModal.tsx`) para oferecer sliders deslizantes de alta acessibilidade (`<input type="range">`), alterando os níveis de Temperature (de `0.0` a `2.0`) e Top-P (de `0.0` a `1.0`).

## Validação Realizada
- TypeScript foi capaz de aceitar as interfaces do ProviderSettings corretamente. O repasse das variáveis entre Cliente e Servidor FastAPI se mantém imutável e plugável.
