export type ChatAttachment = {
  type: "image" | "document";
  url?: string; // For images stored in storage
  name: string;
  content?: string; // For document text content
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  excluded?: boolean;
  attachments?: ChatAttachment[];
};
