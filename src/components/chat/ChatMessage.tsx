import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import CopyButton from "./CopyButton";
import ChatQuestionOptions, { parseQuestionOptions } from "./ChatQuestionOptions";
import { Message } from "@/types/chat";
import { Bot, User, Trash2, EyeOff, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatMessageProps {
  message: Message;
  onDelete?: (id: string) => void;
  onToggleExclude?: (id: string, excluded: boolean) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onDelete, onToggleExclude }) => {
  const isUser = message.role === "user";
  const isExcluded = message.excluded;
  const isStreaming = message.id === "streaming";

  return (
    <div
      className={`group relative flex gap-3 px-4 py-3 transition-opacity ${
        isUser ? "" : "bg-card/50"
      } ${isExcluded ? "opacity-40" : ""}`}
    >
      <div
        className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
          isUser
            ? "bg-accent text-accent-foreground"
            : "bg-primary/20 text-primary"
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="flex-1 min-w-0 text-sm leading-relaxed">
        {isExcluded && (
          <Badge variant="outline" className="mb-1 text-[10px] px-1.5 py-0 text-muted-foreground border-muted">
            fora do contexto
          </Badge>
        )}
        {isUser ? (
          <p className="text-foreground">{message.content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeString = String(children).replace(/\n$/, "");

                  if (match) {
                    return (
                      <div className="relative my-3 rounded-lg overflow-hidden border border-border">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/80 border-b border-border">
                          <span className="text-xs font-mono text-muted-foreground">
                            {match[1]}
                          </span>
                          <CopyButton text={codeString} />
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            background: "hsl(220 20% 8%)",
                            fontSize: "0.8rem",
                            padding: "0.75rem",
                          }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }

                  return (
                    <code
                      className="px-1.5 py-0.5 rounded bg-secondary text-terminal-cyan font-mono text-xs"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="text-foreground mb-2 last:mb-0">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc pl-4 mb-2 text-foreground space-y-1">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-4 mb-2 text-foreground space-y-1">{children}</ol>;
                },
                strong({ children }) {
                  return <strong className="font-semibold text-terminal-green">{children}</strong>;
                },
                h1({ children }) {
                  return <h1 className="text-lg font-bold text-foreground mt-3 mb-1">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-base font-bold text-foreground mt-3 mb-1">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-sm font-bold text-foreground mt-2 mb-1">{children}</h3>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Action buttons on hover */}
      {!isStreaming && (onDelete || onToggleExclude) && (
        <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1">
          {onToggleExclude && (
            <button
              onClick={() => onToggleExclude(message.id, !isExcluded)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title={isExcluded ? "Incluir no contexto" : "Excluir do contexto"}
            >
              {isExcluded ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              title="Excluir mensagem"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
