import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, FileText, CheckSquare, Zap, MessageSquare, Loader2, Sparkles, Paperclip,
  Wrench, Scale, Swords, RotateCcw, Plug, Pencil, Check, X, Target, Calendar,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import PRDView from "@/components/project/PRDView";
import TaskList from "@/components/project/TaskList";
import PromptList from "@/components/project/PromptList";
import LLMSettings from "@/components/project/LLMSettings";
import DocumentList from "@/components/project/DocumentList";
import ProjectSkills from "@/components/project/ProjectSkills";
import BusinessRules from "@/components/project/BusinessRules";
import ConsistencyCheck from "@/components/project/ConsistencyCheck";
import GitHubConnection from "@/components/project/GitHubConnection";
import ShareProject from "@/components/project/ShareProject";
import DebateStage from "@/components/project/DebateStage";
import MCPConfig from "@/components/project/MCPConfig";
import ProjectObjective from "@/components/project/ProjectObjective";
import ProjectTimeline from "@/components/project/ProjectTimeline";
import { ChatAttachment } from "@/types/chat";

type Tab = "chat" | "prd" | "tasks" | "prompts" | "rules" | "docs" | "skills" | "debate" | "timeline" | "mcp";

const statusOptions = [
  { value: "planning", label: "Planejando", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "prd_ready", label: "PRD Pronto", color: "bg-cyan-500/20 text-cyan-400" },
  { value: "building", label: "Construindo", color: "bg-primary/20 text-primary" },
  { value: "done", label: "Concluído", color: "bg-green-500/20 text-green-400" },
];

const tabGroups = [
  {
    label: "Configuração",
    tabs: [
      { key: "rules" as Tab, icon: Gavel, label: "Regras" },
      { key: "skills" as Tab, icon: Wrench, label: "Skills" },
      { key: "docs" as Tab, icon: Paperclip, label: "Docs" },
      { key: "mcp" as Tab, icon: Plug, label: "MCP" },
    ],
  },
  {
    label: "Planejamento",
    tabs: [
      { key: "chat" as Tab, icon: MessageSquare, label: "01·Chat" },
      { key: "debate" as Tab, icon: BrainCircuit, label: "02·Debate" },
      { key: "prd" as Tab, icon: ScrollText, label: "03·PRD" },
    ],
  },
  {
    label: "Execução",
    tabs: [
      { key: "tasks" as Tab, icon: CheckSquare, label: "04·Tarefas" },
      { key: "prompts" as Tab, icon: Code2, label: "05·Prompts" },
      { key: "timeline" as Tab, icon: History, label: "06·Timeline" },
    ],
  },
];

const ProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("objective");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages").select("*").eq("project_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_tasks").select("*").eq("project_id", id!).order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_prompts").select("*").eq("project_id", id!).order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: debates = [] } = useQuery({
    queryKey: ["debates", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_debates").select("review_feedback, final_output, debate_happened").eq("project_id", id!).order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_documents").select("*").eq("project_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["skills", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_skills" as any).select("*").eq("project_id", id!).order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: globalSkills = [] } = useQuery({
    queryKey: ["global_skills_for_project", user?.id, id],
    enabled: !!user,
    queryFn: async () => {
      const { data: allGlobal, error } = await supabase.from("global_skills" as any).select("*").eq("user_id", user!.id);
      if (error) throw error;
      const allGlobalSkills = allGlobal as any[];
      const { data: assignments } = await supabase
        .from("skill_project_assignments" as any).select("skill_id").eq("user_id", user!.id).eq("project_id", id!);
      if (!assignments || assignments.length === 0) {
        const { data: anyAssignments } = await supabase
          .from("skill_project_assignments" as any).select("id").eq("user_id", user!.id).limit(1);
        if (!anyAssignments || anyAssignments.length === 0) return allGlobalSkills;
        return [];
      }
      const assignedIds = new Set((assignments as any[]).map((a: any) => a.skill_id));
      return allGlobalSkills.filter((s: any) => assignedIds.has(s.id));
    },
  });

  const { data: businessRules } = useQuery({
    queryKey: ["business_rules", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_business_rules" as any).select("*").eq("project_id", id!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: skillAttachments = [] } = useQuery({
    queryKey: ["skill_attachments_for_project", id, user?.id],
    enabled: !!user && (skills.length > 0 || globalSkills.length > 0),
    queryFn: async () => {
      const allSkillIds = [...skills.map((s: any) => s.id), ...globalSkills.map((s: any) => s.id)];
      if (allSkillIds.length === 0) return [];
      const { data, error } = await supabase
        .from("skill_attachments" as any).select("skill_id, file_name, extracted_text")
        .in("skill_id", allSkillIds).eq("user_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading, streamingContent]);

  const saveMessage = useMutation({
    mutationFn: async ({ role, content }: { role: string; content: string }) => {
      const { error } = await supabase.from("chat_messages").insert({ project_id: id!, user_id: user!.id, role, content });
      if (error) throw error;
    },
  });

  const updateProject = useMutation({
    mutationFn: async (updates: { description?: string; status?: string }) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", id] }),
  });

  const isGenerateRequest = (text: string): boolean => {
    const lower = text.toLowerCase();
    const keywords = ["gere", "gerar", "crie", "criar", "monte", "montar", "atualize", "atualizar", "faça", "fazer"];
    const targets = ["prd", "tarefas", "tarefa", "checklist", "prompts", "prompt", "documento", "plano"];
    return keywords.some((k) => lower.includes(k)) && targets.some((t) => lower.includes(t));
  };

  const enrichSkill = (s: any) => {
    const atts = skillAttachments.filter((a: any) => a.skill_id === s.id && a.extracted_text);
    const attachmentText = atts.map((a: any) => `### Anexo: ${a.file_name}\n${a.extracted_text}`).join("\n\n");
    const fullContext = [s.context_md || "", attachmentText].filter(Boolean).join("\n\n");
    return { name: s.name, context: fullContext };
  };

  const buildDebateSummary = (debate: any): string => {
    if (!debate) return "";
    const providerLabel = (p: string) => ({ lovable: "Lovable AI", gemini: "Google Gemini", openrouter: "OpenRouter", claude: "Claude", ollama: "Ollama" }[p] || p);
    let summary = "\n\n---\n⚖️ **Debate entre IAs**\n";
    if (debate.happened) {
      summary += `| Etapa | Status |\n|---|---|\n`;
      for (const s of debate.steps) {
        summary += `| ${s.label} | ${s.done ? "✅" : "⏭️ Pulado"} |\n`;
      }
      summary += `\n- **IA Principal:** ${providerLabel(debate.mainProvider)}${debate.mainModel ? ` (${debate.mainModel})` : ""}\n`;
      summary += `- **IA Revisora:** ${providerLabel(debate.reviewerProvider)}${debate.reviewerMode === "same" ? " (mesma IA)" : " (independente)"}\n`;
      if (debate.feedbackPreview) {
        summary += `\n<details><summary>📋 Prévia do feedback da revisora</summary>\n\n${debate.feedbackPreview}\n\n</details>`;
      }
    } else {
      summary += "⏭️ O debate não ocorreu nesta geração (sem feedback da revisora).";
    }
    return summary;
  };

  const buildContext = () => ({
    prd: project?.prd_content || "",
    tasks: tasks.map((t) => ({ title: t.title, completed: t.status === "done" })),
    prompts: prompts.map((p) => ({ title: p.title, content: p.prompt_text })),
    documents: documents.filter((d) => d.extracted_text).map((d) => ({ name: d.file_name, content: d.extracted_text })),
    skills: skills.map(enrichSkill),
    globalSkills: globalSkills.map(enrichSkill),
    businessRules: businessRules?.content || "",
    debates: debates.filter((d) => d.review_feedback).map((d) => ({ reviewFeedback: d.review_feedback, finalOutput: d.final_output })),
  });

  const handleUploadFile = async (file: File): Promise<ChatAttachment | null> => {
    try {
      const isImage = file.type.startsWith("image/");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user!.id}/${id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("project-documents").upload(path, file);
      if (uploadError) throw uploadError;

      if (isImage) {
        const { data: urlData } = supabase.storage.from("project-documents").getPublicUrl(path);
        return { type: "image", name: file.name, url: urlData.publicUrl };
      } else {
        let extractedText: string | null = null;
        const textTypes = ["text/plain", "text/markdown", "text/csv", "application/json"];
        if (textTypes.includes(file.type) || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
          extractedText = await file.text();
        }
        await supabase.from("project_documents").insert({
          project_id: id!, user_id: user!.id, file_name: file.name, file_path: path,
          file_type: file.type || "application/octet-stream", file_size: file.size, extracted_text: extractedText,
        });
        queryClient.invalidateQueries({ queryKey: ["documents", id] });
        return { type: "document", name: file.name, content: extractedText || undefined };
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Erro", description: "Falha ao enviar arquivo.", variant: "destructive" });
      return null;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
    if (error) { toast({ title: "Erro", description: "Falha ao excluir mensagem.", variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["messages", id] });
  };

  const handleToggleExclude = async (messageId: string, excluded: boolean) => {
    const { error } = await supabase.from("chat_messages").update({ excluded }).eq("id", messageId);
    if (error) { toast({ title: "Erro", description: "Falha ao atualizar mensagem.", variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["messages", id] });
  };

  const handleSend = async (content: string, attachments?: ChatAttachment[]) => {
    let enrichedContent = content;
    if (attachments && attachments.length > 0) {
      const attachmentParts: string[] = [];
      for (const att of attachments) {
        if (att.type === "document" && att.content) {
          attachmentParts.push(`\n\n📎 **Documento anexado: ${att.name}**\n\`\`\`\n${att.content.slice(0, 8000)}\n\`\`\``);
        } else if (att.type === "image" && att.url) {
          attachmentParts.push(`\n\n🖼️ **Imagem anexada: ${att.name}**\n![${att.name}](${att.url})`);
        }
      }
      enrichedContent = content + attachmentParts.join("");
    }

    await saveMessage.mutateAsync({ role: "user", content: enrichedContent });
    queryClient.invalidateQueries({ queryKey: ["messages", id] });

    const shouldGenerate = isGenerateRequest(content);

    if (shouldGenerate) {
      setIsLoading(true);
      try {
        const historyMessages = [
          ...messages.filter((m) => !m.excluded).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: enrichedContent },
        ];
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ messages: historyMessages, projectContext: buildContext(), projectId: id, userId: user!.id, action: "generate" }),
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
        queryClient.invalidateQueries({ queryKey: ["debates", id] });
        let replyContent = "";
        if (savedItems.length > 0) {
          replyContent = `✅ Gerei e salvei automaticamente: **${savedItems.join(", ")}**. Confira nas abas do projeto!`;
          toast({ title: "Gerado com sucesso! ✨", description: `${savedItems.join(", ")} salvos.` });
        } else {
          replyContent = result.content || "Preciso de mais detalhes para gerar. Continue descrevendo seu projeto!";
        }
        if (result.content && savedItems.length > 0) replyContent += "\n\n" + result.content;
        replyContent += buildDebateSummary(result.debate);
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
        { role: "user" as const, content: enrichedContent },
      ];
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
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
            if (delta) { fullContent += delta; setStreamingContent(fullContent); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: historyMessages, projectContext: buildContext(), projectId: id, userId: user!.id, action: "generate" }),
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
      queryClient.invalidateQueries({ queryKey: ["debates", id] });
      if (savedItems.length > 0) {
        const debateInfo = buildDebateSummary(result.debate);
        toast({ title: "Gerado com sucesso! ✨", description: `${savedItems.join(", ")} salvos nas abas do projeto.` });
        await saveMessage.mutateAsync({ role: "assistant", content: `✅ Gerei e salvei automaticamente: **${savedItems.join(", ")}**. Confira nas abas do projeto!${result.content ? "\n\n" + result.content : ""}${debateInfo}` });
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

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const results = await Promise.all([
        supabase.from("chat_messages").delete().eq("project_id", id!),
        supabase.from("project_tasks").delete().eq("project_id", id!),
        supabase.from("project_prompts").delete().eq("project_id", id!),
        supabase.from("project_debates").delete().eq("project_id", id!),
        supabase.from("projects").update({ prd_content: null }).eq("id", id!),
      ]);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        toast({ title: "Erro parcial", description: `Falha em ${errors.length} operação(ões) do reset.`, variant: "destructive" });
      }
      setStreamingContent("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["prompts", id] });
      queryClient.invalidateQueries({ queryKey: ["debates", id] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setActiveTab("chat");
      if (errors.length === 0) {
        toast({ title: "Projeto resetado", description: "Chat, PRD, tarefas, prompts e debates foram limpos." });
      }
    } catch (err) {
      console.error("Reset error:", err);
      toast({ title: "Erro", description: "Falha ao resetar o projeto.", variant: "destructive" });
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  // Tab badge counts
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const taskBadge = tasks.length > 0 ? `${completedTasks}/${tasks.length}` : null;
  const promptBadge = prompts.length > 0 ? `${prompts.length}` : null;
  const docBadge = documents.length > 0 ? `${documents.length}` : null;
  const tabBadges: Partial<Record<Tab, string | null>> = {
    tasks: taskBadge,
    prompts: promptBadge,
    docs: docBadge,
  };

  // Progress bar
  const totalProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const parseStoredAttachments = (content: string) => {
    const attachments: ChatAttachment[] = [];
    const imgRegex = /🖼️ \*\*Imagem anexada: (.+?)\*\*\n!\[.+?\]\((.+?)\)/g;
    const docRegex = /📎 \*\*Documento anexado: (.+?)\*\*/g;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      attachments.push({ type: "image", name: match[1], url: match[2] });
    }
    while ((match = docRegex.exec(content)) !== null) {
      attachments.push({ type: "document", name: match[1] });
    }
    let clean = content
      .replace(/\n\n🖼️ \*\*Imagem anexada: .+?\*\*\n!\[.+?\]\(.+?\)/g, "")
      .replace(/\n\n📎 \*\*Documento anexado: .+?\*\*\n```\n[\s\S]*?\n```/g, "")
      .trim();
    return { attachments, cleanContent: clean };
  };

  const currentStatus = statusOptions.find((s) => s.value === project?.status) || statusOptions[0];

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
        {/* Top row */}
        <div className="flex items-center gap-2 px-3 py-2">
          <button onClick={() => navigate("/")} className="p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">{project?.name || "..."}</span>
              {/* Status selector */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${currentStatus.color} hover:opacity-80 transition-opacity`}
                >
                  {currentStatus.label}
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-36 py-1 rounded-lg bg-card border border-border shadow-xl">
                    {statusOptions.map((opt) => (
                      <button key={opt.value}
                        onClick={() => { updateProject.mutate({ status: opt.value }); setShowStatusMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-secondary transition-colors flex items-center gap-2 ${opt.value === project?.status ? "text-primary font-medium" : "text-foreground"}`}>
                        <span className={`w-2 h-2 rounded-full ${opt.color.split(" ")[0]}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Description */}
            {editingDesc ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <input autoFocus value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { updateProject.mutate({ description: descDraft }); setEditingDesc(false); } }}
                  placeholder="Descrição do projeto..."
                  className="flex-1 text-xs px-1.5 py-0.5 rounded bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <button onClick={() => { updateProject.mutate({ description: descDraft }); setEditingDesc(false); }}
                  className="p-0.5 text-primary"><Check size={12} /></button>
                <button onClick={() => setEditingDesc(false)}
                  className="p-0.5 text-muted-foreground"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => { setDescDraft(project?.description || ""); setEditingDesc(true); }}
                className="flex items-center gap-1 mt-0.5 group/desc">
                <span className="text-[11px] text-muted-foreground truncate max-w-[300px]">
                  {project?.description || "Adicionar descrição..."}
                </span>
                <Pencil size={10} className="text-muted-foreground opacity-0 group-hover/desc:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Progress bar (compact) */}
          {tasks.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${totalProgress}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{totalProgress}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <ShareProject projectId={id!} isOwner={project?.user_id === user?.id} />
            <ConsistencyCheck projectId={id!} onSendToChat={(msg) => { setActiveTab("chat"); handleSend(msg); }} />
            <GitHubConnection projectId={id!} githubRepoUrl={project?.github_repo_url} onRepoUpdated={() => queryClient.invalidateQueries({ queryKey: ["project", id] })} />
            <LLMSettings />
            <div className="relative flex items-center gap-1">
              <button onClick={handleGenerate} disabled={isGenerating || isLoading || messages.length < 4}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:shadow-glow transition-all">
                {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Gerar
              </button>
              <button onClick={() => setShowResetConfirm(true)} disabled={isResetting}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium disabled:opacity-40 hover:bg-destructive/90 transition-all"
                title="Resetar projeto">
                {isResetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              </button>
              {showResetConfirm && (
                <div className="absolute top-full right-0 mt-2 z-50 w-72 p-4 rounded-xl bg-card border border-border shadow-xl">
                  <p className="text-sm font-medium text-foreground mb-1">Resetar projeto?</p>
                  <p className="text-xs text-muted-foreground mb-3">Isso vai apagar: chat, PRD, tarefas, prompts e debates. Essa ação não pode ser desfeita.</p>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowResetConfirm(false)} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs">Cancelar</button>
                    <button onClick={handleReset} disabled={isResetting}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium disabled:opacity-50">
                      {isResetting && <Loader2 size={12} className="animate-spin" />}
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs - grouped */}
        <div className="flex items-center px-1">
          {tabGroups.map((group, gi) => (
            <div key={group.label} className="flex items-center">
              {gi > 0 && (
                <div className="w-px h-5 bg-border mx-0.5" />
              )}
              {group.tabs.map((tab) => {
                const badge = tabBadges[tab.key];
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium transition-colors relative ${
                      activeTab === tab.key
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}>
                    <tab.icon size={13} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {badge && (
                      <span className="text-[9px] font-mono px-1 py-0 rounded-full bg-secondary text-muted-foreground ml-0.5">
                        {badge}
                      </span>
                    )}
                    {activeTab === tab.key && (
                      <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </header>

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
                {messages.map((msg, idx) => {
                  const isLastAssistant = msg.role === "assistant" && !messages.slice(idx + 1).some(m => m.role === "assistant");
                  const parsed = msg.role === "user" ? parseStoredAttachments(msg.content) : { attachments: [], cleanContent: msg.content };
                  return (
                    <ChatMessage key={msg.id}
                      message={{
                        id: msg.id, role: msg.role as "user" | "assistant", content: parsed.cleanContent,
                        timestamp: new Date(msg.created_at), excluded: !!msg.excluded,
                        attachments: parsed.attachments.length > 0 ? parsed.attachments : undefined,
                      }}
                      onDelete={handleDeleteMessage} onToggleExclude={handleToggleExclude}
                      onSendOption={handleSend} isLastAssistant={isLastAssistant} isLoading={isLoading} />
                  );
                })}
                {streamingContent && (
                  <ChatMessage message={{ id: "streaming", role: "assistant", content: streamingContent, timestamp: new Date() }} />
                )}
                {isLoading && !streamingContent && <TypingIndicator />}
              </div>
            )}
          </div>
          <ChatInput onSend={handleSend} isLoading={isLoading} documents={documents} onUploadFile={handleUploadFile} />
        </>
      )}

      {activeTab === "prd" && (
        <PRDView projectId={id!} prdContent={project?.prd_content} onRegenerate={handleGenerate} isRegenerating={isGenerating} />
      )}
      {activeTab === "tasks" && <TaskList projectId={id!} />}
      {activeTab === "prompts" && <PromptList projectId={id!} />}
      {activeTab === "rules" && <BusinessRules projectId={id!} />}
      {activeTab === "docs" && <DocumentList projectId={id!} />}
      {activeTab === "skills" && <ProjectSkills projectId={id!} />}
      {activeTab === "debate" && <DebateStage projectId={id!} onPRDGenerated={() => { queryClient.invalidateQueries({ queryKey: ["project", id] }); setActiveTab("prd"); }} />}
      {activeTab === "timeline" && <ProjectTimeline projectId={id!} />}
    </div>
  );
};

export default ProjectPage;
