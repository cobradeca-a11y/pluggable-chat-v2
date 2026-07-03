# Status Cartilha 021 — Limpeza do catálogo de modelos OpenRouter (TASK_008)

## O que foi investigado e testado
Criei um script temporário na pasta `backend` para fazer requisições POST para a API do OpenRouter consumindo os 4 modelos que estavam listados na curadoria do `main.py` (simulando uma requisição de chat com o texto "oi"). 

### Resultados do teste (Status Code de resposta)
- `openrouter/owl-alpha` -> **Status: 404** (Erro: "No endpoints found for openrouter/owl-alpha")
- `openai/gpt-oss-120b:free` -> **Status: 200** (OK)
- `nvidia/nemotron-3-super-120b-a12b:free` -> **Status: 200** (OK)
- `poolside/laguna-m.1:free` -> **Status: 200** (OK)

## O que foi alterado
1. No arquivo `backend/main.py`, removi o modelo `openrouter/owl-alpha` da lista curada pois ele não é mais suportado pela API oficial.
2. Mantive os outros três modelos, que estão 100% operacionais, limpei os arquivos temporários do teste e preservei a mesma organização. Não encontrei indícios de que precise substituir `owl-alpha` por algo equivalente neste momento, visto que há 3 ótimas opções funcionando.

## Como testar
- Na interface, ao selecionar o provider **OpenRouter**, o dropdown de modelos não exibirá mais a opção `openrouter/owl-alpha`, o que evita falhas 404 para o usuário final.
- Você pode garantir o comportamento acessando `/api/plugins/openrouter/models` no backend para visualizar o JSON contendo os modelos restantes.
