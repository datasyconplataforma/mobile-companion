import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Github, Loader2, Link2, Unlink, Search, FileCode, AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

interface GitHubConnectionProps {
  projectId: string;
  githubRepoUrl?: string | null;
  onRepoUpdated: () => void;
}

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
    const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) return { owner: match[1], repo: match[2] };
  } catch {}
  return null;
}

const GitHubConnection = ({ projectId, githubRepoUrl, onRepoUpdated }: GitHubConnectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState(githubRepoUrl || "");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [repoTree, setRepoTree] = useState<string[] | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);

  useEffect(() => {
    if (open) {
      setRepoUrl(githubRepoUrl || "");
      setAnalysisResult(null);
      setRepoTree(null);
      // Load saved token
      if (projectId) {
        supabase.from("projects").select("github_token").eq("id", projectId).single().then(({ data }) => {
          setToken((data as any)?.github_token || "");
        });
      }
    }
  }, [open, githubRepoUrl, projectId]);

  const handleSaveRepo = async () => {
    if (!user) return;
    const parsed = parseGithubUrl(repoUrl);
    if (repoUrl && !parsed) {
      toast({ title: "URL inválida", description: "Use o formato: https://github.com/owner/repo", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({ github_repo_url: repoUrl || null, github_token: token || null } as any)
      .eq("id", projectId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      return;
    }
    toast({ title: repoUrl ? "Repositório conectado! ✅" : "Repositório desconectado" });
    onRepoUpdated();
  };

  const handleDisconnect = async () => {
    setSaving(true);
    await supabase.from("projects").update({ github_repo_url: null, github_token: null } as any).eq("id", projectId);
    setSaving(false);
    setRepoUrl("");
    setToken("");
    setRepoTree(null);
    setAnalysisResult(null);
    onRepoUpdated();
    toast({ title: "Repositório desconectado" });
  };

  const handleLoadTree = async () => {
    const parsed = parseGithubUrl(githubRepoUrl || repoUrl);
    if (!parsed) return;
    setLoadingTree(true);
    try {
      const headers: Record<string, string> = { "User-Agent": "CodeBuddy-App" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const resp = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/main?recursive=1`, { headers });
      if (!resp.ok) {
        const resp2 = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/master?recursive=1`, { headers });
        if (!resp2.ok) throw new Error("Não foi possível acessar o repositório. Verifique a URL e o token.");
        const data = await resp2.json();
        setRepoTree(data.tree?.filter((t: any) => t.type === "blob").map((t: any) => t.path) || []);
      } else {
        const data = await resp.json();
        setRepoTree(data.tree?.filter((t: any) => t.type === "blob").map((t: any) => t.path) || []);
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoadingTree(false);
    }
  };

  const handleAnalyze = async () => {
    if (!githubRepoUrl && !repoUrl) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-analyze`;
      const resp = await fetch(ANALYZE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ projectId }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Falha na análise");
      }
      const data = await resp.json();
      setAnalysisResult(data.analysis);
    } catch (err: any) {
      toast({ title: "Erro na análise", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const isConnected = !!githubRepoUrl;
  const parsed = parseGithubUrl(githubRepoUrl || "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={`p-1.5 transition-colors ${isConnected ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground hover:text-foreground"}`}
          title={isConnected ? `GitHub: ${parsed?.owner}/${parsed?.repo}` : "Conectar GitHub"}
        >
          <Github size={16} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github size={18} /> Repositório GitHub
          </DialogTitle>
          <DialogDescription>
            Conecte um repositório para confrontar o código com o projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Connection section */}
          {!isConnected ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">URL do Repositório</Label>
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="font-mono text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <KeyRound size={12} />
                  Token (opcional — para repos privados)
                </Label>
                <div className="relative mt-1">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Crie em GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens (permissão: Contents read-only)
                </p>
              </div>
              <Button onClick={handleSaveRepo} disabled={saving || !repoUrl} className="w-full" size="sm">
                {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Link2 size={14} className="mr-1" />}
                Conectar Repositório
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-400 font-medium truncate">
                  {parsed?.owner}/{parsed?.repo}
                </span>
                <button
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="ml-auto text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Desconectar"
                >
                  <Unlink size={14} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleLoadTree} disabled={loadingTree} variant="outline" size="sm" className="flex-1">
                  {loadingTree ? <Loader2 size={14} className="animate-spin mr-1" /> : <FileCode size={14} className="mr-1" />}
                  Ver Estrutura
                </Button>
                <Button onClick={handleAnalyze} disabled={analyzing} size="sm" className="flex-1">
                  {analyzing ? <Loader2 size={14} className="animate-spin mr-1" /> : <Search size={14} className="mr-1" />}
                  Analisar vs Projeto
                </Button>
              </div>
            </div>
          )}

          {/* Repo tree */}
          {repoTree && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Estrutura ({repoTree.length} arquivos)
              </p>
              <ScrollArea className="h-36 rounded-md border border-border">
                <div className="p-2 space-y-0.5">
                  {repoTree.map((path) => (
                    <div key={path} className="text-[11px] font-mono text-foreground/80 py-0.5 px-1 rounded hover:bg-secondary truncate">
                      {path}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Analysis result */}
          {analyzing && (
            <div className="flex items-center gap-2 justify-center py-6">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Analisando repositório vs projeto...</span>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-1 flex-1 min-h-0">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-400" />
                Relatório de Análise
              </p>
              <ScrollArea className="flex-1 max-h-[40vh] rounded-md border border-border">
                <div className="p-3 prose prose-sm prose-invert max-w-none text-xs">
                  <ReactMarkdown>{analysisResult}</ReactMarkdown>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GitHubConnection;
