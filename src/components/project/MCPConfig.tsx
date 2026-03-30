import { useState } from "react";
import { Copy, Check, Plug, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const MCPConfig = ({ projectId }: { projectId: string }) => {
  const { session } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  const mcpUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`;
  const token = session?.access_token || "<seu_token_aqui>";

  const configJson = JSON.stringify(
    {
      mcpServers: {
        codebuddy: {
          url: mcpUrl,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        codebuddy: {
          url: mcpUrl,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2
  );

  const claudeCodeCmd = `claude mcp add codebuddy --transport http "${mcpUrl}" --header "Authorization: Bearer ${token}"`;

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => handleCopy(text, id)}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title="Copiar"
    >
      {copied === id ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Plug size={18} className="text-primary" />
        <h2 className="text-base font-semibold text-foreground">MCP Server</h2>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Conecte ferramentas de IA externas (Claude Code, Claude Desktop, Cursor, Lovable) ao seu projeto via protocolo MCP. 
        Elas poderão acessar seus projetos, PRD, tarefas, prompts, skills e regras de negócio.
      </p>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">URL do MCP Server</label>
        <div className="relative">
          <pre className="text-xs bg-muted/50 border border-border rounded-lg p-3 pr-10 overflow-x-auto font-mono text-foreground">
            {mcpUrl}
          </pre>
          <CopyBtn text={mcpUrl} id="url" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Tools disponíveis</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { name: "list_projects", desc: "Lista seus projetos" },
            { name: "get_project_prd", desc: "Retorna o PRD" },
            { name: "get_project_tasks", desc: "Lista tarefas" },
            { name: "get_project_prompts", desc: "Retorna prompts" },
            { name: "get_project_skills", desc: "Retorna skills" },
            { name: "get_business_rules", desc: "Regras de negócio" },
          ].map((tool) => (
            <div key={tool.name} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-border/50">
              <code className="text-[10px] font-mono text-primary font-medium">{tool.name}</code>
              <span className="text-[10px] text-muted-foreground">{tool.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Configuração por cliente</h3>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            Claude Desktop / Cursor
          </label>
          <p className="text-[10px] text-muted-foreground mb-1.5">
            Cole no arquivo de configuração MCP (Settings → MCP Servers):
          </p>
          <div className="relative">
            <pre className="text-[11px] bg-muted/50 border border-border rounded-lg p-3 pr-10 overflow-x-auto font-mono text-foreground whitespace-pre-wrap">
              {configJson}
            </pre>
            <CopyBtn text={configJson} id="config" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Claude Code (CLI)</label>
          <p className="text-[10px] text-muted-foreground mb-1.5">
            Execute no terminal:
          </p>
          <div className="relative">
            <pre className="text-[11px] bg-muted/50 border border-border rounded-lg p-3 pr-10 overflow-x-auto font-mono text-foreground whitespace-pre-wrap break-all">
              {claudeCodeCmd}
            </pre>
            <CopyBtn text={claudeCodeCmd} id="claude-code" />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="bg-accent/30 border border-accent/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>⚠️ Nota:</strong> O token de acesso expira periodicamente. Se a conexão parar de funcionar, 
            volte aqui para copiar um novo token atualizado.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MCPConfig;
