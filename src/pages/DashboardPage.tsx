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
    <div className="flex-1 flex flex-col p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full">
          {/* Title row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Meus Projetos</h1>
              <p className="text-sm text-muted-foreground mt-1">Gerencie seu fluxo de desenvolvimento com IA.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl bg-secondary/50 p-1 border border-white/5">
                <button onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  <LayoutGrid size={16} />
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  <List size={16} />
                </button>
              </div>
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gradient text-primary-foreground text-sm font-bold shadow-glow hover:scale-105 active:scale-95 transition-all">
                <Plus size={18} /> Novo Projeto
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
            <form onSubmit={handleCreate} className="mb-10 p-6 glass-card border-primary/20 shadow-glow flex flex-col gap-4 relative animate-in fade-in slide-in-from-top-4 duration-500">
              <button type="button" onClick={() => setShowNew(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X size={18} /></button>
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-1">Novo Projeto</h3>
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
                    className={cn(
                      "group relative p-5 glass-card border-l-[4px] hover:scale-[1.02] active:scale-[0.98]",
                      statusBorder[project.status] || statusBorder.planning
                    )}>
                    
                    {/* Delete confirmation overlay */}
                    {deletingId === project.id && (
                      <div className="absolute inset-0 bg-background/95 backdrop-blur-md rounded-xl flex items-center justify-center gap-3 z-20">
                        <span className="text-sm font-semibold">Excluir projeto?</span>
                        <button onClick={() => deleteProject.mutate(project.id)}
                          className="px-4 py-1.5 rounded-lg bg-destructive text-white text-xs font-bold hover:bg-destructive/80 transition-colors">Excluir</button>
                        <button onClick={() => setDeletingId(null)}
                          className="px-4 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:text-foreground transition-colors">Cancelar</button>
                      </div>
                    )}

                    {/* Top row */}
                    <div className="flex items-center justify-between mb-3">
                      {editingId === project.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-4">
                          <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRename(project.id)}
                            className="flex-1 px-3 py-1 rounded-lg bg-secondary/50 border border-white/5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                          <button onClick={() => handleRename(project.id)} className="p-1.5 text-primary bg-primary/10 rounded-md hover:bg-primary/20"><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-secondary/50 rounded-md"><X size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => navigate(`/project/${project.id}`)} className="text-left flex-1 min-w-0 mr-4">
                          <h3 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">{project.name}</h3>
                        </button>
                      )}
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                          statusColors[project.status] || statusColors.planning
                        )}>
                          {statusLabels[project.status] || "Planejando"}
                        </span>
                        
                        {!(project as any)._shared && (
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all ml-1 translate-x-1 group-hover:translate-x-0">
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(project.id); setEditName(project.name); }}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-all">
                              <Pencil size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeletingId(project.id); }}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button onClick={() => navigate(`/project/${project.id}`)} className="w-full text-left space-y-4">
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">{project.description}</p>
                      )}

                      {/* Metrics bar */}
                      <div className="flex items-center gap-4 pt-1 border-t border-white/5">
                        {/* PRD badge */}
                        <div className="flex flex-col gap-0.5 min-w-[32px]">
                          <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/50 font-bold">PRD</span>
                          <div className={cn("flex items-center gap-1 text-[10px] font-bold", hasPrd ? "text-emerald-400" : "text-muted-foreground/30")}>
                            <FileText size={10} />
                            {hasPrd ? "OK" : "—"}
                          </div>
                        </div>

                        {/* Tasks */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/50 font-bold">Progresso tarefas</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{tc ? `${tc.done}/${tc.total}` : "0"}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-secondary/50 overflow-hidden border border-white/5">
                            <div className="h-full rounded-full bg-brand-gradient transition-all duration-1000" style={{ width: `${progress}%` }} />
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="flex flex-col items-end gap-0.5 min-w-[40px]">
                          <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/50 font-bold">Feed</span>
                          <div className={cn("flex items-center gap-1 text-[10px] font-bold font-mono", mc > 0 ? "text-blue-400" : "text-muted-foreground/30")}>
                            <MessageSquare size={10} />
                            {mc}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-muted-foreground/40 font-mono tracking-widest pt-1">
                        <span className="uppercase">CodeBuddy Project Instance</span>
                        <span>{new Date(project.updated_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </button>
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
