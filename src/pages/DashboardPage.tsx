import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Terminal, Plus, LogOut, FolderOpen, Loader2, Trash2, Pencil, X, Check, Users, Wrench } from "lucide-react";
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

const DashboardPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      // Own projects
      const { data: ownProjects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Shared projects
      const { data: shares } = await supabase
        .from("project_shares" as any)
        .select("project_id")
        .eq("shared_with_user_id", user!.id);

      let sharedProjects: typeof ownProjects = [];
      if (shares && shares.length > 0) {
        const sharedIds = (shares as any[]).map((s: any) => s.project_id);
        const { data: sp } = await supabase
          .from("projects")
          .select("*")
          .in("id", sharedIds)
          .order("updated_at", { ascending: false });
        sharedProjects = sp || [];
      }

      return [
        ...ownProjects.map((p) => ({ ...p, _shared: false })),
        ...sharedProjects.map((p) => ({ ...p, _shared: true })),
      ];
    },
  });

  const createProject = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowNew(false);
      setNewName("");
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
    if (newName.trim()) createProject.mutate(newName.trim());
  };

  const handleRename = (id: string) => {
    if (editName.trim()) renameProject.mutate({ id, name: editName.trim() });
  };

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
          <button
            onClick={() => navigate("/skills")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Wrench size={14} />
            Skills
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-bold text-foreground">Meus Projetos</h1>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:shadow-glow transition-all"
            >
              <Plus size={14} />
              Novo
            </button>
          </div>

          {showNew && (
            <form onSubmit={handleCreate} className="mb-4 flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do projeto..."
                className="flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button type="submit" disabled={createProject.isPending} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                Criar
              </button>
              <button type="button" onClick={() => { setShowNew(false); setNewName(""); }} className="px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-sm">
                ✕
              </button>
            </form>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : projects?.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum projeto ainda.</p>
              <p className="text-muted-foreground text-xs mt-1">Crie seu primeiro projeto para começar!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects?.map((project) => (
                <div
                  key={project.id}
                  className="relative p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-glow transition-all group"
                >
                  {/* Delete confirmation */}
                  {deletingId === project.id && (
                    <div className="absolute inset-0 bg-card/95 backdrop-blur-sm rounded-xl flex items-center justify-center gap-3 z-10">
                      <span className="text-sm text-foreground">Excluir projeto?</span>
                      <button
                        onClick={() => deleteProject.mutate(project.id)}
                        className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-1">
                    {editingId === project.id ? (
                      <div className="flex items-center gap-1.5 flex-1 mr-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRename(project.id)}
                          className="flex-1 px-2 py-0.5 rounded bg-secondary text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button onClick={() => handleRename(project.id)} className="p-1 text-primary"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => navigate(`/project/${project.id}`)} className="text-left flex-1">
                        <h3 className="font-semibold text-sm text-foreground">{project.name}</h3>
                      </button>
                    )}
                    <div className="flex items-center gap-1.5">
                      {(project as any)._shared && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium flex items-center gap-1">
                          <Users size={10} /> Compartilhado
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status] || statusColors.planning}`}>
                        {statusLabels[project.status] || "Planejando"}
                      </span>
                      {!(project as any)._shared && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(project.id); setEditName(project.name); }}
                            className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingId(project.id); }}
                            className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => navigate(`/project/${project.id}`)} className="w-full text-left">
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      {new Date(project.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
