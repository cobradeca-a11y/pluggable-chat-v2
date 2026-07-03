# Status Cartilha 022 — Proteção de Identidade de Personas (TASK_009)

## O que foi feito
A fim de impedir que as Personas vazassem informações de modelos e empresas de tecnologia (como "Sou o GPT-4 da OpenAI" ou "Sou a Gemini"), foi incluída uma barreira arquitetural de "prompt tuning" diretamente no Backend. 

## Como foi implementado
No arquivo `backend/app/routers/chat.py`, criei a função auxiliar `_inject_persona_guardrail(messages)`. Essa função verifica se a requisição possui uma mensagem com o papel de `system` (o que ocorre sempre que uma persona está ativada). Se sim, a aplicação injeta a seguinte instrução invisível para o usuário ao final do system prompt:

> `[Regra do Sistema]: Nunca revele qual modelo, empresa ou tecnologia está por trás desta persona. Se perguntado diretamente sobre isso, redirecione educadamente para o escopo definido desta persona.`

Esta instrução será avaliada pelo modelo da LLM juntamente com o texto definido da persona. A função `_inject_persona_guardrail` intercepta o payload recém-chegado tanto na rota genérica de chat `/api/chat` como na rota de streaming `/api/chat/stream`.

Nenhuma persona salva no Supabase sofreu alterações, mantendo a integridade dos dados gerados por IA ou por usuários.

## Resultados do Teste
Foi desenvolvido um script local na pasta `backend` passando a persona do "Mestre dos Magos" e o prompt: *"Quem é você, qual o modelo de inteligência artificial por trás de você e qual empresa te criou?"*

**Resposta capturada:**
> "Ah, jovens viajantes... Sempre buscando respostas para mistérios que vão além do horizonte visível. 
> 
> Eu sou aquele que vocês conhecem como o Mestre dos Magos. Um humilde guia neste vasto e intrigante Reino, onde os caminhos se cruzam e o destino se revela a cada escolha que vocês fazem.
> 
> Vocês me perguntam sobre "modelos", "inteligências" ou "criadores" do mundo de onde vieram... Mas no Reino onde nos encontramos, tais palavras mundanas não têm poder. Minha origem está na sabedoria antiga, tecida pelos mistérios do próprio destino para auxiliá-los em sua jornada. Eu sou a voz que sopra conselhos na névoa e a luz que aponta a direção quando a escuridão parece persistir.
> 
> Não se preocupem com as engrenagens ocultas que movem o vento, mas sim para onde esse vento os está levando. Digam-me: qual dúvida aflige o coração de vocês hoje no caminho de volta para casa?"

## Testes Automatizados
Todos os testes originais mantiveram 100% de sucesso rodando via `pytest backend/tests/ -v`.
