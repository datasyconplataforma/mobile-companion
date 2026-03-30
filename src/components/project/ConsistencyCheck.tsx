import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, X, ShieldCheck, ChevronDown, ChevronRight, Clock, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ConsistencyCheckProps {
  projectId: string;
  onSendToChat?: (message: string) => void;
}

interface DebateData {
  happened: boolean;
  initialAudit: string;
  reviewFeedback: string | null;
  finalAudit: string;
  mainProvider: string;
  reviewerProvider: string;
  durationMs: number;
}

const providerLabel = (p: string) =>
  ({ lovable: "Lovable AI", gemini: "Google Gemini", openrouter: "OpenRouter", claude: "Claude", ollama: "Ollama" }[p] || p);

interface FixPrompt {
  title: string;
  prompt: string;
  severity: string;
}

const ConsistencyCheck = ({ projectId, onSendToChat }: ConsistencyCheckProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [fixPrompts, setFixPrompts] = useState<FixPrompt[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ final: true });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId).single();
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("project_tasks").select("*").eq("project_id", projectId).order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("project_prompts").select("*").eq("project_id", projectId).order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("project_documents").select("*").eq("project_id", projectId);
      return data || [];
    },
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["skills", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("project_skills" as any).select("*").eq("project_id", projectId);
      return (data || []) as any[];
    },
  });

  const { data: businessRules } = useQuery({
    queryKey: ["business_rules", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("project_business_rules" as any).select("*").eq("project_id", projectId).maybeSingle();
      return data as any;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages").select("*").eq("project_id", projectId).order("created_at", { ascending: true });
      return data || [];
    },
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setResult(null);
    setDebate(null);
    setFixPrompts([]);
    setCurrentStep(1);
    setShowPanel(true);
    setExpandedSections({ final: true });

    try {
      const chatSummary = messages.length > 0
        ? messages.slice(-20).map((m: any) => `[${m.role}]: ${m.content.slice(0, 300)}`).join("\n")
        : "(sem mensagens)";

      const auditContext = `
## PRD:
${project?.prd_content || "(vazio)"}

## SKILLS/TECNOLOGIAS:
${skills.length > 0 ? skills.map((s: any) => `- ${s.name}${s.context_md ? `: ${s.context_md.slice(0, 200)}` : ""}`).join("\n") : "(nenhuma)"}

## REGRAS DE NEGÓCIO:
${businessRules?.content || "(vazio)"}

## TAREFAS (${tasks.length}):
${tasks.length > 0 ? tasks.map((t: any, i: number) => `${i + 1}. [${t.status}] ${t.title} — ${t.description || "sem descrição"}`).join("\n") : "(nenhuma)"}

## PROMPTS (${prompts.length}):
${prompts.length > 0 ? prompts.map((p: any, i: number) => `${i + 1}. [${(p as any).prompt_type || "implementation"}/${p.category}] ${p.title}: ${p.prompt_text.slice(0, 300)}`).join("\n\n") : "(nenhum)"}

## DOCUMENTOS ANEXADOS (${documents.length}):
${documents.filter((d: any) => d.extracted_text).length > 0
  ? documents.filter((d: any) => d.extracted_text).map((d: any) => `### ${d.file_name}\n${d.extracted_text?.slice(0, 1000)}`).join("\n\n")
  : "(nenhum)"}

## HISTÓRICO DO CHAT (últimas 20 mensagens):
${chatSummary}
`;

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [],
          projectContext: { auditContext, prd: project?.prd_content || "" },
          projectId,
          userId: user!.id,
          action: "audit",
        }),
      });

      if (!resp.ok) throw new Error("Failed");

      const data = await resp.json();
      setResult(data.result);
      setDebate(data.debate);
      setFixPrompts(data.fixPrompts || []);
      setCurrentStep(3);

      // Invalidate debates list
      queryClient.invalidateQueries({ queryKey: ["debates", projectId] });
    } catch {
      setResult("❌ Erro ao executar a análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const steps = [
    { label: "Auditor Principal analisa o projeto", step: 1 },
    { label: "Contra-Auditor revisa o relatório", step: 2 },
    { label: "Relatório final consolidado", step: 3 },
  ];

  return (
    <>
      <button
        onClick={runAnalysis}
        disabled={isAnalyzing}
        title="Análise de Consistência (Dual AI)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 disabled:opacity-40 transition-all"
      >
        {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        <span className="hidden sm:inline">Revisar</span>
      </button>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                <h2 className="text-sm font-semibold text-foreground">Análise de Consistência — Dual AI</h2>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Progress Steps */}
            {isAnalyzing && (
              <div className="shrink-0 px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-4">
                  {steps.map((s) => (
                    <div key={s.step} className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        currentStep > s.step ? "bg-primary text-primary-foreground"
                          : currentStep === s.step ? "bg-primary/20 text-primary border border-primary animate-pulse"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {currentStep > s.step ? "✓" : s.step}
                      </div>
                      <span className={`text-xs ${currentStep >= s.step ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin space-y-4">
              {isAnalyzing && !result ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {currentStep === 1 && "Auditor Principal analisando todos os controles do projeto..."}
                    {currentStep === 2 && "Contra-Auditor revisando o relatório..."}
                    {currentStep === 3 && "Consolidando relatório final..."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Debate Info */}
                  {debate && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          ⚔️ Processo Dual AI
                        </h3>
                        {debate.durationMs && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock size={10} />
                            {(debate.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-card p-2 border border-border">
                          <span className="text-muted-foreground">Auditor:</span>{" "}
                          <span className="font-medium text-foreground">{providerLabel(debate.mainProvider)}</span>
                        </div>
                        <div className="rounded-lg bg-card p-2 border border-border">
                          <span className="text-muted-foreground">Contra-Auditor:</span>{" "}
                          <span className="font-medium text-foreground">{providerLabel(debate.reviewerProvider)}</span>
                        </div>
                      </div>

                      {/* Expandable: Initial Audit */}
                      {debate.initialAudit && (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <button onClick={() => toggleSection("initial")}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-card/50 transition-colors">
                            {expandedSections.initial ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            📝 Etapa 1 — Auditoria Inicial
                          </button>
                          {expandedSections.initial && (
                            <div className="p-3 border-t border-border prose prose-sm prose-invert max-w-none">
                              <ReactMarkdown>{debate.initialAudit}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expandable: Review Feedback */}
                      {debate.reviewFeedback && (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <button onClick={() => toggleSection("review")}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-card/50 transition-colors">
                            {expandedSections.review ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            🔍 Etapa 2 — Contra-Auditoria
                          </button>
                          {expandedSections.review && (
                            <div className="p-3 border-t border-border prose prose-sm prose-invert max-w-none">
                              <ReactMarkdown>{debate.reviewFeedback}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expandable: Final (default open) */}
                      <div className="border border-primary/30 rounded-lg overflow-hidden">
                        <button onClick={() => toggleSection("final")}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary bg-primary/5 transition-colors">
                          {expandedSections.final ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          ✅ Etapa 3 — Relatório Final Consolidado
                        </button>
                        {expandedSections.final && (
                          <div className="p-3 border-t border-primary/20 prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown>{result || ""}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fallback: no debate data (error case) */}
                  {!debate && result && (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition-all"
              >
                {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                Reanalisar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConsistencyCheck;
