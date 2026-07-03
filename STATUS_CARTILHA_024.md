# Status Cartilha 024 — Auto-detecção de modo do input (TASK_011)

## O que foi feito
Foi implementada uma heurística determinística (sem envolver modelo LLM) para analisar as palavras chave enquanto o usuário digita ou anexa um arquivo, prevendo e pré-selecionando o modo de geração correto (Texto, Imagem ou Vídeo), mas mantendo a liberdade do usuário substituir a escolha a qualquer instante com um clique manual.

## Como foi implementado
1. **Utilitário de Heurística (`frontend/src/lib/detectMode.ts`)**:
   - Desenvolvi a função `detectMode`, que varre de forma eficiente a `string` de entrada contra uma lista de palavras-chave curada em português (ex: "gere uma imagem", "anime essa imagem", "desenhe", etc). 
   - A heurística prioriza fortemente a detecção por anexo de mídia, onde o tipo mime de um vídeo instantaneamente converte a aba para "Vídeo". O envio de imagem anexa prioriza a aba de "Texto" pois a maioria dos usuários deseja conversar sobre a imagem enviada.
2. **Atualização do Input (`frontend/src/components/ChatInput.tsx`)**:
   - Injetei um `useEffect` inteligente acoplado à detecção em tempo real (rodando com baixo custo computacional no cliente).
   - Implementei a variável de estado `userSelectedMode`. Quando você clica num botão de modo (ex: "Imagem"), a aplicação salva a sua preferência manual e congela a heurística automática pro resto daquela mensagem. Assim, se você pediu especificamente pra não trocar a aba, o sistema obedece rigorosamente.
   - Assim que a mensagem é enviada (ou o campo de input esvaziado), a seleção manual é resetada, reativando as deduções heurísticas em tempo real.

## Casos de Teste Verificados
Os seguintes cenários foram previstos com sucesso na bateria local de testes (`test_detect.ts` executada fora do browser, e depois aplicada via input UI):
1. *"gere uma imagem de um gato"* -> Automático muda a aba para `Imagem`
2. *"o que é dispensa de licitação?"* -> Permanece em `Texto`
3. *"crie um vídeo sobre sustentabilidade"* -> Automático muda a aba para `Vídeo`
4. [Enviar Arquivo de Imagem] + *"o que tem nessa imagem?"* -> Permanece em `Texto` (Leitura de Visão Computacional)
5. [Enviar Arquivo de Imagem] + *"anime essa imagem"* -> Automático muda a aba para `Vídeo`

## Impacto
O chat fica muito mais fluido — na vasta maioria dos cenários o botão correto já estará ativado, poupando ao menos um clique e carga mental no envio. O fato de rodar offline na máquina evita qualquer sobrecarga no backend e tempo de resposta zero. 
