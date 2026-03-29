import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { FileText, Pencil, Eye, Save, Loader2, RefreshCw } from "lucide-react";

interface PRDViewProps {
  projectId: string;
  prdContent?: string | null;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const PRDView = ({ projectId, prdContent, onRegenerate, isRegenerating }: PRDViewProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(prdContent || "");

  const savePrd = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ prd_content: content })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setIsEditing(false);
    },
  });

  const startEdit = () => {
    setEditContent(prdContent || "");
    setIsEditing(true);
  };

  if (!prdContent && !isEditing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <FileText size={32} className="text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
          O PRD será gerado conforme você conversa no chat, ou você pode criar manualmente.
        </p>
        <button
          onClick={() => { setEditContent("# PRD — Meu Projeto\n\n## Objetivo\n\n## Público-alvo\n\n## Funcionalidades\n\n## Stack técnica\n\n## Design\n\n## Autenticação\n\n## Dados\n\n## Integrações\n"); setIsEditing(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:shadow-glow transition-all"
        >
          <Pencil size={14} />
          Criar PRD
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-2 border-b border-border bg-card/50">
        {isEditing ? (
          <>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-secondary transition-colors"
            >
              <Eye size={13} />
              Visualizar
            </button>
            <button
              onClick={() => savePrd.mutate(editContent)}
              disabled={savePrd.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
            >
              {savePrd.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Salvar
            </button>
          </>
        ) : (
          <button
            onClick={startEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-secondary transition-colors"
          >
            <Pencil size={13} />
            Editar
          </button>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 p-4 bg-background text-foreground text-sm font-mono leading-relaxed focus:outline-none resize-none scrollbar-thin"
          placeholder="Escreva seu PRD em markdown..."
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <div className="max-w-2xl mx-auto prose-chat">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold text-foreground mt-3 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold text-foreground mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="text-sm text-foreground mb-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 text-sm text-foreground space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 text-sm text-foreground space-y-1">{children}</ol>,
                strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
              }}
            >
              {prdContent || ""}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default PRDView;
