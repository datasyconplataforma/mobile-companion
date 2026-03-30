import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Plus, Loader2, Wrench, Globe, FolderOpen, Github } from "lucide-react";

interface SkillListProps {
  projectId: string;
  githubRepoUrl?: string | null;
}

const SUGGESTED_SKILLS = [
  "React", "TypeScript", "Tailwind CSS", "Supabase", "Node.js",
  "PostgreSQL", "REST API", "GraphQL", "Firebase", "Stripe",
  "Next.js", "React Native", "Docker", "Redis", "AWS",
  "Prisma", "Drizzle", "Zod", "React Query", "Zustand",
];

type SkillScope = "project" | "global";

const SkillList = ({ projectId, githubRepoUrl }: SkillListProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<SkillScope>("project");
  const [importingGithub, setImportingGithub] = useState(false);

  const { data: projectSkills = [], isLoading: loadingProject } = useQuery({
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

  const { data: globalSkills = [], isLoading: loadingGlobal } = useQuery({
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

  const addGlobalSkill = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("global_skills" as any).insert({
        user_id: user!.id,
        name: name.trim(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global_skills", user?.id] });
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

  const removeGlobalSkill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("global_skills" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["global_skills", user?.id] }),
  });

  const allSkillNames = new Set([
    ...projectSkills.map((s: any) => s.name.toLowerCase()),
    ...globalSkills.map((s: any) => s.name.toLowerCase()),
  ]);

  const handleAdd = (name: string) => {
    if (!name.trim()) return;
    if (allSkillNames.has(name.trim().toLowerCase())) return;
    if (scope === "project") {
      addProjectSkill.mutate(name);
    } else {
      addGlobalSkill.mutate(name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd(input);
    }
  };

  const handleImportFromGithub = async () => {
    if (!githubRepoUrl || !user) return;
    setImportingGithub(true);
    try {
      const cleaned = githubRepoUrl.replace(/\.git$/, "").replace(/\/$/, "");
      const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return;
      const [, owner, repo] = match;

      // Get token if saved
      const { data: proj } = await supabase.from("projects").select("github_token").eq("id", projectId).single();
      const token = (proj as any)?.github_token;

      const headers: Record<string, string> = { "User-Agent": "CodeBuddy-App" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
      if (!resp.ok) throw new Error("Não foi possível acessar o repositório");
      const languages: Record<string, number> = await resp.json();

      // Also try to detect from package.json
      let packageDeps: string[] = [];
      try {
        const pkgResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers });
        if (pkgResp.ok) {
          const pkgData = await pkgResp.json();
          const content = atob(pkgData.content);
          const pkg = JSON.parse(content);
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
          const knownFrameworks: Record<string, string> = {
            "react": "React", "next": "Next.js", "vue": "Vue.js", "svelte": "Svelte",
            "@angular/core": "Angular", "express": "Express", "fastify": "Fastify",
            "tailwindcss": "Tailwind CSS", "prisma": "Prisma", "@supabase/supabase-js": "Supabase",
            "firebase": "Firebase", "stripe": "Stripe", "zod": "Zod",
            "@tanstack/react-query": "React Query", "zustand": "Zustand", "drizzle-orm": "Drizzle",
            "mongoose": "MongoDB", "redis": "Redis", "graphql": "GraphQL",
            "socket.io": "Socket.io", "jest": "Jest", "vitest": "Vitest",
            "cypress": "Cypress", "docker-compose": "Docker", "typescript": "TypeScript",
          };
          for (const dep of Object.keys(allDeps)) {
            if (knownFrameworks[dep]) packageDeps.push(knownFrameworks[dep]);
          }
        }
      } catch {}

      const detectedSkills = [...Object.keys(languages), ...packageDeps];
      let added = 0;
      for (const skill of detectedSkills) {
        if (allSkillNames.has(skill.toLowerCase())) continue;
        const { error } = await supabase.from("project_skills" as any).insert({
          project_id: projectId, user_id: user.id, name: skill,
        } as any);
        if (!error) added++;
      }

      queryClient.invalidateQueries({ queryKey: ["skills", projectId] });
      if (added > 0) {
        // toast-like feedback via the input
        setInput(`✅ ${added} skills importadas do GitHub!`);
        setTimeout(() => setInput(""), 2000);
      } else {
        setInput("Nenhuma skill nova encontrada.");
        setTimeout(() => setInput(""), 2000);
      }
    } catch (err: any) {
      console.error("GitHub import error:", err);
      setInput("❌ Erro ao importar do GitHub");
      setTimeout(() => setInput(""), 2000);
    } finally {
      setImportingGithub(false);
    }
  };

  const suggestions = SUGGESTED_SKILLS.filter((s) => !allSkillNames.has(s.toLowerCase()));

  if (loadingProject || loadingGlobal) {
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

      {/* Global skills */}
      {globalSkills.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
            <Globe size={11} />
            Globais (todos os projetos)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {globalSkills.map((skill: any) => (
              <span
                key={skill.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium"
              >
                {skill.name}
                <button
                  onClick={() => removeGlobalSkill.mutate(skill.id)}
                  className="p-0.5 rounded-full hover:bg-accent/80 transition-colors"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Project skills */}
      {projectSkills.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
            <FolderOpen size={11} />
            Projeto
          </span>
          <div className="flex flex-wrap gap-1.5">
            {projectSkills.map((skill: any) => (
              <span
                key={skill.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium"
              >
                {skill.name}
                <button
                  onClick={() => removeProjectSkill.mutate(skill.id)}
                  className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input with scope toggle */}
      <div className="flex gap-2">
        <div className="flex rounded-lg bg-secondary overflow-hidden shrink-0">
          <button
            onClick={() => setScope("project")}
            className={`px-2 py-1.5 text-xs font-medium transition-colors ${
              scope === "project"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Adicionar ao projeto"
          >
            <FolderOpen size={13} />
          </button>
          <button
            onClick={() => setScope("global")}
            className={`px-2 py-1.5 text-xs font-medium transition-colors ${
              scope === "global"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Adicionar como global"
          >
            <Globe size={13} />
          </button>
        </div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={scope === "global" ? "Adicionar skill global..." : "Adicionar skill do projeto..."}
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
