# Status Cartilha 025 — Filtro de Modelos por Categoria (TASK_012)

## O que foi feito
Adicionei o recurso de classificar e filtrar modelos de IA por categorias e tipos de tarefa. Agora, ao invés de navegar por uma lista plana imensa de modelos dependendo do provedor (como o OpenRouter e o Ollama), o usuário pode selecionar primeiro a "Categoria de Tarefa" desejada (ex: *Código*, *Texto Geral*, *Matemática*, *Visão*). O seletor de modelos exibirá apenas aqueles otimizados ou habilitados para aquela tarefa. 

## Como foi implementado
1. **Backend (`backend/main.py`)**:
   - Criei o dicionário constante `PROVIDER_CATEGORIES`, mapeando os modelos curados do sistema para suas respectivas tags de especialidade (ex: `deepseek-r1` recebeu as tags *Código*, *Matemática* e *Raciocínio Complexo*).
   - O endpoint `/api/plugins/{provider}/models` foi modificado de forma **aditiva e não-destrutiva**: ele continua devolvendo a lista `models` mas agora também anexa o dicionário `categories` em sua resposta, não quebrando integrações antigas.

2. **Frontend - Hook de Dados (`frontend/src/hooks/useAvailableModels.ts`)**:
   - Atualizei o hook de fetching para capturar a resposta com a nova estrutura, expondo a lista de `categories` atrelada à resposta. 

3. **Frontend - UI (`frontend/src/components/SettingsModal.tsx`)**:
   - A lógica agora constrói um array de todas as categorias únicas disponíveis para os modelos carregados daquele provider (se houver mais de uma).
   - Um novo campo de `<select>` ("Categoria de Tarefa") é injetado dinamicamente caso as categorias existam. 
   - A opção padrão, "Todas", preserva o fluxo original para quem quiser ver a lista crua de modelos. Caso o usuário mude a categoria (ex: para *Código*), a lista de modelos sofrerá um `filter`, exibindo só as opções adequadas, além de auto-selecionar o primeiro da lista filtrada para conveniência.

## Impacto
Facilita drasticamente a experiência do usuário final, que agora não precisa decorar para que serve um modelo exótico de 120 bilhões de parâmetros ou lembrar se o *Qwen Coder* suporta matemática. Essa documentação fica embutida e interativa diretamente na interface. A seleção de provedores massivos não oprime mais o usuário.
