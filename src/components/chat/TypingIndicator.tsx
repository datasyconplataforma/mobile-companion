import React from "react";
import { Bot } from "lucide-react";

const TypingIndicator: React.FC = () => (
  <div className="flex gap-3 px-4 py-3 bg-card/50">
    <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-primary/20 text-primary">
      <Bot size={14} />
    </div>
    <div className="flex items-center gap-1 py-2">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: "0s" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: "0.2s" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-typing" style={{ animationDelay: "0.4s" }} />
    </div>
  </div>
);

export default TypingIndicator;
