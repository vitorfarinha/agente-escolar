import { Fragment } from "react";
import { AssistantAvatar, GuardianAvatar } from "./avatar";
import { MessageFeedback, type FeedbackType } from "./message-feedback";

export type ChatMessageData = {
  id: string;
  role: "assistant" | "user";
  content: string;
  /** id real da linha em `messages` — só existe depois de persistida; necessário para o feedback. */
  messageId?: string;
};

/** Destaca factos-chave (**negrito**) que o assistente devolve no texto da resposta. */
function renderFormattedContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function ChatMessage({
  message,
  guardianName,
  onFeedback,
}: {
  message: ChatMessageData;
  guardianName: string;
  onFeedback?: (messageId: string, type: FeedbackType) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser ? <GuardianAvatar name={guardianName} /> : <AssistantAvatar />}

      <div className={`flex max-w-[80%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
            isUser ? "rounded-br-sm bg-brand-900 text-white" : "rounded-bl-sm bg-surface-card text-primary"
          }`}
        >
          {isUser ? message.content : renderFormattedContent(message.content)}
        </div>

        {!isUser && message.messageId && onFeedback && (
          <MessageFeedback messageId={message.messageId} content={message.content} onFeedback={onFeedback} />
        )}
      </div>
    </div>
  );
}
