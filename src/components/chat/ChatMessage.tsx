import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import CopyButton from "./CopyButton";
import { Message } from "@/types/chat";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 px-4 py-3 ${isUser ? "" : "bg-card/50"}`}>
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
    </div>
  );
};

export default ChatMessage;
