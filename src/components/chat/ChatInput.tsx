import React, { useState } from "react";
import { Send, Plus } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-card">
      <div className="flex items-end gap-2 max-w-2xl mx-auto">
        <button
          type="button"
          className="shrink-0 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={18} />
        </button>
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva seu app ou peça uma atualização..."
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
          disabled={!input.trim() || isLoading}
          className="shrink-0 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:shadow-glow transition-all"
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
