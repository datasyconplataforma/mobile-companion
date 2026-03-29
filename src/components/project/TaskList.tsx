import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckSquare, Circle, CheckCircle2, Loader2, Plus, Trash2, GripVertical } from "lucide-react";

interface TaskListProps {
  projectId: string;
}

const statusIcons = {
  todo: Circle,
  in_progress: Loader2,
  done: CheckCircle2,
};

const statusStyles = {
  todo: "text-muted-foreground",
  in_progress: "text-yellow-400 animate-spin",
  done: "text-primary",
};

const statusLabels: Record<string, string> = {
  todo: "A fazer",
  in_progress: "Em progresso",
  done: "Concluída",
};

const nextStatus: Record<string, string> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const TaskList = ({ projectId }: TaskListProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: nextStatus[status] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const addTask = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from("project_tasks")
        .insert({
          project_id: projectId,
          user_id: user!.id,
          title,
          sort_order: tasks.length,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setNewTitle("");
      setShowAdd(false);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) addTask.mutate(newTitle.trim());
  };

  const completedCount = tasks.filter((t) => t.status === "done").length;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
      <div className="max-w-lg mx-auto">
        {/* Progress */}
        {tasks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{completedCount} de {tasks.length} concluídas</span>
              <span>{Math.round((completedCount / tasks.length) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(completedCount / tasks.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Task list */}
        {tasks.length === 0 && !showAdd ? (
          <div className="text-center py-12">
            <CheckSquare size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Nenhuma tarefa ainda.</p>
            <p className="text-xs text-muted-foreground">Adicione manualmente ou peça à IA no chat.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const Icon = statusIcons[task.status as keyof typeof statusIcons] || Circle;
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group ${
                    task.status === "done" ? "opacity-60" : ""
                  }`}
                >
                  <button
                    onClick={() => toggleStatus.mutate({ id: task.id, status: task.status })}
                    className="shrink-0 mt-0.5"
                    title={`Marcar como: ${statusLabels[nextStatus[task.status]]}`}
                  >
                    <Icon size={18} className={statusStyles[task.status as keyof typeof statusStyles]} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTask.mutate(task.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add task */}
        {showAdd ? (
          <form onSubmit={handleAdd} className="mt-3 flex gap-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título da tarefa..."
              className="flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button type="submit" disabled={addTask.isPending || !newTitle.trim()} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              Criar
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setNewTitle(""); }} className="px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-sm">
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 text-sm transition-all"
          >
            <Plus size={14} />
            Adicionar tarefa
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskList;
