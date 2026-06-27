# Guia Prático: Configuração Local do Ollama

Este documento te ajudará a instalar e conectar o **Ollama** ao backend do **Pluggable Chat**, permitindo que você rode os modelos de inteligência artificial na sua própria máquina sem depender de chaves de API ou internet (offline).

---

## 1. Instalação do Ollama

O Ollama é executado como um serviço em segundo plano. Faça o download para o seu sistema:
- **Windows:** [Baixar Ollama para Windows](https://ollama.com/download/windows)
- **Mac:** [Baixar Ollama para macOS](https://ollama.com/download/mac)
- **Linux:** `curl -fsSL https://ollama.com/install.sh | sh`

Após a instalação, abra seu terminal e verifique se o comando está disponível:
```bash
ollama --version
```

---

## 2. Inicializando o Servidor Local

O servidor Ollama precisa estar rodando para receber requisições do backend.

1. Abra o terminal.
2. Inicie o servidor (caso ele não esteja rodando automaticamente em segundo plano):
   ```bash
   ollama serve
   ```
   *Nota: O Ollama irá escutar por padrão na porta `11434`.*

---

## 3. Selecionar o Provider no Pluggable Chat

Com o backend rodando localmente (ou configurado para acessar seu IP da máquina hospedeira), abra a UI do Pluggable Chat no navegador.

1. Clique na engrenagem no canto inferior esquerdo para abrir o **SettingsModal**.
2. No campo **Provider**, abra a lista e escolha `ollama` (abaixo de "Provedores de Texto").
3. No campo **Modelo**, digite o nome do modelo que você deseja testar.
   - Exemplo padrão: `llama3.2`
4. Clique em **Salvar**.

---

## 4. Testar o Streaming Local

Ao fechar o modal:
1. Digite uma mensagem como: *"Crie um script Python simples"* e pressione Enter.
2. Você notará o texto "digitando" caractere por caractere (Streaming SSE).
3. Essa requisição foi disparada do Frontend → Backend FastAPI → `http://localhost:11434/api/chat` → Backend FastAPI → Frontend.

---

## 5. Troubleshooting (Resolução de Problemas)

> [!WARNING]
> **Porta 11434 ocupada (`bind: address already in use`)**
> O Ollama já está sendo executado em background. No Mac/Windows verifique a bandeja do sistema.

> [!CAUTION]
> **O modelo não existe (`model not found`)**
> Você configurou o Pluggable Chat para chamar um modelo, mas não o "baixou" para o seu Ollama.
> No terminal, rode `ollama pull nome-do-modelo` antes de usá-lo. (Consulte o [Catálogo de Modelos do Ollama](OLLAMA_MODELS.md)).

> [!IMPORTANT]
> **Erro 500 no Chat / Connection Refused**
> Certifique-se de que a variável `OLLAMA_BASE_URL` no seu backend (no arquivo `.env`) aponta para `http://localhost:11434` ou para o IP da rede local se você estiver rodando em máquinas separadas. Se o seu backend estiver na nuvem (Railway), ele **não conseguirá** acessar o seu `localhost` local.
