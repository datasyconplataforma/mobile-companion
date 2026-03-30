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
    <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-card">
      <div className="max-w-2xl mx-auto space-y-2">
        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary border border-border text-xs text-foreground"
              >
                {att.type === "image" ? (
                  <>
                    <Image size={12} className="text-primary" />
                    {att.url && (
                      <img src={att.url} alt="" className="h-6 w-6 rounded object-cover" />
                    )}
                  </>
                ) : (
                  <FileText size={12} className="text-primary" />
                )}
                <span className="truncate max-w-[120px]">{att.name}</span>
                <button type="button" onClick={() => removeAttachment(i)} className="p-0.5 hover:text-destructive">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Attach buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
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
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
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
              className="w-full resize-none bg-secondary text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring scrollbar-thin font-sans"
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
            className="shrink-0 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:shadow-glow transition-all"
          >
            <Send size={16} />
          </button>
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
