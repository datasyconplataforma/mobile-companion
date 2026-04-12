import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Terminal, Plus, LogOut, FolderOpen, Loader2, Trash2, Pencil, X, Check,
  Users, Wrench, Search, FileText, CheckSquare, MessageSquare, LayoutGrid, List,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  planning: "Planejando",
  prd_ready: "PRD Pronto",
  building: "Construindo",
  done: "Concluído",
};

const statusColors: Record<string, string> = {
  planning: "bg-yellow-500/20 text-yellow-400",
  prd_ready: "bg-cyan-500/20 text-cyan-400",
  building: "bg-primary/20 text-primary",
  done: "bg-green-500/20 text-green-400",
};

const statusBorder: Record<string, string> = {
  planning: "border-l-yellow-500/60",
  prd_ready: "border-l-cyan-500/60",
  building: "border-l-primary/60",
  done: "border-l-green-500/60",
};

const DashboardPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data: ownProjects, error } = await supabase
        .from("projects").select("*").eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const { data: shares } = await supabase
        .from("project_shares").select("project_id")
        .eq("shared_with_user_id", user!.id);

      let sharedProjects: typeof ownProjects = [];
      if (shares && shares.length > 0) {
        const sharedIds = (shares as any[]).map((s: any) => s.project_id);
        const { data: sp } = await supabase
          .from("projects").select("*").in("id", sharedIds)
          .order("updated_at", { ascending: false });
        sharedProjects = sp || [];
      }

      return [
        ...ownProjects.map((p) => ({ ...p, _shared: false })),
        ...sharedProjects.map((p) => ({ ...p, _shared: true })),
      ];
    },
  });

  // Fetch task counts per project
  const projectIds = useMemo(() => projects?.map((p) => p.id) || [], [projects]);
  const { data: taskCounts = {} } = useQuery({
    queryKey: ["task_counts", projectIds],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks").select("project_id, status")
        .in("project_id", projectIds);
      if (error) throw error;
      const counts: Record<string, { total: number; done: number }> = {};
      for (const t of data) {
        if (!counts[t.project_id]) counts[t.project_id] = { total: 0, done: 0 };
        counts[t.project_id].total++;
        if (t.status === "done") counts[t.project_id].done++;
      }
      return counts;
    },
  });

  // Fetch message counts per project
  const { data: msgCounts = {} } = useQuery({
    queryKey: ["msg_counts", projectIds],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages").select("project_id")
        .in("project_id", projectIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const m of data) {
        counts[m.project_id] = (counts[m.project_id] || 0) + 1;
      }
      return counts;
    },
  });

  const createProject = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from("projects").insert({ name, description, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowNew(false);
      setNewName("");
      setNewDescription("");
      navigate(`/project/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const renameProject = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("projects").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingId(null);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeletingId(null);
      toast({ title: "Projeto excluído" });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createProject.mutate({ 
        name: newName.trim(), 
        description: newDescription.trim() 
      });
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) renameProject.mutate({ id, name: editName.trim() });
  };

  const filtered = useMemo(() => {
    if (!projects) return [];
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
            <Terminal size={14} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground">CodeBuddy</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/skills")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Wrench size={14} /> Skills
          </button>
          <button onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="max-w-3xl mx-auto">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-foreground">Meus Projetos</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-secondary p-0.5">
                <button onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  <LayoutGrid size={14} />
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  <List size={14} />
                </button>
              </div>
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:shadow-glow transition-all">
                <Plus size={14} /> Novo
              </button>
            </div>
          </div>

          {/* Search */}
          {(projects?.length || 0) > 0 && (
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar projetos..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          {showNew && (
            <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl bg-card border border-primary/20 shadow-glow flex flex-col gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Nome do Projeto</label>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: App de Delivery"
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring border border-border" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Objetivo / Descrição</label>
                <textarea 
                  value={newDescription} 
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="O que este app faz? Qual o problema que ele resolve?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring border border-border resize-none scrollbar-thin" />
              </div>
              <div className="flex gap-2 justify-end mt-1">
                <button type="button" onClick={() => { setShowNew(false); setNewName(""); setNewDescription(""); }}
                  className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm hover:text-foreground transition-colors">Cancelar</button>
                <button type="submit" disabled={createProject.isPending || !newName.trim()}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:shadow-glow transition-all flex items-center gap-2">
                  {createProject.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Criar Projeto
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : filtered.length === 0 && search ? (
            <div className="text-center py-12">
              <Search size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum projeto encontrado para "{search}"</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum projeto ainda.</p>
              <p className="text-muted-foreground text-xs mt-1">Crie seu primeiro projeto para começar!</p>
            </div>
          ) : (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 gap-3"
              : "space-y-2"
            }>
              {filtered.map((project) => {
                const tc = taskCounts[project.id];
                const mc = msgCounts[project.id] || 0;
                const hasPrd = !!project.prd_content;
                const progress = tc ? Math.round((tc.done / tc.total) * 100) : 0;

                return (
                  <div key={project.id}
                    className={`relative p-4 rounded-xl bg-card border border-border border-l-[3px] ${statusBorder[project.status] || statusBorder.planning} hover:border-primary/40 hover:shadow-glow transition-all group`}>
                    {/* Delete confirmation overlay */}
                    {deletingId === project.id && (
                      <div className="absolute inset-0 bg-card/95 backdrop-blur-sm rounded-xl flex items-center justify-center gap-3 z-10">
                        <span className="text-sm text-foreground">Excluir projeto?</span>
                        <button onClick={() => deleteProject.mutate(project.id)}
                          className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">Excluir</button>
                        <button onClick={() => setDeletingId(null)}
                          className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs">Cancelar</button>
                      </div>
                    )}

                    {/* Top row */}
                    <div className="flex items-center justify-between mb-2">
                      {editingId === project.id ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2">
                          <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRename(project.id)}
                            className="flex-1 px-2 py-0.5 rounded bg-secondary text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                          <button onClick={() => handleRename(project.id)} className="p-1 text-primary"><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => navigate(`/project/${project.id}`)} className="text-left flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground truncate">{project.name}</h3>
                        </button>
                      )}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(project as any)._shared && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium flex items-center gap-1">
                            <Users size={10} /> Compartilhado
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[project.status] || statusColors.planning}`}>
                          {statusLabels[project.status] || "Planejando"}
                        </span>
                        {!(project as any)._shared && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(project.id); setEditName(project.name); }}
                              className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all">
                              <Pencil size={13} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeletingId(project.id); }}
                              className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <button onClick={() => navigate(`/project/${project.id}`)} className="w-full text-left">
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{project.description}</p>
                      )}

                      {/* Metrics row */}
                      <div className="flex items-center gap-3 mt-1">
                        {/* PRD badge */}
                        <span className={`flex items-center gap-1 text-[10px] font-medium ${hasPrd ? "text-primary" : "text-muted-foreground/50"}`}>
                          <FileText size={11} />
                          PRD
                        </span>

                        {/* Tasks */}
                        {tc && tc.total > 0 ? (
                          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <CheckSquare size={11} />
                            <span>{tc.done}/{tc.total}</span>
                            <div className="w-12 h-1 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                            <CheckSquare size={11} /> 0
                          </span>
                        )}

                        {/* Messages */}
                        <span className={`flex items-center gap-1 text-[10px] ${mc > 0 ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                          <MessageSquare size={11} />
                          {mc}
                        </span>

                        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                          {new Date(project.updated_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
