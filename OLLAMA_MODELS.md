# Catálogo de Modelos do Ollama

Para usar modelos de IA localmente com o Ollama, você precisa primeiro fazer o download (pull) deles para a sua máquina através do terminal.

Abaixo está o catálogo de modelos validados para uso no Pluggable Chat, separados por categoria de uso.

---

## 💻 PROGRAMAÇÃO

Modelos focados em geração de código, lógica matemática e revisão de pull requests.

| Comando de Pull | Tamanho no Disco | Descrição |
|---|---|---|
| `ollama pull deepseek-coder-v2` | ~8.6GB | Excelente modelo open-source focado em código, com contexto avançado. |
| `ollama pull qwen2.5-coder` | ~4.7GB | Modelo otimizado da Alibaba com grande eficiência lógica para o tamanho. |

---

## 📊 FINANÇAS E DADOS

Modelos balanceados e versáteis para análise de texto denso, finanças e conhecimento geral corporativo.

| Comando de Pull | Tamanho no Disco | Descrição |
|---|---|---|
| `ollama pull llama3.3` | ~8.0GB | Meta Llama 3.3 padrão. Muito rápido e competente para tarefas gerais. |
| `ollama pull llama3.3:70b` | ~42.0GB | Versão gigantesca (necessita placa de vídeo muito potente e grande quantidade de RAM). |

---

## 🎮 GAMES E CRIATIVIDADE

Modelos menores para emulação de personas, criação de roteiros e diálogos criativos (NPCs).

| Comando de Pull | Tamanho no Disco | Descrição |
|---|---|---|
| `ollama pull phi-3` | ~2.3GB | Modelo de bolso da Microsoft. Ideal para ser rodado em máquinas fracas ou laptops básicos. |

---

## Como trocar o modelo no Pluggable Chat

1. Certifique-se de que rodou o comando `ollama pull` no seu terminal e o download foi 100% finalizado.
2. Na interface web do **Pluggable Chat**, abra o modal de configurações (ícone de engrenagem).
3. Em **Provider**, selecione: `ollama`.
4. Em **Modelo**, digite o nome exato que você baixou.
   *Exemplo:* `deepseek-coder-v2` ou `phi-3`.
5. Clique em **Salvar**. A partir de agora, o chat usará o novo modelo.
