import React, { useState, useRef } from "react";
import { Send, Paperclip, Image, X, FileText } from "lucide-react";
import { ChatAttachment } from "@/types/chat";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProjectDocument {
  id: string;
  file_name: string;
  extracted_text: string | null;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: ChatAttachment[]) => void;
  isLoading: boolean;
  documents?: ProjectDocument[];
  onUploadFile?: (file: File) => Promise<ChatAttachment | null>;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, documents = [], onUploadFile }) => {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
    setInput("");
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !onUploadFile) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        setIsUploading(true);
        try {
          const attachment = await onUploadFile(file);
          if (attachment) {
            setAttachments((prev) => [...prev, attachment]);
          }
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !onUploadFile) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) continue;
        const attachment = await onUploadFile(file);
        if (attachment) {
          setAttachments((prev) => [...prev, attachment]);
        }
      }
    } finally {
      setIsUploading(false);
    }
    e.target.value = "";
  };

  const handleAttachDocument = (doc: ProjectDocument) => {
    if (!doc.extracted_text) return;
    const already = attachments.some((a) => a.name === doc.file_name && a.type === "document");
    if (already) return;
    setAttachments((prev) => [
      ...prev,
      { type: "document", name: doc.file_name, content: doc.extracted_text! },
    ]);
    setDocsOpen(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const docsWithText = documents.filter((d) => d.extracted_text);

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-6 bg-gradient-to-t from-background via-background/80 to-transparent pt-10">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 duration-300">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl bg-secondary/50 backdrop-blur-md border border-white/5 text-xs text-foreground group/att"
              >
                {att.type === "image" ? (
                  <div className="relative">
                    {att.url && (
                      <img src={att.url} alt="" className="h-8 w-8 rounded-lg object-cover shadow-sm" />
                    )}
                    <div className="absolute inset-0 bg-primary/20 rounded-lg opacity-0 group-hover/att:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText size={14} className="text-primary" />
                  </div>
                )}
                <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                <button type="button" onClick={() => removeAttachment(i)} className="p-1 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="glass-card p-2 border-white/10 rounded-2xl shadow-glow transition-all focus-within:ring-2 focus-within:ring-primary/20">
          <div className="flex items-end gap-2">
          {/* Attach buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-40"
              title="Anexar arquivo ou imagem"
            >
              <Paperclip size={16} />
            </button>
            {docsWithText.length > 0 && (
              <Popover open={docsOpen} onOpenChange={setDocsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={isLoading}
                    className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-40"
                    title="Enviar documento do projeto"
                  >
                    <FileText size={16} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start" side="top">
                  <p className="text-xs font-medium text-muted-foreground px-2 pb-1.5">Documentos do projeto</p>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {docsWithText.map((doc) => {
                      const already = attachments.some((a) => a.name === doc.file_name && a.type === "document");
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleAttachDocument(doc)}
                          disabled={already}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-secondary disabled:opacity-40 transition-colors"
                        >
                          <FileText size={12} className="text-primary shrink-0" />
                          <span className="truncate">{doc.file_name}</span>
                          {already && <span className="text-muted-foreground ml-auto">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isUploading
                  ? "Enviando arquivo..."
                  : "Descreva seu app ou peça uma atualização..."
              }
              rows={1}
              className="w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground/60 rounded-xl px-2 py-2.5 text-sm focus:outline-none scrollbar-thin font-sans leading-relaxed"
              style={{ maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || isLoading || isUploading}
            className="shrink-0 w-10 h-10 rounded-xl bg-brand-gradient text-primary-foreground flex items-center justify-center disabled:opacity-40 shadow-glow hover:scale-110 active:scale-90 transition-all"
          >
            <Send size={18} className={cn(isLoading && "animate-pulse")} />
          </button>
        </div>
        </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.txt,.md,.csv,.json,.pdf,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </form>
  );
};

export default ChatInput;
