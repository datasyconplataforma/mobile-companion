import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronUp, FileText, X, Check, Upload, Trash2,
  Github, Loader2, Link2, Paperclip,
} from "lucide-react";

interface SkillCardProps {
  skill: any;
  table: "global_skills" | "project_skills";
  showProjectAssign: boolean;
  projects: { id: string; name: string }[];
  assignments: any[];
  onRemove: (id: string) => void;
  onToggleAssign: (skillId: string, skillType: string, projectId: string) => void;
}

const SkillCard = ({
  skill, table, showProjectAssign, projects, assignments, onRemove, onToggleAssign,
}: SkillCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contextDraft, setContextDraft] = useState("");
  const [githubUrl, setGithubUrl] = useState(skill.github_url || "");
  const [editingGithub, setEditingGithub] = useState(false);
  const [importingGithub, setImportingGithub] = useState(false);
  const [uploading, setUploading] = useState(false);

  const hasContext = skill.context_md && skill.context_md.trim();
  const assigned = assignments.filter((a: any) => a.skill_id === skill.id).map((a: any) => a.project_id);
  const isAssigned = (projectId: string) =>
    assignments.some((a: any) => a.skill_id === skill.id && a.project_id === projectId);

  // Fetch attachments for this skill
  const { data: attachments = [] } = useQuery({
    queryKey: ["skill_attachments", skill.id],
    enabled: isExpanded,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_attachments" as any)
        .select("*")
        .eq("skill_id", skill.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateSkillContext = useMutation({
    mutationFn: async (context_md: string) => {
      const { error } = await supabase.from(table as any).update({ context_md } as any).eq("id", skill.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global_skills"] });
      queryClient.invalidateQueries({ queryKey: ["all_project_skills"] });
      setIsEditing(false);
    },
  });

  const updateGithubUrl = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase.from(table as any).update({ github_url: url || null } as any).eq("id", skill.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global_skills"] });
      queryClient.invalidateQueries({ queryKey: ["all_project_skills"] });
      setEditingGithub(false);
    },
  });

  const removeAttachment = useMutation({
    mutationFn: async (att: any) => {
      await supabase.storage.from("skill-attachments").remove([att.file_path]);
      const { error } = await supabase.from("skill_attachments" as any).delete().eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skill_attachments", skill.id] }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${skill.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("skill-attachments")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Extract text from text files
      let extractedText: string | null = null;
      if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
        extractedText = await file.text();
      }

      const { error } = await supabase.from("skill_attachments" as any).insert({
        skill_id: skill.id,
        skill_type: table === "global_skills" ? "global" : "project",
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
        extracted_text: extractedText,
      } as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["skill_attachments", skill.id] });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImportGithub = async () => {
    if (!githubUrl || !user) return;
    setImportingGithub(true);
    try {
      const cleaned = githubUrl.replace(/\.git$/, "").replace(/\/$/, "");
      const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return;
      const [, owner, repo] = match;

      const headers: Record<string, string> = { "User-Agent": "CodeBuddy-App" };

      // Fetch README
      const readmeResp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        { headers }
      );
      let readmeContent = "";
      if (readmeResp.ok) {
        const readmeData = await readmeResp.json();
        readmeContent = atob(readmeData.content);
      }

      // Fetch languages
      const langResp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/languages`,
        { headers }
      );
      let languages = "";
      if (langResp.ok) {
        const langData = await langResp.json();
        languages = Object.keys(langData).join(", ");
      }

      // Build context from GitHub data
      const parts: string[] = [];
      parts.push(`## GitHub: ${owner}/${repo}`);
      if (languages) parts.push(`**Linguagens:** ${languages}`);
      if (readmeContent) {
        parts.push("\n### README\n");
        parts.push(readmeContent.substring(0, 3000));
        if (readmeContent.length > 3000) parts.push("\n...(truncado)");
      }

      const newContext = parts.join("\n");
      const existingContext = skill.context_md || "";
      const merged = existingContext
        ? `${existingContext}\n\n---\n\n${newContext}`
        : newContext;

      await supabase.from(table as any).update({
        context_md: merged,
        github_url: githubUrl,
      } as any).eq("id", skill.id);

      queryClient.invalidateQueries({ queryKey: ["global_skills"] });
      queryClient.invalidateQueries({ queryKey: ["all_project_skills"] });
    } catch (err) {
      console.error("GitHub import error:", err);
    } finally {
      setImportingGithub(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {skill.name}
          {hasContext && <FileText size={12} className="text-primary" />}
          {attachments.length > 0 && <Paperclip size={12} className="text-muted-foreground" />}
          {skill.github_url && <Github size={12} className="text-muted-foreground" />}
        </button>
        <div className="flex items-center gap-1">
          {!hasContext && <span className="text-[10px] text-amber-500 font-medium">sem contexto</span>}
          <button
            onClick={() => onRemove(skill.id)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-4">
          {/* Context editor */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              📝 Contexto (Markdown) — instruções para a IA:
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={contextDraft}
                  onChange={(e) => setContextDraft(e.target.value)}
                  placeholder="Descreva diretrizes, padrões e boas práticas..."
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSkillContext.mutate(contextDraft)}
                    className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 rounded-lg bg-secondary text-muted-foreground text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setIsEditing(true); setContextDraft(skill.context_md || ""); }}
                className="w-full text-left"
              >
                {hasContext ? (
                  <pre className="px-3 py-2 rounded-lg bg-secondary text-foreground text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {skill.context_md}
                  </pre>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-xs italic">
                    Clique para adicionar contexto...
                  </div>
                )}
              </button>
            )}
          </div>

          {/* File attachments */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <Paperclip size={11} /> Anexos
            </label>
            {attachments.length > 0 && (
              <div className="space-y-1 mb-2">
                {attachments.map((att: any) => (
                  <div key={att.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-secondary text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={12} className="text-muted-foreground shrink-0" />
                      <span className="truncate text-foreground">{att.file_name}</span>
                      <span className="text-muted-foreground shrink-0">{formatFileSize(att.file_size)}</span>
                      {att.extracted_text && (
                        <span className="text-primary shrink-0 text-[10px]">texto extraído</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeAttachment.mutate(att)}
                      className="p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.md,.pdf,.doc,.docx,.json,.yaml,.yml,.csv,.xml"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Enviando..." : "Anexar arquivo"}
            </button>
          </div>

          {/* GitHub connection */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <Github size={11} /> Conectar GitHub
            </label>
            {editingGithub || !skill.github_url ? (
              <div className="flex gap-2">
                <input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => updateGithubUrl.mutate(githubUrl)}
                  disabled={!githubUrl.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs disabled:opacity-40"
                  title="Salvar URL"
                >
                  <Link2 size={13} />
                </button>
                <button
                  onClick={handleImportGithub}
                  disabled={!githubUrl.trim() || importingGithub}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 flex items-center gap-1"
                >
                  {importingGithub ? <Loader2 size={13} className="animate-spin" /> : <Github size={13} />}
                  Importar README
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={skill.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline truncate"
                >
                  {skill.github_url}
                </a>
                <button
                  onClick={() => setEditingGithub(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  editar
                </button>
                <button
                  onClick={handleImportGithub}
                  disabled={importingGithub}
                  className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {importingGithub ? <Loader2 size={11} className="animate-spin" /> : null}
                  re-importar
                </button>
              </div>
            )}
          </div>

          {/* Project assignments */}
          {showProjectAssign && projects.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">
                Aplicar nos projetos:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => onToggleAssign(
                      skill.id,
                      table === "global_skills" ? "global" : "project",
                      proj.id,
                    )}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      assigned.length === 0 || isAssigned(proj.id)
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {(assigned.length === 0 || isAssigned(proj.id)) && <Check size={10} />}
                    {proj.name}
                  </button>
                ))}
                {assigned.length > 0 && (
                  <span className="text-[10px] text-muted-foreground self-center ml-1">
                    ({assigned.length} projeto{assigned.length > 1 ? "s" : ""})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillCard;
