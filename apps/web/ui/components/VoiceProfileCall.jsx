import { ConversationProvider } from "@elevenlabs/react";
import {
  Keyboard,
  Microphone,
  PhoneDisconnect,
  Smiley,
  Sparkle,
} from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { useElevenLabsCall } from "../hooks/useElevenLabsCall";
import { elevenLabsCallLabel } from "../lib/elevenlabs-call";
import { ConversationMessage } from "./ConversationMessage";

const statusLabels = {
  ready: "Your turn",
  speaking: "Speaking",
  listening: "Listening",
  complete: "Ready to review",
};

function LiveTranscript({ interview, onSendText }) {
  const endRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [interview.messages.length]);
  function submit(event) {
    event.preventDefault();
    const text = interview.draft.trim();
    if (!text) return;
    onSendText(text);
    interview.setDraft("");
  }
  return (
    <section
      className="voice-call__conversation"
      aria-label="Live conversation transcript"
    >
      <header>
        <div>
          <h1>Your career conversation</h1>
          <p>Everything said or typed here stays in the same history.</p>
        </div>
        <span>Live transcript</span>
      </header>
      <div className="voice-call__thread" aria-live="polite">
        {interview.messages.map((message) => (
          <ConversationMessage key={message.id} message={message} compact />
        ))}
        <div ref={endRef} />
      </div>
      <form className="voice-call__composer" onSubmit={submit}>
        <Sparkle size={17} weight="fill" />
        <label className="sr-only" htmlFor="voice-call-reply">
          Type during the call
        </label>
        <textarea
          ref={inputRef}
          id="voice-call-reply"
          value={interview.draft}
          onChange={(event) => interview.setDraft(event.target.value)}
          placeholder="Type during the call…"
          rows="2"
        />
        <button type="submit" disabled={!interview.draft.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}

function CallSurface({
  interview,
  status,
  onEnd,
  onToggleMute,
  onSendText,
  isMuted = false,
  providerLabel,
  providerError = "",
}) {
  if (!interview.callOpen) return null;
  const complete = interview.callStatus === "complete";
  const displayStatus =
    status === "Speaking"
      ? "speaking"
      : status === "Listening"
        ? "listening"
        : interview.callStatus;
  return (
    <section
      className="voice-call"
      role="dialog"
      aria-modal="true"
      aria-label="CareerOS profile call"
    >
      <header>
        <strong>CareerOS</strong>
        <span>{providerLabel} · one continuous history</span>
      </header>
      <div className="voice-call__layout">
        <LiveTranscript interview={interview} onSendText={onSendText} />
        <aside className="voice-call__stage" aria-label="Call status">
          <p>CareerOS</p>
          <div
            className={
              displayStatus === "speaking"
                ? "voice-call__avatar voice-call__avatar--speaking"
                : "voice-call__avatar"
            }
          >
            <Smiley size={47} weight="light" />
          </div>
          <time>{interview.elapsedLabel}</time>
          <span
            className={`voice-call__status voice-call__status--${displayStatus}`}
          >
            {status || statusLabels[interview.callStatus]}
          </span>
          {interview.message && !providerError && (
            <p className="voice-call__hint">{interview.message}</p>
          )}
          {providerError && (
            <p className="voice-call__error" role="alert">
              {providerError}
            </p>
          )}
          {!complete && !providerError && (
            <nav className="voice-call__controls" aria-label="Call controls">
              <button
                className={
                  isMuted ? "" : "voice-call__mic voice-call__mic--active"
                }
                onClick={onToggleMute || interview.listen}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                <Microphone size={21} weight="fill" />
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </button>
              <button
                onClick={() =>
                  document.getElementById("voice-call-reply")?.focus()
                }
                aria-label="Type a message"
              >
                <Keyboard size={21} />
                <span>Type</span>
              </button>
              <button
                className="voice-call__end"
                onClick={onEnd || interview.endCall}
                aria-label="End call"
              >
                <PhoneDisconnect size={21} weight="fill" />
                <span>End</span>
              </button>
            </nav>
          )}
          {complete && (
            <button
              className="primary voice-call__return"
              onClick={interview.returnToConversation}
            >
              Return to conversation
            </button>
          )}
          {providerError && (
            <button
              className="secondary voice-call__return"
              onClick={onEnd || interview.endCall}
            >
              Return to conversation
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}

function ElevenLabsCall({ interview }) {
  const conversation = useElevenLabsCall({
    active: interview.callOpen,
    onMessage: interview.addCallMessage,
    onProfileProposal: interview.proposeProfileFacts,
    onConnected: () =>
      interview.setMessage("Connected securely. You can speak naturally."),
    onDisconnected: (details, { expected }) => {
      if (details?.reason === "agent") interview.completeProviderCall();
      else if (!expected)
        interview.setMessage("The voice connection ended unexpectedly.");
    },
    onError: (message) =>
      interview.setMessage(
        message || "ElevenLabs could not connect. Please try again.",
      ),
  });
  const label = elevenLabsCallLabel(conversation);
  const end = () => {
    conversation.endCall();
    interview.endCall();
  };
  const sendText = (text) => {
    interview.addCallMessage({ role: "user", kind: "call", text });
    conversation.sendUserMessage(text);
  };
  return (
    <CallSurface
      interview={interview}
      status={label}
      onEnd={end}
      onToggleMute={() => conversation.setMuted(!conversation.isMuted)}
      onSendText={sendText}
      isMuted={conversation.isMuted}
      providerLabel="ElevenLabs voice · Scripted fictional candidate"
      providerError={conversation.connectionError}
    />
  );
}

export function VoiceProfileCall({ interview }) {
  return (
    <ConversationProvider>
      <ElevenLabsCall interview={interview} />
    </ConversationProvider>
  );
}
