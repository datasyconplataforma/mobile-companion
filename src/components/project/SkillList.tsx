import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Plus, Loader2, Wrench } from "lucide-react";

interface SkillListProps {
  projectId: string;
}

const SUGGESTED_SKILLS = [
  "React", "TypeScript", "Tailwind CSS", "Supabase", "Node.js",
  "PostgreSQL", "REST API", "GraphQL", "Firebase", "Stripe",
  "Next.js", "React Native", "Docker", "Redis", "AWS",
  "Prisma", "Drizzle", "Zod", "React Query", "Zustand",
];

const SkillList = ({ projectId }: SkillListProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["skills", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_skills" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const addSkill = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("project_skills" as any).insert({
        project_id: projectId,
        user_id: user!.id,
        name: name.trim(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", projectId] });
      setInput("");
    },
  });

  const removeSkill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_skills" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills", projectId] }),
  });

  const handleAdd = (name: string) => {
    if (!name.trim()) return;
    if (skills.some((s: any) => s.name.toLowerCase() === name.trim().toLowerCase())) return;
    addSkill.mutate(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd(input);
    }
  };

  const existingNames = new Set(skills.map((s: any) => s.name.toLowerCase()));
  const suggestions = SUGGESTED_SKILLS.filter((s) => !existingNames.has(s.toLowerCase()));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Wrench size={14} />
        Skills / Tecnologias
      </div>

      {/* Current skills */}
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill: any) => (
          <span
            key={skill.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium"
          >
            {skill.name}
            <button
              onClick={() => removeSkill.mutate(skill.id)}
              className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar skill..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={() => handleAdd(input)}
          disabled={!input.trim()}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground mb-1 block">Sugestões:</span>
          <div className="flex flex-wrap gap-1">
            {suggestions.slice(0, 10).map((s) => (
              <button
                key={s}
                onClick={() => handleAdd(s)}
                className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors hover:bg-secondary/80"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillList;
