

## Plano: Criar MCP Server como Edge Function

### Contexto

O MCP Server exporia os dados do CodeBuddy (projetos, PRD, tarefas, prompts, skills, regras de negócio) via protocolo **Streamable HTTP**. Qualquer cliente MCP compatível pode se conectar:

- **Claude Code** — suporta MCP Streamable HTTP nativamente
- **Claude Desktop** — suporta MCP (via config JSON)
- **Cursor** — suporta MCP servers
- **Lovable** — suporta MCP servers
- **MCP Inspector** — para testes

### Como funciona a conexão

```text
Claude Code / Claude Desktop / Cursor
        │
        │  HTTP POST (JSON-RPC)
        ▼
Edge Function: mcp-server
        │
        │  Supabase queries (com auth JWT)
        ▼
    Database (projetos, PRD, tarefas...)
```

O usuário configura no cliente MCP algo como:
```json
{
  "mcpServers": {
    "codebuddy": {
      "url": "https://gzhnbgkzofkttdndoxkj.supabase.co/functions/v1/mcp-server",
      "headers": {
        "Authorization": "Bearer <token_do_usuario>"
      }
    }
  }
}
```

### Implementação

#### 1. Criar `supabase/functions/mcp-server/deno.json`
Import map com `mcp-lite@^0.10.0` e Hono.

#### 2. Criar `supabase/functions/mcp-server/index.ts`
Definir 6 tools MCP (read-only):

| Tool | Descrição |
|------|-----------|
| `list_projects` | Lista projetos do usuário |
| `get_project_prd` | Retorna PRD de um projeto |
| `get_project_tasks` | Lista tarefas do projeto |
| `get_project_prompts` | Retorna prompts gerados |
| `get_project_skills` | Retorna skills do projeto |
| `get_business_rules` | Retorna regras de negócio |

Cada tool autentica via JWT do header Authorization, cria um Supabase client scoped ao usuário, e faz queries nas tabelas existentes.

#### 3. Adicionar página de configuração na UI
Nova seção em `ProjectPage` ou página dedicada mostrando:
- URL do MCP Server
- Instruções de configuração para Claude Code, Claude Desktop e Cursor
- Botão para copiar o JSON de configuração

### Segurança
- Autenticação via JWT em cada chamada (getClaims)
- RLS do banco garante acesso apenas aos dados do usuário
- Read-only (sem escrita via MCP inicialmente)

