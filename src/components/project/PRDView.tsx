import ReactMarkdown from "react-markdown";
import { FileText } from "lucide-react";

interface PRDViewProps {
  projectId: string;
  prdContent?: string | null;
}

const PRDView = ({ prdContent }: PRDViewProps) => {
  if (!prdContent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <FileText size={32} className="text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          O PRD será gerado automaticamente conforme você conversa no chat. Continue descrevendo seu projeto!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
      <div className="max-w-2xl mx-auto prose-chat">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mt-4 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold text-foreground mt-3 mb-1">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold text-foreground mt-2 mb-1">{children}</h3>,
            p: ({ children }) => <p className="text-sm text-foreground mb-2">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 text-sm text-foreground space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 text-sm text-foreground space-y-1">{children}</ol>,
            strong: ({ children }) => <strong className="font-semibold text-terminal-green">{children}</strong>,
          }}
        >
          {prdContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default PRDView;
