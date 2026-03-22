import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckSquare, Circle, CheckCircle2, Loader2 } from "lucide-react";

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
  in_progress: "text-terminal-yellow animate-spin",
  done: "text-primary",
};

const nextStatus: Record<string, string> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const TaskList = ({ projectId }: TaskListProps) => {
  const queryClient = useQueryClient();

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <CheckSquare size={32} className="text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          As tarefas serão geradas pela IA após a construção do PRD. Continue conversando no chat!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
      <div className="max-w-lg mx-auto space-y-2">
        {tasks.map((task) => {
          const Icon = statusIcons[task.status as keyof typeof statusIcons] || Circle;
          return (
            <button
              key={task.id}
              onClick={() => toggleStatus.mutate({ id: task.id, status: task.status })}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all ${
                task.status === "done" ? "opacity-60" : ""
              }`}
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${statusStyles[task.status as keyof typeof statusStyles]}`} />
              <div>
                <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TaskList;
