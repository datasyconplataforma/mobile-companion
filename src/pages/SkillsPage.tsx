import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Wrench, Globe, FolderOpen, Plus, Loader2, FileText,
} from "lucide-react";
import SkillCard from "@/components/skills/SkillCard";

interface SuggestedSkill {
  name: string;
  context_md: string;
}

const SUGGESTED_SKILLS: SuggestedSkill[] = [
  { name: "React", context_md: `## React\n- Use functional components com hooks\n- Prefira composição sobre herança\n- Use React.memo para otimização\n- Gerencie estado global com Context API ou Zustand\n- Use React Query para estado do servidor\n- Componentes pequenos, focados e reutilizáveis\n- Use lazy loading e Suspense` },
  { name: "TypeScript", context_md: `## TypeScript\n- Use tipos estritos, evite any\n- Prefira interfaces para objetos e types para unions\n- Use generics para componentes reutilizáveis\n- Valide dados de APIs com Zod\n- Configure strict mode no tsconfig` },
  { name: "Tailwind CSS", context_md: `## Tailwind CSS\n- Use classes utilitárias, evite CSS customizado\n- Use design tokens via tailwind.config\n- Variantes responsivas (sm:, md:, lg:)\n- Use cn() ou clsx() para classes condicionais` },
  { name: "Supabase", context_md: `## Supabase\n- Use RLS em TODAS as tabelas\n- Nunca exponha service_role_key no frontend\n- Use Edge Functions para lógica de servidor\n- Profiles table separada de auth.users` },
  { name: "Node.js", context_md: `## Node.js\n- Use async/await\n- Trate erros com try/catch\n- Use variáveis de ambiente para configs sensíveis` },
  { name: "PostgreSQL", context_md: `## PostgreSQL\n- Normalize dados até 3NF\n- Use índices em colunas frequentes\n- Aproveite JSONB para dados semi-estruturados\n- Use transactions para atomicidade` },
  { name: "REST API", context_md: `## REST API\n- Siga convenções REST\n- Use status codes HTTP corretos\n- Implemente paginação para listas grandes` },
  { name: "GraphQL", context_md: `## GraphQL\n- Defina schemas claros\n- Use DataLoader para evitar N+1\n- Use subscriptions para tempo real` },
  { name: "Firebase", context_md: `## Firebase\n- Configure Security Rules\n- Use Cloud Functions para servidor\n- Implemente offline persistence` },
  { name: "Stripe", context_md: `## Stripe\n- NUNCA processe pagamentos no frontend\n- Use webhooks para confirmar pagamentos\n- Armazene apenas IDs do Stripe no banco` },
  { name: "Next.js", context_md: `## Next.js\n- Use App Router\n- Server Components por padrão\n- Use Server Actions para mutações\n- Configure metadata para SEO` },
  { name: "React Native", context_md: `## React Native\n- Use Expo\n- Use React Navigation\n- Use FlatList para listas otimizadas` },
  { name: "Docker", context_md: `## Docker\n- Use multi-stage builds\n- Um processo por container\n- Nunca armazene secrets na imagem` },
  { name: "Redis", context_md: `## Redis\n- Implemente TTL em todas as chaves\n- Use pub/sub para comunicação entre serviços` },
  { name: "AWS", context_md: `## AWS\n- Use IAM roles com privilégio mínimo\n- Use Infrastructure as Code` },
  { name: "Prisma", context_md: `## Prisma\n- Schema.prisma como fonte de verdade\n- Use migrações Prisma\n- Use transações para operações compostas` },
  { name: "Drizzle", context_md: `## Drizzle ORM\n- Schema em TypeScript (type-safe)\n- Use migrações com drizzle-kit` },
  { name: "Zod", context_md: `## Zod\n- Valide TODOS os inputs\n- Use z.infer<> para derivar tipos\n- Use .safeParse() para erros graciosos` },
  { name: "React Query", context_md: `## React Query\n- Use para TODO fetching de servidor\n- Configure staleTime e gcTime\n- Use invalidateQueries após mutations` },
  { name: "Zustand", context_md: `## Zustand\n- Stores pequenas e focadas\n- Use selectors para evitar re-renders\n- Combine com React Query` },
];

const SkillsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<"global" | "project">("global");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects").select("id, name").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data;
    },
  });

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

  const { data: projectSkills = [], isLoading: loadingProject } = useQuery({
    queryKey: ["all_project_skills", user?.id],
    enabled: !!user,
    queryFn: async () => {
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
    mutationFn: async ({ name, context_md }: { name: string; context_md: string }) => {
      const { error } = await supabase.from("global_skills" as any).insert({
        user_id: user!.id, name: name.trim(), context_md,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global_skills", user?.id] });
      setInput("");
    },
  });

  const addProjectSkill = useMutation({
    mutationFn: async ({ name, context_md }: { name: string; context_md: string }) => {
      if (!selectedProjectId) return;
      const { error } = await supabase.from("project_skills" as any).insert({
        project_id: selectedProjectId, user_id: user!.id, name: name.trim(), context_md,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skill_assignments", user?.id] }),
  });

  const allSkillNames = new Set([
    ...globalSkills.map((s: any) => s.name.toLowerCase()),
    ...projectSkills.map((s: any) => s.name.toLowerCase()),
  ]);

  const handleAdd = (name: string, context_md?: string) => {
    if (!name.trim() || allSkillNames.has(name.trim().toLowerCase())) return;
    const ctx = context_md || "";
    if (scope === "global") {
      addGlobalSkill.mutate({ name, context_md: ctx });
    } else {
      if (!selectedProjectId) return;
      addProjectSkill.mutate({ name, context_md: ctx });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(input); }
  };

  const handleToggleAssign = (skillId: string, skillType: string, projectId: string) => {
    toggleAssignment.mutate({ skillId, skillType, projectId });
  };

  const suggestions = SUGGESTED_SKILLS.filter((s) => !allSkillNames.has(s.name.toLowerCase()));

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
            <div className="flex gap-2 flex-wrap">
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
                className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={() => handleAdd(input)}
                disabled={!input.trim() || (scope === "project" && !selectedProjectId)}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>

            {suggestions.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground mb-1 block">
                  Sugestões (com contexto pré-definido):
                </span>
                <div className="flex flex-wrap gap-1">
                  {suggestions.slice(0, 12).map((s) => (
                    <button
                      key={s.name}
                      onClick={() => handleAdd(s.name, s.context_md)}
                      className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors hover:bg-secondary/80 flex items-center gap-1"
                    >
                      <Plus size={10} /> {s.name} <FileText size={9} className="text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Global skills */}
          {globalSkills.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Globe size={14} /> Skills Globais
              </h2>
              <p className="text-xs text-muted-foreground">
                Expanda para editar contexto, anexar arquivos, conectar GitHub e selecionar projetos.
              </p>
              {globalSkills.map((skill: any) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  table="global_skills"
                  showProjectAssign={true}
                  projects={projects}
                  assignments={assignments}
                  onRemove={(id) => removeGlobalSkill.mutate(id)}
                  onToggleAssign={handleToggleAssign}
                />
              ))}
            </div>
          )}

          {/* Project skills */}
          {projectSkills.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <FolderOpen size={14} /> Skills por Projeto
              </h2>
              {projects.map((proj) => {
                const projSkills = projectSkills.filter((s: any) => s.project_id === proj.id);
                if (projSkills.length === 0) return null;
                return (
                  <div key={proj.id}>
                    <span className="text-xs font-medium text-muted-foreground mb-1 block">{proj.name}</span>
                    <div className="space-y-2">
                      {projSkills.map((skill: any) => (
                        <SkillCard
                          key={skill.id}
                          skill={skill}
                          table="project_skills"
                          showProjectAssign={false}
                          projects={projects}
                          assignments={assignments}
                          onRemove={(id) => removeProjectSkill.mutate(id)}
                          onToggleAssign={handleToggleAssign}
                        />
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
              <p className="text-xs text-muted-foreground mt-1">
                Adicione suas tecnologias favoritas acima. As sugestões já vêm com contexto pronto!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillsPage;
