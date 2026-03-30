import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Wrench, Globe, FolderOpen, Plus, X, Loader2, Github, Check,
} from "lucide-react";

const SUGGESTED_SKILLS = [
  "React", "TypeScript", "Tailwind CSS", "Supabase", "Node.js",
  "PostgreSQL", "REST API", "GraphQL", "Firebase", "Stripe",
  "Next.js", "React Native", "Docker", "Redis", "AWS",
  "Prisma", "Drizzle", "Zod", "React Query", "Zustand",
];

const SkillsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<"global" | "project">("global");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // All user projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects").select("id, name").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Global skills
  const { data: globalSkills = [], isLoading: loadingGlobal } = useQuery({
    queryKey: ["global_skills", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_skills" as any).select("*").eq("user_id", user!.id).order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Project skills
  const { data: projectSkills = [], isLoading: loadingProject } = useQuery({
    queryKey: ["all_project_skills", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get all project skills for this user's projects
      const { data: userProjects } = await supabase
        .from("projects").select("id").eq("user_id", user!.id);
      if (!userProjects || userProjects.length === 0) return [];
      const projectIds = userProjects.map((p) => p.id);
      const { data, error } = await supabase
        .from("project_skills" as any).select("*").in("project_id", projectIds).order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Skill-project assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["skill_assignments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_project_assignments" as any).select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
  });

  const addGlobalSkill = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("global_skills" as any).insert({
        user_id: user!.id, name: name.trim(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global_skills", user?.id] });
      setInput("");
    },
  });

  const addProjectSkill = useMutation({
    mutationFn: async (name: string) => {
      if (!selectedProjectId) return;
      const { error } = await supabase.from("project_skills" as any).insert({
        project_id: selectedProjectId, user_id: user!.id, name: name.trim(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_project_skills", user?.id] });
      setInput("");
    },
  });

  const removeGlobalSkill = useMutation({
    mutationFn: async (id: string) => {
      // Also remove assignments
      await supabase.from("skill_project_assignments" as any).delete().eq("skill_id", id).eq("skill_type", "global");
      const { error } = await supabase.from("global_skills" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global_skills", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["skill_assignments", user?.id] });
    },
  });

  const removeProjectSkill = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("skill_project_assignments" as any).delete().eq("skill_id", id).eq("skill_type", "project");
      const { error } = await supabase.from("project_skills" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_project_skills", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["skill_assignments", user?.id] });
    },
  });

  const toggleAssignment = useMutation({
    mutationFn: async ({ skillId, skillType, projectId }: { skillId: string; skillType: string; projectId: string }) => {
      const existing = assignments.find(
        (a: any) => a.skill_id === skillId && a.project_id === projectId
      );
      if (existing) {
        await supabase.from("skill_project_assignments" as any).delete().eq("id", existing.id);
      } else {
        await supabase.from("skill_project_assignments" as any).insert({
          skill_id: skillId, skill_type: skillType, project_id: projectId, user_id: user!.id,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill_assignments", user?.id] });
    },
  });

  const allSkillNames = new Set([
    ...globalSkills.map((s: any) => s.name.toLowerCase()),
    ...projectSkills.map((s: any) => s.name.toLowerCase()),
  ]);

  const handleAdd = (name: string) => {
    if (!name.trim() || allSkillNames.has(name.trim().toLowerCase())) return;
    if (scope === "global") {
      addGlobalSkill.mutate(name);
    } else {
      if (!selectedProjectId) return;
      addProjectSkill.mutate(name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(input); }
  };

  const suggestions = SUGGESTED_SKILLS.filter((s) => !allSkillNames.has(s.toLowerCase()));

  const isAssigned = (skillId: string, projectId: string) =>
    assignments.some((a: any) => a.skill_id === skillId && a.project_id === projectId);

  const getAssignedProjects = (skillId: string) =>
    assignments.filter((a: any) => a.skill_id === skillId).map((a: any) => a.project_id);

  if (loadingGlobal || loadingProject) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-background">
      <header className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <button onClick={() => navigate("/")} className="p-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </button>
        <Wrench size={16} className="text-primary" />
        <span className="font-semibold text-sm text-foreground">Skills & Tecnologias</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Add skill */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Adicionar Skill</h2>
            <div className="flex gap-2">
              <div className="flex rounded-lg bg-secondary overflow-hidden shrink-0">
                <button
                  onClick={() => setScope("global")}
                  className={`px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1 ${
                    scope === "global" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe size={13} /> Global
                </button>
                <button
                  onClick={() => setScope("project")}
                  className={`px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1 ${
                    scope === "project" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FolderOpen size={13} /> Projeto
                </button>
              </div>
              {scope === "project" && (
                <select
                  value={selectedProjectId || ""}
                  onChange={(e) => setSelectedProjectId(e.target.value || null)}
                  className="px-2 py-1.5 rounded-lg bg-secondary text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Selecionar projeto...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nome da skill..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={() => handleAdd(input)}
                disabled={!input.trim() || (scope === "project" && !selectedProjectId)}
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
                  {suggestions.slice(0, 12).map((s) => (
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

          {/* Global skills with project assignments */}
          {globalSkills.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Globe size={14} /> Skills Globais
              </h2>
              <p className="text-xs text-muted-foreground">
                Marque em quais projetos cada skill se aplica. Skills sem projetos marcados se aplicam a todos.
              </p>
              <div className="space-y-2">
                {globalSkills.map((skill: any) => {
                  const assigned = getAssignedProjects(skill.id);
                  return (
                    <div key={skill.id} className="p-3 rounded-xl bg-card border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{skill.name}</span>
                        <button
                          onClick={() => removeGlobalSkill.mutate(skill.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {projects.map((proj) => (
                          <button
                            key={proj.id}
                            onClick={() => toggleAssignment.mutate({ skillId: skill.id, skillType: "global", projectId: proj.id })}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              assigned.length === 0 || isAssigned(skill.id, proj.id)
                                ? "bg-primary/15 text-primary"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {(assigned.length === 0 || isAssigned(skill.id, proj.id)) && <Check size={10} />}
                            {proj.name}
                          </button>
                        ))}
                        {assigned.length > 0 && (
                          <span className="text-[10px] text-muted-foreground self-center ml-1">
                            ({assigned.length} projeto{assigned.length > 1 ? "s" : ""})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Project skills grouped by project */}
          {projectSkills.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <FolderOpen size={14} /> Skills por Projeto
              </h2>
              {projects.map((proj) => {
                const projSkills = projectSkills.filter((s: any) => s.project_id === proj.id);
                if (projSkills.length === 0) return null;
                return (
                  <div key={proj.id} className="p-3 rounded-xl bg-card border border-border">
                    <span className="text-xs font-medium text-muted-foreground mb-2 block">{proj.name}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {projSkills.map((skill: any) => (
                        <span key={skill.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                          {skill.name}
                          <button
                            onClick={() => removeProjectSkill.mutate(skill.id)}
                            className="p-0.5 rounded-full hover:bg-accent/80 transition-colors"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {globalSkills.length === 0 && projectSkills.length === 0 && (
            <div className="text-center py-12">
              <Wrench size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma skill cadastrada ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione suas tecnologias favoritas acima!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillsPage;
