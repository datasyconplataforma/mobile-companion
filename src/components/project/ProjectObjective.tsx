import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, Check, Pencil, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectObjectiveProps {
  projectId: string;
  description?: string | null;
}

const ProjectObjective = ({ projectId, description }: ProjectObjectiveProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description || "");

  useEffect(() => {
    setDraft(description || "");
  }, [description]);

  const saveObjective = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ description: text })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setIsEditing(false);
      toast({ title: "Objetivo salvo! ✅" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar objetivo.", variant: "destructive" });
    },
  });

  const charCount = draft.length;
  const maxChars = 500;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Target size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Objetivo Principal</h2>
            <p className="text-xs text-muted-foreground">
              Descreva em poucas linhas o que o projeto deve alcançar. Este objetivo será usado como contexto em todas as etapas.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            01
          </span>
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Etapa 1 de 4
          </span>
        </div>

        {/* Content Card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3 border-b border-border bg-card/80 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target size={14} className="text-primary" />
              Objetivo do Projeto
            </span>
            {!isEditing && description && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Pencil size={12} /> Editar
              </button>
            )}
          </div>

          {/* Card Body */}
          <div className="p-5">
            {isEditing || !description ? (
              <div className="space-y-3">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => {
                    if (e.target.value.length <= maxChars) setDraft(e.target.value);
                  }}
                  placeholder="Ex: Criar um aplicativo de gestão financeira pessoal que permita aos usuários controlar despesas, definir metas de economia e visualizar relatórios mensais de forma intuitiva..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono ${charCount > maxChars * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
                    {charCount}/{maxChars}
                  </span>
                  <div className="flex items-center gap-2">
                    {description && (
                      <button
                        onClick={() => { setDraft(description); setIsEditing(false); }}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:text-foreground transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      onClick={() => saveObjective.mutate(draft.trim())}
                      disabled={!draft.trim() || saveObjective.isPending}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:shadow-glow transition-all"
                    >
                      {saveObjective.isPending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      Salvar Objetivo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] text-muted-foreground">
                    Este objetivo será incluído como contexto no Chat, Debate e geração do PRD.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <h4 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">💡 Dicas para um bom objetivo</h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Seja específico sobre o problema que o projeto resolve
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Mencione o público-alvo principal
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Inclua as funcionalidades-chave em alto nível
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Evite detalhes técnicos — esses virão nas próximas etapas
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProjectObjective;
