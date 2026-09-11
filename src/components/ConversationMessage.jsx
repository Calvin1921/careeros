import { Sparkle } from "@phosphor-icons/react";
import "./conversation.css";

export function ConversationMessage({ message, compact = false }) {
  const text =
    message.kind === "call"
      ? message.text.replace(/\[[^\]\n]{1,32}\]\s*/g, "").trim()
      : message.text;
  return (
    <article
      className={`conversation-message conversation-message--${message.role}${compact ? " conversation-message--compact" : ""}`}
    >
      <div className="conversation-message__identity">
        {message.role === "assistant" ? (
          <Sparkle size={15} weight="fill" />
        ) : (
          "DC"
        )}
      </div>
      <div>
        <span>{message.role === "assistant" ? "CareerOS" : "You"}</span>
        <p>{text}</p>
      </div>
    </article>
  );
}
