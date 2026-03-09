import React, { useRef, useEffect, useState } from "react";
import { Terminal, Sparkles } from "lucide-react";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessage from "@/components/chat/ChatMessage";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { Message } from "@/types/chat";

const WELCOME_SUGGESTIONS = [
  "Como criar um hook customizado em React?",
  "Explique useEffect com exemplos",
  "Como usar Tailwind CSS com TypeScript?",
  "Crie um componente de botão acessível",
];

// Mock response for demo — will be replaced with Lovable AI
const mockResponse = async (userMessage: string): Promise<string> => {
  await new Promise((r) => setTimeout(r, 1200));

  if (userMessage.toLowerCase().includes("hook")) {
    return `## Custom Hooks em React

Hooks customizados permitem **extrair lógica reutilizável** de componentes. Veja um exemplo:

\`\`\`typescript
import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(storedValue));
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
\`\`\`

### Como usar:

\`\`\`tsx
const [name, setName] = useLocalStorage('name', '');
\`\`\`

O hook \`useLocalStorage\` sincroniza o estado com o localStorage automaticamente.`;
  }

  return `Boa pergunta! Aqui vai uma resposta sobre **"${userMessage}"**.

Posso te ajudar com:
- **React** — componentes, hooks, state management
- **TypeScript** — tipos, interfaces, generics
- **Tailwind CSS** — classes utilitárias, responsividade
- **Vite** — configuração, plugins, otimização

Me mande um trecho de código e eu explico ou melhoro! 🚀`;
};

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (content: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await mockResponse(content);
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
            <Terminal size={14} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground">CodeBuddy</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
          online
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">CodeBuddy</h2>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
              Seu assistente de programação. Pergunte sobre React, TypeScript, Tailwind e mais.
            </p>
            <div className="w-full max-w-sm space-y-2">
              {WELCOME_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-card border border-border text-sm text-secondary-foreground hover:border-primary/40 hover:shadow-glow transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
};

export default ChatPage;
