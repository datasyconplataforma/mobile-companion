import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, CheckSquare, Zap, MessageSquare, Loader2, Sparkles, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import PRDView from "@/components/project/PRDView";
import TaskList from "@/components/project/TaskList";
import PromptList from "@/components/project/PromptList";
import LLMSettings from "@/components/project/LLMSettings";
import DocumentList from "@/components/project/DocumentList";

type Tab = "chat" | "prd" | "tasks" | "prompts" | "docs";

const ProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("project_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", id!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_prompts")
        .select("*")
        .eq("project_id", id!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading, streamingContent]);

  const saveMessage = useMutation({
    mutationFn: async ({ role, content }: { role: string; content: string }) => {
      const { error } = await supabase
        .from("chat_messages")
        .insert({ project_id: id!, user_id: user!.id, role, content });
      if (error) throw error;
    },
  });

  const isGenerateRequest = (text: string): boolean => {
    const lower = text.toLowerCase();
    const keywords = ["gere", "gerar", "crie", "criar", "monte", "montar", "atualize", "atualizar", "faça", "fazer"];
    const targets = ["prd", "tarefas", "tarefa", "checklist", "prompts", "prompt", "documento", "plano"];
    return keywords.some((k) => lower.includes(k)) && targets.some((t) => lower.includes(t));
  };

  const buildContext = () => ({
    prd: project?.prd_content || "",
    tasks: tasks.map((t) => ({ title: t.title, completed: t.status === "done" })),
    prompts: prompts.map((p) => ({ title: p.title, content: p.prompt_text })),
    documents: documents
      .filter((d) => d.extracted_text)
      .map((d) => ({ name: d.file_name, content: d.extracted_text })),
  });

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
    if (error) {
      toast({ title: "Erro", description: "Falha ao excluir mensagem.", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["messages", id] });
  };

  const handleToggleExclude = async (messageId: string, excluded: boolean) => {
    const { error } = await supabase.from("chat_messages").update({ excluded }).eq("id", messageId);
    if (error) {
      toast({ title: "Erro", description: "Falha ao atualizar mensagem.", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["messages", id] });
  };

  const handleSend = async (content: string) => {
    // Save user message
    await saveMessage.mutateAsync({ role: "user", content });
    queryClient.invalidateQueries({ queryKey: ["messages", id] });

    const shouldGenerate = isGenerateRequest(content);

    if (shouldGenerate) {
      // Use generate action (non-streaming with tool calling)
      setIsLoading(true);
      try {
        const historyMessages = [
          ...messages.filter((m) => !m.excluded).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content },
        ];

        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: historyMessages,
            projectContext: buildContext(),
            projectId: id,
            userId: user!.id,
            action: "generate",
          }),
        });

        if (!resp.ok) throw new Error("Failed to generate");

        const result = await resp.json();
        const savedItems: string[] = [];
        if (result.saved?.prd) savedItems.push("PRD");
        if (result.saved?.tasks) savedItems.push("Tarefas");
        if (result.saved?.prompts) savedItems.push("Prompts");

        queryClient.invalidateQueries({ queryKey: ["project", id] });
        queryClient.invalidateQueries({ queryKey: ["tasks", id] });
        queryClient.invalidateQueries({ queryKey: ["prompts", id] });

        let replyContent = "";
        if (savedItems.length > 0) {
          replyContent = `✅ Gerei e salvei automaticamente: **${savedItems.join(", ")}**. Confira nas abas do projeto!`;
          toast({ title: "Gerado com sucesso! ✨", description: `${savedItems.join(", ")} salvos.` });
        } else {
          replyContent = result.content || "Preciso de mais detalhes para gerar. Continue descrevendo seu projeto!";
        }
        if (result.content && savedItems.length > 0) {
          replyContent += "\n\n" + result.content;
        }

        await saveMessage.mutateAsync({ role: "assistant", content: replyContent });
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
      } catch (err) {
        console.error("Generate error:", err);
        toast({ title: "Erro", description: "Falha ao gerar. Tente novamente.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Default: streaming chat
    setIsLoading(true);
    setStreamingContent("");

    try {
      const historyMessages = [
        ...messages.filter((m) => !m.excluded).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content },
      ];

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: historyMessages, projectContext: buildContext(), projectId: id }),
      });

      if (!resp.ok || !resp.body) {
        let errMsg = "Falha ao conectar com a IA.";
        try { const errData = await resp.json(); errMsg = errData.error || errMsg; } catch {}
        toast({ title: "Erro", description: errMsg, variant: "destructive" });
        setIsLoading(false);
        setStreamingContent("");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              fullContent += delta;
              setStreamingContent(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (fullContent) {
        await saveMessage.mutateAsync({ role: "assistant", content: fullContent });
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  };

  const handleGenerate = async () => {
    if (messages.length < 4) {
      toast({ title: "Continue conversando", description: "A IA precisa de mais contexto para gerar o PRD. Continue descrevendo seu projeto no chat!" });
      return;
    }

    setIsGenerating(true);
    try {
      const historyMessages = messages.filter((m) => !m.excluded).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: historyMessages,
          projectContext: buildContext(),
          projectId: id,
          userId: user!.id,
          action: "generate",
        }),
      });

      if (!resp.ok) throw new Error("Failed to generate");

      const result = await resp.json();
      const savedItems: string[] = [];
      if (result.saved?.prd) savedItems.push("PRD");
      if (result.saved?.tasks) savedItems.push("Tarefas");
      if (result.saved?.prompts) savedItems.push("Prompts");

      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["prompts", id] });

      if (savedItems.length > 0) {
        toast({ title: "Gerado com sucesso! ✨", description: `${savedItems.join(", ")} salvos nas abas do projeto.` });
        await saveMessage.mutateAsync({ role: "assistant", content: `✅ Gerei e salvei automaticamente: **${savedItems.join(", ")}**. Confira nas abas do projeto!${result.content ? "\n\n" + result.content : ""}` });
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
      } else {
        toast({ title: "Aviso", description: "A IA não conseguiu gerar os documentos. Tente dar mais detalhes no chat.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Generate error:", err);
      toast({ title: "Erro", description: "Falha ao gerar documentos. Tente novamente.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs: { key: Tab; icon: typeof MessageSquare; label: string }[] = [
    { key: "chat", icon: MessageSquare, label: "Chat" },
    { key: "prd", icon: FileText, label: "PRD" },
    { key: "tasks", icon: CheckSquare, label: "Tarefas" },
    { key: "prompts", icon: Zap, label: "Prompts" },
  ];

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card">
        <button onClick={() => navigate("/")} className="p-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </button>
        <span className="font-semibold text-sm text-foreground truncate flex-1">
          {project?.name || "..."}
        </span>
        <LLMSettings projectId={id!} />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isLoading || messages.length < 4}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:shadow-glow transition-all"
        >
          {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Gerar PRD
        </button>
      </header>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-border bg-card/50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "chat" && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
            {messages.length === 0 && !streamingContent ? (
              <div className="flex flex-col items-center justify-center h-full px-6 py-12">
                <MessageSquare size={32} className="text-primary mb-3" />
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Descreva o app que quer construir e eu vou te guiar na criação do PRD completo!
                </p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={{ id: msg.id, role: msg.role as "user" | "assistant", content: msg.content, timestamp: new Date(msg.created_at), excluded: !!(msg as any).excluded }}
                    onDelete={handleDeleteMessage}
                    onToggleExclude={handleToggleExclude}
                  />
                ))}
                {streamingContent && (
                  <ChatMessage
                    message={{ id: "streaming", role: "assistant", content: streamingContent, timestamp: new Date() }}
                  />
                )}
                {isLoading && !streamingContent && <TypingIndicator />}
              </div>
            )}
          </div>
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </>
      )}

      {activeTab === "prd" && <PRDView projectId={id!} prdContent={project?.prd_content} onRegenerate={handleGenerate} isRegenerating={isGenerating} />}
      {activeTab === "tasks" && <TaskList projectId={id!} />}
      {activeTab === "prompts" && <PromptList projectId={id!} />}
    </div>
  );
};

export default ProjectPage;
