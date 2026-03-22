import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";

interface PromptListProps {
  projectId: string;
}

const categoryColors: Record<string, string> = {
  setup: "bg-terminal-cyan/20 text-terminal-cyan",
  feature: "bg-primary/20 text-primary",
  ui: "bg-terminal-pink/20 text-terminal-pink",
  backend: "bg-terminal-orange/20 text-terminal-orange",
  general: "bg-terminal-yellow/20 text-terminal-yellow",
};

const PromptList = ({ projectId }: PromptListProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <Zap size={32} className="text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Os prompts prontos para a Lovable serão gerados após a construção do PRD. Continue no chat!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
      <div className="max-w-lg mx-auto space-y-3">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{prompt.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[prompt.category]}`}>
                  {prompt.category}
                </span>
              </div>
              <button
                onClick={() => handleCopy(prompt.id, prompt.prompt_text)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedId === prompt.id ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
              {prompt.prompt_text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PromptList;
