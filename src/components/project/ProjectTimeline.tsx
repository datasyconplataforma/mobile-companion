import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, MessageSquare, Swords, FileText, CheckSquare, Target,
  Loader2, Clock, ChevronRight, Zap,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectTimelineProps {
  projectId: string;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: "created" | "objective" | "first_chat" | "milestone_chat" | "debate" | "prd_generated" | "task_done" | "all_tasks_done";
  title: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
  phase: "config" | "feeding" | "debate" | "prd" | "execution";
}

const phaseLabels: Record<string, string> = {
  config: "Configuração",
  feeding: "Alimentação",
  debate: "Debate",
  prd: "PRD",
  execution: "Execução",
};

const phaseColors: Record<string, string> = {
  config: "bg-cyan-500",
  feeding: "bg-blue-500",
  debate: "bg-amber-500",
  prd: "bg-emerald-500",
  execution: "bg-primary",
};

const ProjectTimeline = ({ projectId }: ProjectTimelineProps) => {
  // Fetch project data
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch messages for first/last activity
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages").select("id, created_at, role")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch debates
  const { data: debates = [] } = useQuery({
    queryKey: ["debates", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_debates" as any).select("id, created_at, debate_happened, duration_ms")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks").select("id, title, status, updated_at, created_at")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Build timeline events
  const events: TimelineEvent[] = [];

  // 1. Project created
  if (project) {
    events.push({
      id: "created",
      date: new Date(project.created_at),
      type: "created",
      title: "Projeto criado",
      description: project.name,
      icon: <Target size={14} />,
      color: "text-cyan-400",
      phase: "config",
    });
  }

  // 2. Objective set
  if (project?.description) {
    events.push({
      id: "objective",
      date: new Date(project.updated_at),
      type: "objective",
      title: "Objetivo definido",
      description: project.description.slice(0, 120) + (project.description.length > 120 ? "..." : ""),
      icon: <Target size={14} />,
      color: "text-primary",
      phase: "config",
    });
  }

  // 3. First chat message
  if (messages.length > 0) {
    events.push({
      id: "first_chat",
      date: new Date(messages[0].created_at),
      type: "first_chat",
      title: "Primeira conversa",
      description: `Início da alimentação do projeto via chat.`,
      icon: <MessageSquare size={14} />,
      color: "text-blue-400",
      phase: "feeding",
    });
  }

  // 4. Chat milestones (every 10 messages)
  const chatMilestones = [10, 20, 50, 100];
  for (const milestone of chatMilestones) {
    if (messages.length >= milestone) {
      const msg = messages[milestone - 1];
      events.push({
        id: `chat_${milestone}`,
        date: new Date(msg.created_at),
        type: "milestone_chat",
        title: `${milestone} mensagens no chat`,
        description: `Marco de ${milestone} mensagens alcançado.`,
        icon: <MessageSquare size={14} />,
        color: "text-blue-400",
        phase: "feeding",
      });
    }
  }

  // 5. Debates
  debates.forEach((debate: any, i: number) => {
    events.push({
      id: `debate_${debate.id}`,
      date: new Date(debate.created_at),
      type: "debate",
      title: `Debate #${i + 1} ${debate.debate_happened ? "— Consenso atingido" : "— Sem revisão"}`,
      description: debate.duration_ms ? `Duração: ${(debate.duration_ms / 1000).toFixed(1)}s` : undefined,
      icon: <Swords size={14} />,
      color: debate.debate_happened ? "text-amber-400" : "text-muted-foreground",
      phase: "debate",
    });
  });

  // 6. PRD generated
  if (project?.prd_content) {
    events.push({
      id: "prd_generated",
      date: new Date(project.updated_at),
      type: "prd_generated",
      title: "PRD Definitivo gerado",
      description: "Documento de requisitos criado a partir do debate entre IAs.",
      icon: <FileText size={14} />,
      color: "text-emerald-400",
      phase: "prd",
    });
  }

  // 7. Tasks completed
  const doneTasks = tasks.filter((t) => t.status === "done");
  doneTasks.forEach((task) => {
    events.push({
      id: `task_${task.id}`,
      date: new Date(task.updated_at),
      type: "task_done",
      title: "Tarefa concluída",
      description: task.title,
      icon: <CheckSquare size={14} />,
      color: "text-primary",
      phase: "execution",
    });
  });

  // 8. All tasks done
  if (tasks.length > 0 && doneTasks.length === tasks.length) {
    const lastDone = doneTasks.reduce((latest, t) =>
      new Date(t.updated_at) > new Date(latest.updated_at) ? t : latest
    );
    events.push({
      id: "all_tasks_done",
      date: new Date(lastDone.updated_at),
      type: "all_tasks_done",
      title: "🎉 Todas as tarefas concluídas!",
      description: `${tasks.length} tarefas finalizadas.`,
      icon: <Zap size={14} />,
      color: "text-primary",
      phase: "execution",
    });
  }

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate phase progression
  const phases = ["config", "feeding", "debate", "prd", "execution"];
  const activePhases = new Set(events.map((e) => e.phase));
  const completedPhaseCount = phases.filter((p) => activePhases.has(p)).length;
  const overallProgress = Math.round((completedPhaseCount / phases.length) * 100);

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Phase Progress Bar */}
      <div className="shrink-0 px-4 py-4 border-b border-border bg-card/50">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar size={15} className="text-primary" />
              Linha do Tempo do Projeto
            </span>
            <span className="text-xs text-muted-foreground font-mono">{overallProgress}% das fases</span>
          </div>

          {/* Phase Steps */}
          <div className="flex items-center gap-1">
            {phases.map((phase, i) => {
              const isActive = activePhases.has(phase);
              return (
                <div key={phase} className="flex items-center flex-1">
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full h-2 rounded-full transition-all duration-500 ${
                      isActive ? phaseColors[phase] : "bg-secondary"
                    }`} />
                    <span className={`text-[9px] font-medium uppercase tracking-wider ${
                      isActive ? "text-foreground" : "text-muted-foreground/50"
                    }`}>
                      {phaseLabels[phase]}
                    </span>
                  </div>
                  {i < phases.length - 1 && (
                    <ChevronRight size={10} className="text-muted-foreground/30 shrink-0 mx-0.5 mt-[-12px]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare size={11} /> {messages.length} msgs
            </span>
            <span className="flex items-center gap-1">
              <Swords size={11} /> {debates.length} debates
            </span>
            <span className="flex items-center gap-1">
              <CheckSquare size={11} /> {doneTasks.length}/{tasks.length} tarefas
            </span>
            <span className="flex items-center gap-1">
              <FileText size={11} /> PRD {project.prd_content ? "✓" : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Events */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-3">
              <Calendar size={40} className="opacity-30" />
              <p className="font-medium">Nenhum evento registrado</p>
              <p className="text-xs">Comece definindo o objetivo do projeto na Etapa 01.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

              <div className="space-y-1">
                {events.map((event, i) => {
                  const showPhaseLabel =
                    i === 0 || events[i - 1].phase !== event.phase;

                  return (
                    <div key={event.id}>
                      {/* Phase separator */}
                      {showPhaseLabel && (
                        <div className="flex items-center gap-2 py-2 ml-[10px]">
                          <div className={`w-[20px] h-[3px] rounded-full ${phaseColors[event.phase]}`} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {phaseLabels[event.phase]}
                          </span>
                        </div>
                      )}

                      {/* Event */}
                      <div className="flex items-start gap-3 py-2 group">
                        {/* Dot */}
                        <div className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 z-10 bg-card border border-border group-hover:border-primary/30 transition-colors`}>
                          <span className={event.color}>{event.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{event.title}</span>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                          )}
                        </div>

                        {/* Date */}
                        <div className="shrink-0 pt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                          <Clock size={10} />
                          {event.date.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProjectTimeline;
