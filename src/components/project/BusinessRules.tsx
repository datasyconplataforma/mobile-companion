import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Scale, Save, Sparkles, Loader2, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface BusinessRulesProps {
  projectId: string;
}

const BusinessRules = ({ projectId }: BusinessRulesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rules, setRules] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newRule, setNewRule] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: dbRecord, isLoading } = useQuery({
    queryKey: ["business_rules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_business_rules")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (dbRecord?.content) {
      const parsed = dbRecord.content
        .split("\n")
        .map((l) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l) => l.length > 0);
      setRules(parsed);
    }
  }, [dbRecord]);

  const serializeRules = (list: string[]) =>
    list.map((r, i) => `${i + 1}. ${r}`).join("\n");

  const saveToDb = async (list: string[]) => {
    setIsSaving(true);
    const content = serializeRules(list);
    try {
      if (dbRecord?.id) {
        const { error } = await supabase
          .from("project_business_rules")
          .update({ content, updated_at: new Date().toISOString() })
          .eq("id", dbRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_business_rules").insert({
          project_id: projectId,
          user_id: user!.id,
          content,
        });
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

  const handleAdd = () => {
    if (!newRule.trim()) return;
    const updated = [...rules, newRule.trim()];
    setRules(updated);
    setNewRule("");
    setIsAdding(false);
    saveToDb(updated);
  };

  const handleImproveWithAI = async () => {
    if (!newRule.trim()) {
      toast({ title: "Aviso", description: "Digite uma regra para a IA melhorar.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const { data: project } = await supabase
        .from("projects")
        .select("prd_content, name")
        .eq("id", projectId)
        .single();

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
              content: `Melhore e refine a seguinte regra de negócio para o projeto "${project?.name}". Torne-a mais clara, objetiva e profissional. Mantenha o mesmo sentido original. Responda APENAS com o texto da regra melhorada, sem numeração, sem introdução, sem explicação.\n\nRegra original: "${newRule.trim()}"${project?.prd_content ? `\n\nContexto do PRD:\n${project.prd_content}` : ""}`,
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
            if (delta) full += delta;
          } catch {}
        }
      }

      const improved = full.replace(/^\d+\.\s*/, "").trim();
      if (improved) {
        setNewRule(improved);
        toast({ title: "Melhorado! ✨", description: "Revise e salve a regra." });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao melhorar regra.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (index: number) => {
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
    saveToDb(updated);
  };

  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditValue(rules[index]);
  };

  const handleEditSave = () => {
    if (editingIndex === null || !editValue.trim()) return;
    const updated = [...rules];
    updated[editingIndex] = editValue.trim();
    setRules(updated);
    setEditingIndex(null);
    setEditValue("");
    saveToDb(updated);
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    try {
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

      const existingContent = serializeRules(rules);
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
${existingContent ? `\n\nRegras existentes para complementar:\n${existingContent}` : ""}
${project?.prd_content ? `\n\nPRD:\n${project.prd_content}` : ""}
Responda APENAS com as regras numeradas, sem introdução.`,
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
            if (delta) full += delta;
          } catch {}
        }
      }

      const generated = full
        .split("\n")
        .map((l) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l) => l.length > 0);
      setRules(generated);
      saveToDb(generated);
      toast({ title: "Gerado! ✨", description: "Revise as regras geradas." });
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
          Regras de Negócio ({rules.length})
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-all"
          >
            <Plus size={13} />
            Adicionar
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin space-y-2">
        {isAdding && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-card border border-primary/30">
            <textarea
              autoFocus
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); }
                if (e.key === "Escape") { setIsAdding(false); setNewRule(""); }
              }}
              placeholder="Digite a nova regra de negócio..."
              className="flex-1 bg-transparent text-foreground text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none resize-none min-h-[40px]"
              rows={2}
            />
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleAdd} className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-all">
                <Check size={14} />
              </button>
              <button onClick={() => { setIsAdding(false); setNewRule(""); }} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground transition-all">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {rules.length === 0 && !isAdding && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-3">
            <Scale size={32} className="opacity-40" />
            <p>Nenhuma regra de negócio cadastrada.</p>
            <p className="text-xs">Clique em "Adicionar" ou "Gerar com IA" para começar.</p>
          </div>
        )}

        {rules.map((rule, index) => (
          <div
            key={index}
            className="group flex items-start gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-all"
          >
            <span className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </span>

            {editingIndex === index ? (
              <div className="flex-1 flex items-start gap-2">
                <textarea
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                    if (e.key === "Escape") handleEditCancel();
                  }}
                  className="flex-1 bg-transparent text-foreground text-sm leading-relaxed focus:outline-none resize-none min-h-[40px]"
                  rows={2}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={handleEditSave} className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-all">
                    <Check size={14} />
                  </button>
                  <button onClick={handleEditCancel} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground transition-all">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="flex-1 text-sm text-foreground leading-relaxed">{rule}</p>
                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditStart(index)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(index)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {isSaving && (
        <div className="shrink-0 px-4 py-2 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={12} className="animate-spin" />
          Salvando...
        </div>
      )}
    </div>
  );
};

export default BusinessRules;
