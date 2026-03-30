import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, Globe, FolderOpen, Plus, Loader2, X, Check } from "lucide-react";
import SkillCard from "@/components/skills/SkillCard";

interface ProjectSkillsProps {
  projectId: string;
}

const SUGGESTED_SKILLS = [
  "React", "TypeScript", "Tailwind CSS", "Supabase", "Node.js",
  "PostgreSQL", "REST API", "GraphQL", "Firebase", "Stripe",
];

const ProjectSkills = ({ projectId }: ProjectSkillsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  // Project-specific skills
  const { data: projectSkills = [], isLoading: loadingPS } = useQuery({
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

  // All global skills
  const { data: globalSkills = [], isLoading: loadingGS } = useQuery({
    queryKey: ["global_skills", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_skills" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["skill_assignments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_project_assignments" as any)
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
  });

  // Determine which global skills are active for this project
  const projectAssignments = assignments.filter((a: any) => a.project_id === projectId);
  const hasAnyAssignments = assignments.length > 0;
  const activeGlobalSkills = hasAnyAssignments
    ? globalSkills.filter((s: any) => projectAssignments.some((a: any) => a.skill_id === s.id))
    : globalSkills; // If no assignments configured, all global apply

  const addProjectSkill = useMutation({
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

  const removeProjectSkill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_skills" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills", projectId] }),
  });

  const toggleGlobalSkill = useMutation({
    mutationFn: async (skillId: string) => {
      const existing = assignments.find(
        (a: any) => a.skill_id === skillId && a.project_id === projectId
      );
      if (existing) {
        await supabase.from("skill_project_assignments" as any).delete().eq("id", existing.id);
      } else {
        await supabase.from("skill_project_assignments" as any).insert({
          skill_id: skillId,
          skill_type: "global",
          project_id: projectId,
          user_id: user!.id,
        } as any);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skill_assignments", user?.id] }),
  });

  const allNames = new Set([
    ...projectSkills.map((s: any) => s.name.toLowerCase()),
    ...globalSkills.map((s: any) => s.name.toLowerCase()),
  ]);

  const handleAdd = (name: string) => {
    if (!name.trim() || allNames.has(name.trim().toLowerCase())) return;
    addProjectSkill.mutate(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(input); }
  };

  const suggestions = SUGGESTED_SKILLS.filter((s) => !allNames.has(s.toLowerCase()));

  if (loadingPS || loadingGS) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Active global skills for this project */}
        {globalSkills.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Globe size={14} /> Skills Globais
            </h2>
            <p className="text-xs text-muted-foreground">
              {hasAnyAssignments
                ? "Clique para ativar/desativar skills globais neste projeto."
                : "Todas as skills globais estão ativas (nenhuma seleção feita ainda)."}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {globalSkills.map((skill: any) => {
                const isActive = !hasAnyAssignments || projectAssignments.some((a: any) => a.skill_id === skill.id);
                return (
                  <button
                    key={skill.id}
                    onClick={() => toggleGlobalSkill.mutate(skill.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && <Check size={10} />}
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Project-specific skills */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <FolderOpen size={14} /> Skills do Projeto
          </h2>

          {projectSkills.length > 0 && (
            <div className="space-y-2">
              {projectSkills.map((skill: any) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  table="project_skills"
                  showProjectAssign={false}
                  projects={[]}
                  assignments={[]}
                  onRemove={(id) => removeProjectSkill.mutate(id)}
                  onToggleAssign={() => {}}
                />
              ))}
            </div>
          )}

          {/* Add skill input */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Adicionar skill ao projeto..."
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

          {suggestions.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground mb-1 block">Sugestões:</span>
              <div className="flex flex-wrap gap-1">
                {suggestions.map((s) => (
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

        {projectSkills.length === 0 && activeGlobalSkills.length === 0 && (
          <div className="text-center py-8">
            <Wrench size={28} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma skill aplicada a este projeto.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione skills acima ou gerencie na página centralizada de Skills.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSkills;
