import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Zap, Copy, Check, Loader2, Plus, Trash2, Pencil, X, Code, Search, Shield, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromptListProps {
  projectId: string;
}

const categoryColors: Record<string, string> = {
  setup: "bg-cyan-500/20 text-cyan-400",
  feature: "bg-primary/20 text-primary",
  ui: "bg-pink-500/20 text-pink-400",
  backend: "bg-orange-500/20 text-orange-400",
  general: "bg-yellow-500/20 text-yellow-400",
};

const categories = ["general", "setup", "feature", "ui", "backend"];

type PromptTab = "implementation" | "review" | "security";

const promptTabs: { key: PromptTab; label: string; icon: typeof Code }[] = [
  { key: "implementation", label: "Implementação", icon: Code },
  { key: "review", label: "Revisão", icon: Search },
  { key: "security", label: "Segurança", icon: Shield },
];

const PromptList = ({ projectId }: PromptListProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", prompt_text: "", category: "general" });
  const [activePromptTab, setActivePromptTab] = useState<PromptTab>("implementation");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ["prompts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_prompts")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addPrompt = useMutation({
    mutationFn: async (input: { title: string; prompt_text: string; category: string }) => {
      const { error } = await supabase.from("project_prompts").insert({
        project_id: projectId,
        user_id: user!.id,
        title: input.title,
        prompt_text: input.prompt_text,
        category: input.category,
        sort_order: filteredPrompts.length,
        prompt_type: activePromptTab,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts", projectId] });
      resetForm();
    },
  });

  const filteredPrompts = prompts.filter((p: any) => (p.prompt_type || "implementation") === activePromptTab);

  const updatePrompt = useMutation({
    mutationFn: async ({ id, ...input }: { id: string; title: string; prompt_text: string; category: string }) => {
      const { error } = await supabase.from("project_prompts").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts", projectId] });
      resetForm();
    },
  });

  const deletePrompt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_prompts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts", projectId] }),
  });

  const resetForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm({ title: "", prompt_text: "", category: "general" });
  };

  const startEdit = (prompt: any) => {
    setEditingId(prompt.id);
    setShowAdd(true);
    setForm({ title: prompt.title, prompt_text: prompt.prompt_text, category: prompt.category });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.prompt_text.trim()) return;
    if (editingId) {
      updatePrompt.mutate({ id: editingId, ...form });
    } else {
      addPrompt.mutate(form);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const { data: project } = await supabase.from("projects").select("prd_content").eq("id", projectId).single();
      const { data: msgs } = await supabase.from("chat_messages").select("role, content").eq("project_id", projectId).order("created_at", { ascending: true }).limit(30);
      const { data: tasks } = await supabase.from("project_tasks").select("title, description").eq("project_id", projectId);
      const { data: docs } = await supabase.from("project_documents").select("file_name, extracted_text").eq("project_id", projectId);
      const { data: skills } = await supabase.from("project_skills" as any).select("name").eq("project_id", projectId);
      const { data: rules } = await supabase.from("project_business_rules" as any).select("content").eq("project_id", projectId).maybeSingle();

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...(msgs || []).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: "Atualize os prompts do projeto. Use as ferramentas para salvar." },
          ],
          projectContext: {
            prd: project?.prd_content || "",
            tasks: (tasks || []).map((t) => ({ title: t.title, completed: false })),
            prompts: prompts.map((p) => ({ title: p.title, content: p.prompt_text })),
            documents: (docs || []).filter((d) => d.extracted_text).map((d) => ({ name: d.file_name, content: d.extracted_text })),
            skills: ((skills || []) as any[]).map((s: any) => s.name),
            businessRules: (rules as any)?.content || "",
          },
          projectId,
          userId: user!.id,
          action: "generate",
        }),
      });

      if (!resp.ok) throw new Error("Failed");
      await resp.json();

      queryClient.invalidateQueries({ queryKey: ["prompts", projectId] });
      toast({ title: "Prompts atualizados! ✨" });
    } catch {
      toast({ title: "Erro", description: "Falha ao atualizar prompts.", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
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
      {/* Sub-tabs */}
      <div className="shrink-0 flex items-center border-b border-border bg-card/30 px-4">
        <div className="flex flex-1">
          {promptTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActivePromptTab(tab.key); resetForm(); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                activePromptTab === tab.key
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:shadow-glow transition-all"
        >
          {isRegenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Atualizar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="max-w-lg mx-auto">
        {filteredPrompts.length === 0 && !showAdd ? (
          <div className="text-center py-12">
            <Zap size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Nenhum prompt de {promptTabs.find(t => t.key === activePromptTab)?.label.toLowerCase()} ainda.</p>
            <p className="text-xs text-muted-foreground">Adicione manualmente ou peça à IA no chat.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPrompts.map((prompt) => (
              <div key={prompt.id} className="p-4 rounded-xl bg-card border border-border group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{prompt.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[prompt.category] || categoryColors.general}`}>
                      {prompt.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(prompt)}
                      className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deletePrompt.mutate(prompt.id)}
                      className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={() => handleCopy(prompt.id, prompt.prompt_text)}
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedId === prompt.id ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                  {prompt.prompt_text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit form */}
        {showAdd ? (
          <form onSubmit={handleSubmit} className="mt-3 p-4 rounded-xl bg-card border border-primary/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{editingId ? "Editar prompt" : "Novo prompt"}</span>
              <button type="button" onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título do prompt..."
              className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
              value={form.prompt_text}
              onChange={(e) => setForm({ ...form, prompt_text: e.target.value })}
              placeholder="Texto do prompt para a Lovable..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Categoria:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${
                    form.category === cat ? categoryColors[cat] : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!form.title.trim() || !form.prompt_text.trim()}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {editingId ? "Salvar" : "Criar prompt"}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 text-sm transition-all"
          >
            <Plus size={14} />
            Adicionar prompt
          </button>
        )}
      </div>
      </div>
    </div>
  );
};

export default PromptList;
