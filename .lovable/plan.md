

# Gerenciamento de Histórico do Chat

## O que será implementado

1. **Deletar mensagens individuais** — cada mensagem terá um botão de excluir (ícone lixeira) visível ao passar o mouse/tocar.

2. **Excluir mensagens do contexto da IA** — além de deletar, o usuário poderá "desativar" mensagens específicas para que não sejam enviadas como contexto para a IA, sem removê-las do histórico visual. Mensagens excluídas do contexto ficam com opacidade reduzida e um indicador visual.

## Mudanças técnicas

### Banco de dados
- **Migration**: Adicionar coluna `excluded` (boolean, default false) na tabela `chat_messages` para marcar mensagens excluídas do contexto.
- **RLS**: Adicionar política de DELETE e UPDATE na tabela `chat_messages` para o próprio usuário.

### ChatMessage.tsx
- Adicionar props `onDelete` e `onToggleExclude` + estado `excluded`.
- Mostrar botões de ação (lixeira + olho) no hover/long-press.
- Estilizar mensagens excluídas com opacidade reduzida e badge "fora do contexto".

### ProjectPage.tsx
- Implementar `handleDeleteMessage` — deleta do banco e invalida query.
- Implementar `handleToggleExclude` — alterna o campo `excluded` no banco.
- No `buildContext` e no `handleSend`, filtrar mensagens onde `excluded === true` para não enviar à IA.
- Passar as novas props para cada `ChatMessage`.

### types/chat.ts
- Adicionar campo `excluded?: boolean` ao tipo `Message`.

## Fluxo do usuário
- Hover numa mensagem → aparecem ícones de **excluir** (remove permanentemente) e **ocultar do contexto** (mantém visível mas a IA ignora).
- Mensagens ocultas ficam com visual diferenciado e podem ser reativadas a qualquer momento.

