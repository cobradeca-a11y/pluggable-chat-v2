# STATUS_CARTILHA_017: Deploy Backend via Railway

## O que foi feito
Nesta etapa, o repositório foi preparado estruturalmente para ser deployado na plataforma **Railway**.
O backend (FastAPI) necessitava de diretrizes claras para a engine Nixpacks do Railway realizar o build na raiz do projeto (monorepo).

1. **Procfile:** Adicionado em `backend/Procfile` instruindo o `uvicorn` a usar a flag `--port $PORT` (variável dinâmica injetada pelo Railway em runtime).
2. **railway.toml:** Adicionado em `backend/railway.toml` forçando o build e o start context na subpasta `backend/` para evitar que o Nixpacks se confunda com o package.json do frontend.
3. **Task 002 Documentada:** A tarefa de setup foi devidamente registrada (`TASK_002_DEPLOY_BACKEND.md`), marcando a transição de responsabilidade para o deploy manual por parte do PM na interface da plataforma.

## Validação Realizada
- As configurações foram commitadas e enviadas ao GitHub remoto.
- `requirements.txt` validado (uvicorn e fastapi presentes).
- Fica pendente apenas o clique final no painel web do Railway (tarefa humana).
