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
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-gradient shadow-glow flex items-center justify-center">
            <Plug size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tighter italic">MCP Server Hub</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Conecte IAs externas ao seu workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/30 rounded-full border border-white/5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Live & Active</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl font-medium">
        Habilite o <span className="text-primary font-bold">Model Context Protocol</span> para que ferramentas como Claude Code, Cursor e Lovable acessem seus PRDs, tarefas e regras de negócio diretamente.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">URL de Conexão</label>
            <div className="relative group">
              <pre className="text-[11px] bg-secondary/80 backdrop-blur-md border border-white/5 rounded-2xl p-4 pr-12 overflow-x-auto font-mono text-foreground shadow-inner">
                {mcpUrl}
              </pre>
              <CopyBtn text={mcpUrl} id="url" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Capabilities</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: "list_projects", desc: "Varredura de projetos ativos" },
                { name: "get_project_prd", desc: "Leitura de especificações" },
                { name: "get_project_tasks", desc: "Controle de roadmap" },
                { name: "get_project_skills", desc: "Extração de expertise" },
              ].map((tool) => (
                <div key={tool.name} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors">
                  <code className="text-[10px] font-bold font-mono text-primary">{tool.name}</code>
                  <span className="text-[10px] text-muted-foreground font-medium italic">{tool.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 glass-card border-primary/20 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Check size={16} /> Claude / Cursor Setup
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Inject this workspace into your AI editor by adding the following config:
            </p>
            <div className="relative group">
              <pre className="text-[10px] bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 pr-12 overflow-x-auto font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                {configJson}
              </pre>
              <CopyBtn text={configJson} id="config" />
            </div>
          </div>

          <div className="p-6 glass-card border-accent/20 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-accent flex items-center gap-2">
              <Zap size={16} /> Claude Code CLI
            </h3>
            <div className="relative group">
              <pre className="text-[10px] bg-black/40 border border-white/5 rounded-xl p-4 pr-12 overflow-x-auto font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
                {claudeCodeCmd}
              </pre>
              <CopyBtn text={claudeCodeCmd} id="claude-code" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-4 items-start translate-y-4 opacity-80 hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
          <Clock size={16} className="text-amber-400" />
        </div>
        <p className="text-xs text-amber-200/70 leading-relaxed italic">
          <strong>Segurança:</strong> O token de acesso é renovado periodicamente. Caso perca a conexão em seu IDE, 
          basta copiar a configuração atualizada acima.
        </p>
      </div>
    </div>
  );
  );
};

export default MCPConfig;
