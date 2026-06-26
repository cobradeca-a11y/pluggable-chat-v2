# STATUS_CARTILHA_014: Botão Parar (AbortController)

## O que foi feito
- Implementado o controle de cancelamento de requisições nativo da API Fetch usando `AbortController` no hook `useChat.ts`.
- O botão azul de "Enviar" foi adaptado para ser ocultado e substituído pelo botão vermelho "Parar" (`■`) enquanto a variável de estado `loading` for `true`.
- Caso o usuário acione a interrupção, o fluxo trata a exceção gerada nativamente (`DOMException: AbortError`) de modo silencioso e mantém na interface todo o texto parcial que o modelo já havia conseguido devolver no streaming.

## Validação Realizada
- O código foi testado para não sobrescrever nem marcar `isError` como `true` caso o encerramento seja efetuado pelo próprio usuário.
