import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, CheckSquare, Zap, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import PRDView from "@/components/project/PRDView";
import TaskList from "@/components/project/TaskList";
import PromptList from "@/components/project/PromptList";

type Tab = "chat" | "prd" | "tasks" | "prompts";

const ProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [isLoading, setIsLoading] = useState(false);
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
        .order("order_index", { ascending: true });
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
        .order("order_index", { ascending: true });
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

  const handleSend = async (content: string) => {
    // Save user message
    await saveMessage.mutateAsync({ role: "user", content });
    queryClient.invalidateQueries({ queryKey: ["messages", id] });

    setIsLoading(true);
    setStreamingContent("");

    try {
      const historyMessages = [
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content },
      ];

      const projectContext = {
        prd: project?.prd_content || "",
        tasks: tasks.map((t) => ({ title: t.title, completed: t.status === "done" })),
        prompts: prompts.map((p) => ({ title: p.title, content: p.prompt_text })),
      };

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: historyMessages, projectContext }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

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
                    message={{ id: msg.id, role: msg.role as "user" | "assistant", content: msg.content, timestamp: new Date(msg.created_at) }}
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

      {activeTab === "prd" && <PRDView projectId={id!} prdContent={project?.prd_content} />}
      {activeTab === "tasks" && <TaskList projectId={id!} />}
      {activeTab === "prompts" && <PromptList projectId={id!} />}
    </div>
  );
};

export default ProjectPage;
