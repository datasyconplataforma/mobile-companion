import React from "react";

interface ChatQuestionOptionsProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

const ChatQuestionOptions: React.FC<ChatQuestionOptionsProps> = ({ options, onSelect, disabled }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((option, i) => (
        <button
          key={i}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default ChatQuestionOptions;

/**
 * Parses a message content string and extracts option buttons.
 * Format: [[opção: texto da opção]]
 * Returns { cleanContent, options }
 */
export function parseQuestionOptions(content: string): { cleanContent: string; options: string[] } {
  const optionRegex = /\[\[opção:\s*(.+?)\]\]/g;
  const options: string[] = [];
  let match;
  while ((match = optionRegex.exec(content)) !== null) {
    options.push(match[1].trim());
  }
  const cleanContent = content.replace(optionRegex, "").trim();
  return { cleanContent, options };
}
