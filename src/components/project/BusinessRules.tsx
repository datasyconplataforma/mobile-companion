import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Scale, Save, Sparkles, Loader2, Pencil, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

interface BusinessRulesProps {
  projectId: string;
}

const BusinessRules = ({ projectId }: BusinessRulesProps) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["business_rules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_business_rules" as any)
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (rules?.content !== undefined) {
      setContent(rules.content);
    }
  }, [rules]);

  const saveRules = async () => {
    setIsSaving(true);
    try {
      if (rules?.id) {
        const { error } = await supabase
          .from("project_business_rules" as any)
          .update({ content, updated_at: new Date().toISOString() } as any)
          .eq("id", rules.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_business_rules" as any).insert({
          project_id: projectId,
          user_id: user!.id,
          content,
        } as any);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["business_rules", projectId] });
      toast({ title: "Salvo!", description: "Regras de negócio atualizadas." });
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    try {
      // Fetch project context
      const { data: project } = await supabase
        .from("projects")
        .select("prd_content, name")
        .eq("id", projectId)
        .single();

      const { data: messages } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .limit(20);

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...(messages || []).map((m) => ({ role: m.role, content: m.content })),
            {
              role: "user",
              content: `Baseado no PRD e na conversa, gere uma lista completa de REGRAS DE NEGÓCIO para o projeto "${project?.name}". 
              
Formato: lista numerada com regras claras e objetivas. Inclua validações, permissões, limites, fluxos obrigatórios e restrições.
${content ? `\n\nRegras existentes para complementar:\n${content}` : ""}
${project?.prd_content ? `\n\nPRD:\n${project.prd_content}` : ""}

Responda APENAS com as regras, sem introdução.`,
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
              setContent(full);
            }
          } catch {}
        }
      }

      toast({ title: "Gerado! ✨", description: "Revise e salve as regras." });
    } catch {
      toast({ title: "Erro", description: "Falha ao gerar regras.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Scale size={15} />
          Regras de Negócio
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateWithAI}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 disabled:opacity-40 transition-all"
          >
            {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Gerar com IA
          </button>
          <button
            onClick={saveRules}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition-all"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Salvar
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Digite ou gere as regras de negócio do projeto...&#10;&#10;Exemplo:&#10;1. O cliente só pode resgatar cashback após 7 dias da compra&#10;2. O valor mínimo de resgate é R$ 5,00&#10;3. Apenas administradores podem lançar transações"
          className="w-full h-full min-h-[300px] px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>
    </div>
  );
};

export default BusinessRules;
