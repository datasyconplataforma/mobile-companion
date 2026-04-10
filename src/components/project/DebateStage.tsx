import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Swords, Bot, MessageSquareWarning, CheckCircle2, Loader2, Play,
  ChevronDown, Clock, XCircle, Settings2, Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

interface DebateStageProps {
  projectId: string;
  onPRDGenerated?: () => void;
}

const focusOptions = [
  { id: "consistency", label: "Consistência lógica", description: "Verificar contradições e lacunas nos requisitos" },
  { id: "feasibility", label: "Viabilidade técnica", description: "Avaliar se a stack e arquitetura são viáveis" },
  { id: "requirements", label: "Lacunas de requisitos", description: "Identificar funcionalidades faltantes" },
  { id: "business_rules", label: "Regras de negócio", description: "Garantir conformidade com regras definidas" },
];

const providerLabel = (p: string) =>
  ({ lovable: "Lovable AI", gemini: "Google Gemini", openrouter: "OpenRouter", claude: "Claude", ollama: "Ollama" }[p] || p);

const DebateStage = ({ projectId, onPRDGenerated }: DebateStageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedFocus, setSelectedFocus] = useState<string[]>(["consistency", "requirements"]);
  const [isDebating, setIsDebating] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(true);

  // Load existing debates
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

  // Load context for debate
  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages").select("*").eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const toggleFocus = (id: string) => {
    setSelectedFocus((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleStartDebate = async () => {
    if (messages.length < 4) {
      toast({
        title: "Contexto insuficiente",
        description: "Converse mais na Etapa 02 (Alimentação) antes de iniciar o debate. São necessárias pelo menos 4 mensagens.",
        variant: "destructive",
      });
      return;
    }

    setIsDebating(true);
    setShowConfig(false);

    try {
      const historyMessages = messages
        .filter((m) => !m.excluded)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      // Build focus instructions
      const focusLabels = selectedFocus.map((f) => focusOptions.find((o) => o.id === f)?.label).filter(Boolean);
      const focusInstruction = focusLabels.length > 0
        ? `\n\nFoco da revisão: ${focusLabels.join(", ")}. Concentre a análise e debate nesses pontos.`
        : "";

      // Load business rules for context
      const { data: rules } = await supabase
        .from("project_business_rules" as any)
        .select("content")
        .eq("project_id", projectId)
        .maybeSingle();

      // Load skills
      const { data: skills } = await supabase
        .from("project_skills" as any)
        .select("name, context_md")
        .eq("project_id", projectId);

      // Load documents
      const { data: docs } = await supabase
        .from("project_documents")
        .select("file_name, extracted_text")
        .eq("project_id", projectId);

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...historyMessages,
            {
              role: "user",
              content: `Inicie o debate entre IAs para este projeto. Gere o PRD, tarefas e prompts.${focusInstruction}`,
            },
          ],
          projectContext: {
            prd: projectData?.prd_content || "",
            tasks: [],
            prompts: [],
            documents: (docs || []).filter((d) => d.extracted_text).map((d) => ({ name: d.file_name, content: d.extracted_text })),
            skills: ((skills || []) as any[]).map((s: any) => ({ name: s.name, context: s.context_md || "" })),
            businessRules: (rules as any)?.content || "",
            objective: projectData?.description || "",
          },
          projectId,
          userId: user!.id,
          action: "generate",
        }),
      });

      if (!resp.ok) throw new Error("Failed to start debate");

      const result = await resp.json();

      // Refresh all data
      queryClient.invalidateQueries({ queryKey: ["debates", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["prompts", projectId] });

      const savedItems: string[] = [];
      if (result.saved?.prd) savedItems.push("PRD");
      if (result.saved?.tasks) savedItems.push("Tarefas");
      if (result.saved?.prompts) savedItems.push("Prompts");

      if (savedItems.length > 0) {
        toast({
          title: "Debate concluído! ⚔️",
          description: `${savedItems.join(", ")} gerados a partir do debate.`,
        });
        onPRDGenerated?.();
      } else {
        toast({
          title: "Debate realizado",
          description: "O debate foi registrado mas nenhum artefato foi gerado automaticamente. Tente dar mais contexto na Etapa 02.",
        });
      }
    } catch (err) {
      console.error("Debate error:", err);
      toast({
        title: "Erro no debate",
        description: "Falha ao executar o debate entre IAs. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDebating(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [debates]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 size={20} className="animate-spin mr-2" /> Carregando debates...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Step indicator */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card/50">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            03
          </span>
          <div className="flex-1">
            <span className="text-sm font-semibold text-foreground">Debate de IA / Revisão</span>
            <p className="text-[11px] text-muted-foreground">
              As IAs debatem entre si até chegarem a um consenso. O resultado alimenta o PRD definitivo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-all"
            >
              <Settings2 size={13} />
              Configurar
            </button>
            <button
              onClick={handleStartDebate}
              disabled={isDebating || messages.length < 4}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:shadow-glow transition-all"
            >
              {isDebating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              {isDebating ? "Debatendo..." : "Iniciar Debate"}
            </button>
          </div>
        </div>
      </div>

      {/* Focus configuration panel */}
      {showConfig && (
        <div className="shrink-0 border-b border-border bg-secondary/20 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-semibold text-foreground">Foco da Revisão</span>
              <span className="text-[10px] text-muted-foreground">(selecione os pontos que as IAs devem priorizar)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {focusOptions.map((opt) => {
                const selected = selectedFocus.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleFocus(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-card hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center transition-colors ${
                        selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}>
                        {selected && <CheckCircle2 size={8} className="text-primary-foreground" />}
                      </div>
                      <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground ml-5">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Debates list */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {debates.length === 0 && !isDebating ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-3">
              <Swords size={40} className="opacity-30" />
              <p className="font-medium">Nenhum debate realizado ainda</p>
              <p className="text-xs text-center max-w-xs">
                Configure o foco desejado e clique em "Iniciar Debate" para que as IAs debatam e revisem
                o projeto até chegarem em um consenso para gerar o PRD definitivo.
              </p>
              {messages.length < 4 && (
                <div className="mt-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-400">
                    ⚠️ Volte à Etapa 02 e converse mais com a IA. São necessárias pelo menos 4 mensagens para iniciar o debate.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {isDebating && (
                <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                      <Swords size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Debate em andamento...</p>
                      <p className="text-xs text-muted-foreground">As IAs estão analisando e debatendo o projeto.</p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Bot size={12} className="text-primary" /> IA Principal gerando...</span>
                    <span className="flex items-center gap-1"><MessageSquareWarning size={12} className="text-amber-400" /> IA Revisora aguardando...</span>
                  </div>
                </div>
              )}

              {debates.map((debate: any) => (
                <DebateCard key={debate.id} debate={debate} />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Debate Card Component
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
              <CheckCircle2 size={10} className="mr-0.5" /> Consenso atingido
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
        <CollapsibleStep
          step={1}
          label="IA Principal — Análise e Versão Inicial"
          icon={<Bot size={14} />}
          color="text-primary"
          done={true}
          content={debate.initial_output}
          isOpen={expandedSection === "initial"}
          onToggle={() => toggle("initial")}
        />
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
        <CollapsibleStep
          step={3}
          label="IA Principal — Versão Consensual (PRD Definitivo)"
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

// Collapsible Step Component
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
      {!isLast && (
        <div className="absolute left-[15px] top-[30px] w-px h-[calc(100%-14px)] bg-border" />
      )}

      <button
        onClick={hasContent ? onToggle : undefined}
        className={`w-full flex items-center gap-3 py-2.5 text-left group ${hasContent ? "cursor-pointer" : "cursor-default"}`}
        disabled={!hasContent}
      >
        <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 z-10 ${
          done ? "bg-primary/15" : "bg-secondary"
        }`}>
          <span className={done ? color : "text-muted-foreground"}>{icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <span className={`text-xs font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
            Etapa {step}: {label}
          </span>
          {!done && <span className="text-[10px] text-muted-foreground ml-2">(aguardando)</span>}
        </div>

        {hasContent && (
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

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

export default DebateStage;
