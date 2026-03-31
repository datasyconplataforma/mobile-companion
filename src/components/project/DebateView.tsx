import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Bot, MessageSquareWarning, CheckCircle2, XCircle, Clock, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

interface DebateViewProps {
  projectId: string;
}

const providerLabel = (p: string) =>
  ({ lovable: "Lovable AI", gemini: "Google Gemini", openrouter: "OpenRouter", claude: "Claude", ollama: "Ollama" }[p] || p);

const DebateView = ({ projectId }: DebateViewProps) => {
  const { data: debates = [], isLoading } = useQuery({
    queryKey: ["debates", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_debates" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Carregando debates...
      </div>
    );
  }

  if (debates.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-3">
        <Swords size={32} className="opacity-40" />
        <p>Nenhum debate registrado ainda.</p>
        <p className="text-xs">Gere o PRD para ver o debate entre as IAs aqui.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {debates.map((debate: any) => (
          <DebateCard key={debate.id} debate={debate} />
        ))}
      </div>
    </ScrollArea>
  );
};

const DebateCard = ({ debate }: { debate: any }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggle = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const date = new Date(debate.created_at);
  const timeStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Debate #{debate.id?.slice(0, 6) ?? "—"}</span>
          {debate.debate_happened ? (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-0">
              <CheckCircle2 size={10} className="mr-0.5" /> Completo
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <XCircle size={10} className="mr-0.5" /> Sem revisão
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {debate.duration_ms && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> {(debate.duration_ms / 1000).toFixed(1)}s
            </span>
          )}
          <span>{timeStr}</span>
        </div>
      </div>

      {/* Providers */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-primary" />
          <span className="text-xs text-muted-foreground">Principal:</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {providerLabel(debate.main_provider)}
            {debate.main_model && <span className="ml-1 opacity-60">({debate.main_model.split("/").pop()})</span>}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquareWarning size={14} className="text-amber-400" />
          <span className="text-xs text-muted-foreground">Revisora:</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {providerLabel(debate.reviewer_provider)}
            {debate.reviewer_mode === "same" && <span className="ml-1 opacity-60">(mesma)</span>}
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 space-y-0">
        {/* Step 1: Initial output */}
        <CollapsibleStep
          step={1}
          label="IA Principal — Versão Inicial"
          icon={<Bot size={14} />}
          color="text-primary"
          done={true}
          content={debate.initial_output}
          isOpen={expandedSection === "initial"}
          onToggle={() => toggle("initial")}
        />

        {/* Step 2: Review */}
        <CollapsibleStep
          step={2}
          label="IA Revisora — Crítica e Feedback"
          icon={<MessageSquareWarning size={14} />}
          color="text-amber-400"
          done={debate.debate_happened}
          content={debate.review_feedback}
          isOpen={expandedSection === "review"}
          onToggle={() => toggle("review")}
        />

        {/* Step 3: Final */}
        <CollapsibleStep
          step={3}
          label="IA Principal — Versão Refinada"
          icon={<CheckCircle2 size={14} />}
          color="text-emerald-400"
          done={debate.debate_happened && !!debate.final_output}
          content={debate.final_output}
          isOpen={expandedSection === "final"}
          onToggle={() => toggle("final")}
          isLast
        />
      </div>
    </div>
  );
};

const CollapsibleStep = ({
  step,
  label,
  icon,
  color,
  done,
  content,
  isOpen,
  onToggle,
  isLast = false,
}: {
  step: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  done: boolean;
  content?: string | null;
  isOpen: boolean;
  onToggle: () => void;
  isLast?: boolean;
}) => {
  const hasContent = !!content;

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[15px] top-[30px] w-px h-[calc(100%-14px)] bg-border" />
      )}

      <button
        onClick={hasContent ? onToggle : undefined}
        className={`w-full flex items-center gap-3 py-2.5 text-left group ${hasContent ? "cursor-pointer" : "cursor-default"}`}
        disabled={!hasContent}
      >
        {/* Step circle */}
        <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 z-10 ${
          done ? "bg-primary/15" : "bg-secondary"
        }`}>
          <span className={done ? color : "text-muted-foreground"}>{icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <span className={`text-xs font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
            Etapa {step}: {label}
          </span>
          {!done && <span className="text-[10px] text-muted-foreground ml-2">(pulada)</span>}
        </div>

        {hasContent && (
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Expanded content */}
      {isOpen && content && (
        <div className="ml-[42px] mb-3 rounded-lg border border-border bg-secondary/30 p-3 overflow-auto max-h-[400px] scrollbar-thin">
          <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebateView;
