

## Plano: Separar versões PT e EN lado a lado com botões de copiar independentes

### Problema atual
O prompt bilíngue está em uma única caixa de texto (PT + `---` + EN misturados). Dificulta copiar apenas uma versão.

### Solução
Modificar `PromptList.tsx` para:

1. **Detectar e separar** o conteúdo bilíngue pelo separador `---` (ou `\n---\n`)
2. **Renderizar lado a lado** (grid 2 colunas) com labels "🇧🇷 PT" e "🇺🇸 EN"
3. **Botão de copiar independente** em cada versão
4. Se não houver separador `---`, exibir normalmente como hoje (fallback)

### Layout visual

```text
┌─────────────────────────────────────────────┐
│ ① Passo 1 - Título         [✏️][🗑️]       │
│ ┌──────────────────┐ ┌──────────────────┐   │
│ │ 🇧🇷 PT      [📋] │ │ 🇺🇸 EN      [📋] │   │
│ │                  │ │                  │   │
│ │ Texto em PT...   │ │ Text in EN...    │   │
│ │                  │ │                  │   │
│ └──────────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────┘
```

### Arquivo a editar

| Arquivo | Mudança |
|---|---|
| `src/components/project/PromptList.tsx` | Função helper `splitBilingual(text)` que retorna `{pt, en}`. Renderizar grid 2-col com botões de copiar separados por idioma. Remover botão de copiar geral do header quando bilíngue. |

### Detalhes técnicos

```typescript
const splitBilingual = (text: string) => {
  const parts = text.split(/\n---\n/);
  if (parts.length >= 2) return { pt: parts[0].trim(), en: parts[1].trim() };
  return null; // fallback: não é bilíngue
};
```

- `copiedId` passa a usar sufixo `-pt` / `-en` para controlar feedback independente
- Cada coluna tem seu próprio botão Copy com estado isolado

