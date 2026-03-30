

## Plan: Prompts como Guia de Implementação Bilíngue + Ordenação

### O que muda

**1. Prompts de correção (audit) bilíngues**
No Step 4 da ação `audit` na edge function `chat/index.ts`, atualizar o prompt que gera os fix prompts para exigir que cada prompt contenha versão PT + EN separadas por `---`.

**2. Prompts de implementação como guia ordenado**
Atualmente os prompts gerados pelo `save_prompts` são instruções soltas. A mudança transforma cada prompt em um **guia de implementação numerado**, com a ordem exata em que devem ser enviados para a Lovable. Isso envolve:

- **Edge function** (`supabase/functions/chat/index.ts`): Atualizar a instrução de geração (`generateInstruction`) para que os prompts sejam gerados como um **roteiro sequencial de implementação** — cada prompt deve:
  - Ter um número de ordem claro (Passo 1, Passo 2...)
  - Conter instruções completas e autossuficientes para a Lovable executar
  - Referenciar dependências dos passos anteriores quando necessário
  - Ser bilíngue (PT + `---` + EN)
  - Incluir o `prompt_type` adequado (implementation, review, security) — sendo a maioria `implementation`

- **Tool definition** (`save_prompts`): Adicionar campo `order` (ou usar o `sort_order` existente) e campo `prompt_type` na tool definition para que a IA gere corretamente.

**3. UI dos prompts — indicação de ordem**
No `PromptList.tsx`, exibir o número do passo (baseado no `sort_order`) de forma proeminente, reforçando que é um guia sequencial. Adicionar label "Passo X" ou "Step X" ao lado do título.

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/chat/index.ts` | Atualizar `generateInstruction` para gerar prompts como guia sequencial bilíngue; atualizar Step 4 do audit para fix prompts bilíngues; adicionar `prompt_type` na tool definition |
| `src/components/project/PromptList.tsx` | Exibir número do passo (sort_order + 1) como badge visual |
| `src/components/project/ConsistencyCheck.tsx` | Exibir fix prompts bilíngues (já funciona, só muda o conteúdo vindo do backend) |

### Detalhes técnicos

**generateInstruction** — nova regra para prompts:
```
REGRA PARA PROMPTS: Gere os prompts como um ROTEIRO DE IMPLEMENTAÇÃO SEQUENCIAL. 
Cada prompt deve ser um PASSO numerado que o usuário enviará na Lovable, NA ORDEM.
- Passo 1: Setup inicial (autenticação, estrutura base)
- Passos intermediários: Features em ordem de dependência
- Últimos passos: Revisão, testes, segurança
Cada prompt deve ser autossuficiente e bilíngue (PT + --- + EN).
```

**save_prompts tool** — adicionar `prompt_type`:
```json
{ "prompt_type": { "type": "string", "enum": ["implementation", "review", "security"] } }
```

**Fix prompts bilíngues** — atualizar instrução no Step 4:
```
Cada prompt deve ser bilíngue: primeiro em português, depois "---", depois em inglês.
```

