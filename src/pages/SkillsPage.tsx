import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Wrench, Globe, FolderOpen, Plus, X, Loader2, Check, ChevronDown, ChevronUp, FileText,
} from "lucide-react";

interface SuggestedSkill {
  name: string;
  context_md: string;
}

const SUGGESTED_SKILLS: SuggestedSkill[] = [
  {
    name: "React",
    context_md: `## React
- Use functional components com hooks (useState, useEffect, useCallback, useMemo)
- Prefira composição sobre herança
- Use React.memo para otimização quando necessário
- Gerencie estado global com Context API ou Zustand
- Use React Query para estado do servidor (fetching, caching, sync)
- Componentes devem ser pequenos, focados e reutilizáveis
- Use lazy loading e Suspense para code splitting`,
  },
  {
    name: "TypeScript",
    context_md: `## TypeScript
- Use tipos estritos, evite \`any\` sempre que possível
- Prefira interfaces para objetos e types para unions/intersections
- Use generics para componentes e funções reutilizáveis
- Aproveite inferência de tipos quando for clara
- Use enums ou const assertions para valores constantes
- Valide dados de APIs externas com Zod ou similar
- Configure strict mode no tsconfig`,
  },
  {
    name: "Tailwind CSS",
    context_md: `## Tailwind CSS
- Use classes utilitárias, evite CSS customizado
- Crie componentes reutilizáveis ao invés de repetir classes longas
- Use design tokens via tailwind.config (cores, espaçamentos, fontes)
- Aproveite variantes responsivas (sm:, md:, lg:)
- Use dark: para suporte a tema escuro
- Prefira gap sobre margin para espaçamento entre itens
- Use cn() ou clsx() para classes condicionais`,
  },
  {
    name: "Supabase",
    context_md: `## Supabase
- Use Row Level Security (RLS) em TODAS as tabelas
- Nunca exponha service_role_key no frontend
- Use Edge Functions para lógica de servidor
- Aproveite realtime para features colaborativas
- Use Storage para uploads de arquivos
- Crie migrações SQL para mudanças de schema
- Use triggers e funções para lógica de banco
- Profiles table separada de auth.users`,
  },
  {
    name: "Node.js",
    context_md: `## Node.js
- Use async/await para operações assíncronas
- Trate erros com try/catch e middleware de erro
- Use variáveis de ambiente para configurações sensíveis
- Prefira streams para processamento de grandes volumes
- Use clustering ou worker threads para CPU-intensive
- Mantenha dependências atualizadas e auditadas`,
  },
  {
    name: "PostgreSQL",
    context_md: `## PostgreSQL
- Normalize dados até 3NF, desnormalize com materialzed views quando necessário
- Use índices em colunas frequentemente consultadas
- Aproveite JSONB para dados semi-estruturados
- Use CTEs (WITH) para queries complexas
- Implemente soft delete com coluna deleted_at quando apropriado
- Use transactions para operações que precisam de atomicidade
- Crie funções SQL para lógica reutilizável`,
  },
  {
    name: "REST API",
    context_md: `## REST API
- Siga convenções REST: GET (listar/ler), POST (criar), PUT/PATCH (atualizar), DELETE (remover)
- Use status codes HTTP corretos (200, 201, 400, 401, 403, 404, 500)
- Versione APIs (v1, v2) no path
- Implemente paginação para listas grandes
- Use filtros via query params
- Retorne mensagens de erro claras e consistentes
- Valide inputs no servidor`,
  },
  {
    name: "GraphQL",
    context_md: `## GraphQL
- Defina schemas claros com tipos bem documentados
- Use queries para leitura e mutations para escrita
- Implemente DataLoader para evitar N+1 queries
- Use subscriptions para dados em tempo real
- Valide e sanitize inputs
- Implemente paginação com cursor-based pagination
- Use fragments para reutilizar seleções`,
  },
  {
    name: "Firebase",
    context_md: `## Firebase
- Use Firestore para dados estruturados em tempo real
- Configure Security Rules para proteger dados
- Use Cloud Functions para lógica de servidor
- Aproveite Authentication para login social e email
- Use Cloud Storage para uploads
- Implemente offline persistence quando relevante`,
  },
  {
    name: "Stripe",
    context_md: `## Stripe
- NUNCA processe pagamentos no frontend
- Use webhooks para confirmar pagamentos (não confie no redirect)
- Implemente Checkout Session para fluxo padrão
- Use Customer Portal para gestão de assinaturas
- Armazene apenas IDs do Stripe no banco (nunca dados de cartão)
- Teste com chaves de teste e cartões de teste
- Implemente idempotency keys para evitar cobranças duplicadas`,
  },
  {
    name: "Next.js",
    context_md: `## Next.js
- Use App Router (pasta app/) para novos projetos
- Aproveite Server Components por padrão, Client Components quando necessário
- Use Server Actions para mutações
- Implemente ISR ou SSG para páginas estáticas
- Use middleware para auth e redirects
- Otimize imagens com next/image
- Configure metadata para SEO em cada página`,
  },
  {
    name: "React Native",
    context_md: `## React Native
- Use Expo para desenvolvimento rápido
- Componentes nativos (View, Text, TouchableOpacity) ao invés de div/span
- Use React Navigation para navegação
- Teste em iOS e Android simultaneamente
- Use AsyncStorage para persistência local
- Otimize listas com FlatList e virtualização
- Use Expo EAS para builds e deploys`,
  },
  {
    name: "Docker",
    context_md: `## Docker
- Use multi-stage builds para imagens menores
- Um processo por container
- Use .dockerignore para excluir arquivos desnecessários
- Defina health checks nos containers
- Use docker-compose para desenvolvimento local
- Nunca armazene secrets na imagem
- Use volumes para dados persistentes`,
  },
  {
    name: "Redis",
    context_md: `## Redis
- Use para cache de dados frequentemente acessados
- Implemente TTL (expiração) em todas as chaves de cache
- Use pub/sub para comunicação entre serviços
- Aproveite sorted sets para rankings e leaderboards
- Use transactions (MULTI/EXEC) para operações atômicas
- Implemente rate limiting com Redis
- Monitore uso de memória`,
  },
  {
    name: "AWS",
    context_md: `## AWS
- Use IAM roles com privilégio mínimo
- S3 para armazenamento de objetos
- Lambda para funções serverless
- CloudFront para CDN
- RDS ou DynamoDB para banco de dados
- SQS/SNS para mensageria
- Use Infrastructure as Code (CDK ou Terraform)`,
  },
  {
    name: "Prisma",
    context_md: `## Prisma
- Defina schema.prisma como fonte de verdade do banco
- Use migrações Prisma para evolução do schema
- Aproveite relações e includes para queries eficientes
- Use select para buscar apenas campos necessários
- Implemente soft delete com middleware
- Use transações para operações compostas
- Gere tipos automaticamente com prisma generate`,
  },
  {
    name: "Drizzle",
    context_md: `## Drizzle ORM
- Schema definido em TypeScript (type-safe)
- Use migrações com drizzle-kit
- Queries SQL-like com tipagem automática
- Leve e performático comparado a ORMs tradicionais
- Use prepared statements para queries recorrentes
- Suporta PostgreSQL, MySQL e SQLite`,
  },
  {
    name: "Zod",
    context_md: `## Zod
- Valide TODOS os inputs de APIs e formulários
- Use z.infer<> para derivar tipos TypeScript do schema
- Crie schemas reutilizáveis e compostos
- Use .transform() para normalizar dados
- Integre com React Hook Form via @hookform/resolvers
- Valide variáveis de ambiente na inicialização
- Use .safeParse() para tratamento gracioso de erros`,
  },
  {
    name: "React Query",
    context_md: `## React Query (TanStack Query)
- Use para TODO fetching de dados do servidor
- Configure staleTime e gcTime apropriados
- Use invalidateQueries após mutations
- Implemente optimistic updates para UX responsiva
- Use prefetchQuery para pré-carregar dados
- Configure retry e error handling globais
- Use queryKey consistentes e hierárquicos`,
  },
  {
    name: "Zustand",
    context_md: `## Zustand
- Use para estado global que não é do servidor
- Crie stores pequenas e focadas (não um store monolítico)
- Use selectors para evitar re-renders desnecessários
- Aproveite middleware (persist, devtools, immer)
- Combine com React Query (Zustand para UI state, RQ para server state)
- Use subscribe para efeitos colaterais fora de componentes`,
  },
];

const SkillsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<"global" | "project">("global");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [editingContext, setEditingContext] = useState<string | null>(null);
  const [contextDraft, setContextDraft] = useState("");

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

  const updateSkillContext = useMutation({
    mutationFn: async ({ id, table, context_md }: { id: string; table: string; context_md: string }) => {
      const { error } = await supabase.from(table as any).update({ context_md } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global_skills", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["all_project_skills", user?.id] });
      setEditingContext(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill_assignments", user?.id] });
    },
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

  const handleAddSuggested = (suggested: SuggestedSkill) => {
    handleAdd(suggested.name, suggested.context_md);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(input); }
  };

  const startEditContext = (skillId: string, currentContext: string) => {
    setEditingContext(skillId);
    setContextDraft(currentContext || "");
  };

  const saveContext = (skillId: string, table: string) => {
    updateSkillContext.mutate({ id: skillId, table, context_md: contextDraft });
  };

  const suggestions = SUGGESTED_SKILLS.filter((s) => !allSkillNames.has(s.name.toLowerCase()));
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

  const renderSkillCard = (skill: any, table: string, showProjectAssign: boolean) => {
    const assigned = getAssignedProjects(skill.id);
    const isExpanded = expandedSkill === skill.id;
    const isEditing = editingContext === skill.id;
    const hasContext = skill.context_md && skill.context_md.trim();

    return (
      <div key={skill.id} className="p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {skill.name}
            {hasContext && <FileText size={12} className="text-primary" />}
          </button>
          <div className="flex items-center gap-1">
            {!hasContext && (
              <span className="text-[10px] text-amber-500 font-medium">sem contexto</span>
            )}
            <button
              onClick={() => (table === "global_skills" ? removeGlobalSkill : removeProjectSkill).mutate(skill.id)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* Context editor */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">
                Contexto (Markdown) — instruções para a IA ao usar esta skill:
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={contextDraft}
                    onChange={(e) => setContextDraft(e.target.value)}
                    placeholder="Descreva diretrizes, padrões e boas práticas desta tecnologia que a IA deve seguir..."
                    rows={8}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveContext(skill.id, table)}
                      className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingContext(null)}
                      className="px-3 py-1 rounded-lg bg-secondary text-muted-foreground text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startEditContext(skill.id, skill.context_md || "")}
                  className="w-full text-left"
                >
                  {hasContext ? (
                    <pre className="px-3 py-2 rounded-lg bg-secondary text-foreground text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {skill.context_md}
                    </pre>
                  ) : (
                    <div className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-xs italic">
                      Clique para adicionar contexto...
                    </div>
                  )}
                </button>
              )}
            </div>

            {/* Project assignments */}
            {showProjectAssign && projects.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">
                  Aplicar nos projetos:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => toggleAssignment.mutate({
                        skillId: skill.id,
                        skillType: table === "global_skills" ? "global" : "project",
                        projectId: proj.id,
                      })}
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
            )}
          </div>
        )}
      </div>
    );
  };

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

            {/* Suggestions with pre-built context */}
            {suggestions.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground mb-1 block">
                  Sugestões (já vêm com contexto pré-definido):
                </span>
                <div className="flex flex-wrap gap-1">
                  {suggestions.slice(0, 12).map((s) => (
                    <button
                      key={s.name}
                      onClick={() => handleAddSuggested(s)}
                      className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors hover:bg-secondary/80 flex items-center gap-1"
                    >
                      <Plus size={10} />
                      {s.name}
                      <FileText size={9} className="text-primary" />
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
                Clique em uma skill para ver/editar seu contexto e selecionar projetos. Skills sem projetos marcados se aplicam a todos.
              </p>
              {globalSkills.map((skill: any) => renderSkillCard(skill, "global_skills", true))}
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
                      {projSkills.map((skill: any) => renderSkillCard(skill, "project_skills", false))}
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
