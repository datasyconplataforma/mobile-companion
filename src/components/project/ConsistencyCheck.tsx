import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, X, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ConsistencyCheckProps {
  projectId: string;
}

const ConsistencyCheck = ({ projectId }: ConsistencyCheckProps) => {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

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

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setResult("");
    setShowPanel(true);

    try {
      const contextSummary = `
## PRD:
${project?.prd_content || "(vazio)"}

## SKILLS/TECNOLOGIAS:
${skills.length > 0 ? skills.map((s: any) => s.name).join(", ") : "(nenhuma)"}

## REGRAS DE NEGÓCIO:
${businessRules?.content || "(vazio)"}

## TAREFAS:
${tasks.length > 0 ? tasks.map((t: any, i: number) => `${i + 1}. [${t.status}] ${t.title} — ${t.description || "sem descrição"}`).join("\n") : "(nenhuma)"}

## PROMPTS:
${prompts.length > 0 ? prompts.map((p: any, i: number) => `${i + 1}. [${(p as any).prompt_type || "implementation"}] ${p.title}: ${p.prompt_text}`).join("\n\n") : "(nenhum)"}

## DOCUMENTOS ANEXADOS:
${documents.filter((d: any) => d.extracted_text).length > 0
  ? documents.filter((d: any) => d.extracted_text).map((d: any, i: number) => `### ${d.file_name}\n${d.extracted_text}`).join("\n\n")
  : "(nenhum)"}
`;

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Você é um auditor sênior de projetos de software. Analise CRITICAMENTE e COMPLETAMENTE o conjunto de informações deste projeto.

## CHECKLIST DE VERIFICAÇÃO (confirme cada item):
- [ ] PRD foi analisado
- [ ] Skills/tecnologias foram verificadas
- [ ] Regras de negócio foram avaliadas
- [ ] Todas as tarefas foram revisadas (incluindo status)
- [ ] Todos os prompts foram analisados (tipo e conteúdo)
- [ ] Todos os documentos anexados foram considerados

## IDENTIFIQUE:

1. **🔴 Contradições** — Informações que se contradizem entre PRD, regras de negócio, documentos, tasks ou prompts. Compare cada elemento com os demais.
2. **🟡 Inconsistências** — Skills listadas que não aparecem no PRD/prompts, ou tecnologias no PRD que não estão nas skills. Prompts que referenciam funcionalidades não descritas no PRD.
3. **🟠 Lacunas** — Regras de negócio que não têm tarefas correspondentes, funcionalidades no PRD sem prompts, tarefas sem prompts associados.
4. **🔵 Redundâncias** — Informações duplicadas ou prompts que cobrem a mesma coisa.
5. **⚠️ Críticas de Boas Práticas** — Avalie a qualidade de cada elemento:
   - PRD: está claro, completo, com critérios de aceite?
   - Tarefas: estão granulares o suficiente? Têm descrições adequadas?
   - Prompts: são específicos e actionable? Têm contexto suficiente para um LLM executar?
   - Regras de negócio: são claras e não ambíguas?
   - Skills: são adequadas para o que o projeto precisa?
   - Documentos: o conteúdo é relevante e está sendo bem aproveitado?
6. **🟢 Sugestões** — Melhorias concretas para tornar o conjunto mais coerente e profissional.

## REGRAS:
- Seja direto e específico. Cite exatamente ONDE está cada problema (ex: "Na tarefa 3...", "No documento X...", "No prompt de revisão...").
- NÃO ignore nenhuma seção, mesmo que esteja vazia (reporte como lacuna).
- Se tudo estiver consistente, diga isso claramente com justificativa.
- Ao final, dê uma nota geral de maturidade do projeto (1-10) com justificativa.

---
${contextSummary}`,
            },
          ],
          projectContext: { prd: project?.prd_content || "" },
          projectId,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              setResult(full);
            }
          } catch {}
        }
      }
    } catch {
      setResult("❌ Erro ao executar a análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <button
        onClick={runAnalysis}
        disabled={isAnalyzing}
        title="Análise de Consistência"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 disabled:opacity-40 transition-all"
      >
        {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        <span className="hidden sm:inline">Revisar</span>
      </button>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                <h2 className="text-sm font-semibold text-foreground">Análise de Consistência</h2>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              {isAnalyzing && !result ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analisando todas as informações do projeto...</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{result || ""}</ReactMarkdown>
                </div>
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
