import {
  ArrowUp,
  Microphone,
  SidebarSimple,
  Sparkle,
} from "@phosphor-icons/react";
import { useCommandConversation } from "../hooks/useCommandConversation";
import { assistantContextLabel } from "../lib/command-routing";
import { ConversationMessage } from "./ConversationMessage";

const prompts = {
  briefing: ["What should I do first?", "Run a scan now"],
  opportunities: ["Why are these ranked first?", "Show me quick applications"],
  profile: ["What does my profile emphasize?", "Update my search criteria"],
};

export function CommandDock({
  open,
  onClose,
  context,
  onScan,
  onSchedule,
  onNavigate,
  onAgentAction,
  opportunities,
}) {
  const conversation = useCommandConversation({
    context,
    onScan,
    onSchedule,
    onNavigate,
    onAgentAction,
    opportunities,
  });
  if (!open) return null;
  const suggestions = context.job
    ? ["Explain this fit", "What evidence is missing?"]
    : prompts[context.page] || prompts.briefing;
  return (
    <aside className="career-assistant" aria-label="CareerOS assistant">
      <header className="career-assistant__header">
        <div>
          <span>
            <Sparkle size={15} weight="fill" /> CareerOS
          </span>
          <strong>Your conversation</strong>
          <small
            className={`career-assistant__agent-state career-assistant__agent-state--${conversation.agentStatus}`}
          >
            {conversation.thinking
              ? "Thinking with Codex"
              : conversation.agentStatus === "connected"
                ? "Codex connected"
                : conversation.agentStatus === "unavailable"
                  ? "Codex unavailable"
                  : "Codex reasoning enabled"}
          </small>
        </div>
        <button onClick={onClose} aria-label="Hide CareerOS chat">
          <SidebarSimple size={20} />
        </button>
      </header>
      <div className="career-assistant__context">
        <span>Using current context</span>
        <strong>{assistantContextLabel(context)}</strong>
      </div>
      <div className="career-assistant__thread" aria-live="polite">
        {conversation.messages.map((message) => (
          <ConversationMessage key={message.id} message={message} compact />
        ))}
        {conversation.thinking && (
          <p className="career-assistant__thinking" role="status">
            CareerOS is thinking…
          </p>
        )}
        <div ref={conversation.endRef} />
      </div>
      <div className="career-assistant__suggestions">
        {suggestions.map((prompt) => (
          <button key={prompt} onClick={() => conversation.send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <form
        className="career-assistant__composer"
        onSubmit={(event) => {
          event.preventDefault();
          conversation.send();
        }}
      >
        <label className="sr-only" htmlFor="career-command">
          Ask CareerOS
        </label>
        <textarea
          ref={conversation.inputRef}
          id="career-command"
          rows="2"
          value={conversation.value}
          onChange={(event) => conversation.setValue(event.target.value)}
          placeholder="Ask anything…"
          disabled={conversation.thinking}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              conversation.send();
            }
          }}
        />
        <footer>
          <button
            type="button"
            className={
              conversation.listening
                ? "command-voice command-voice--active"
                : "command-voice"
            }
            onClick={conversation.listen}
            aria-label="Use voice input"
            disabled={conversation.thinking}
          >
            <Microphone size={18} />
          </button>
          <button
            className="command-send"
            type="submit"
            aria-label="Send message"
            disabled={!conversation.value.trim() || conversation.thinking}
          >
            <ArrowUp size={17} weight="bold" />
          </button>
        </footer>
      </form>
    </aside>
  );
}
