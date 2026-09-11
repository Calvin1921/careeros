import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, PhoneCall, Sparkle } from "@phosphor-icons/react";
import { useProfileInterview } from "../hooks/useProfileInterview";
import { ProfileSourceSetup } from "./ProfileSourceSetup";
import { ProfileSummaryCard } from "./ProfileSummaryCard";
import { ProfileProposalReview } from "./ProfileProposalReview";
import { ConversationMessage } from "./ConversationMessage";
import "./profile-setup.css";
const VoiceProfileCall = lazy(() =>
  import("./VoiceProfileCall").then((module) => ({
    default: module.VoiceProfileCall,
  })),
);

export function ProfileConversation({ onClose }) {
  const interview = useProfileInterview();
  const [composer, setComposer] = useState("");
  const endRef = useRef(null);
  useEffect(() => {
    if (!interview.pendingProfile && !interview.confirmedFacts.length)
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [interview.messages.length]);
  useEffect(() => {
    if (!interview.callOpen && interview.pendingProfile)
      document
        .getElementById("profile-proposal-title")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [interview.callOpen, interview.pendingProfile?.id]);
  function send(event) {
    event.preventDefault();
    interview.sendChat(composer);
    setComposer("");
  }
  return (
    <section className="career-conversation">
      <header className="career-conversation__header">
        <button onClick={onClose}>
          <ArrowLeft size={17} /> Back to profile
        </button>
        <div>
          <p className="briefing-kicker">
            <span /> One continuous history
          </p>
          <h1>Your career conversation</h1>
          <p>
            Talk first. Review the proposed details before they become part of
            your profile.
          </p>
        </div>
      </header>
      <div className="career-thread">
        {interview.messages
          .filter((message) => message.kind !== "profile")
          .map((message) => (
            <ConversationMessage key={message.id} message={message} />
          ))}
        <ProfileProposalReview interview={interview} />
        {interview.reviewNotice && (
          <p className="profile-review-notice" role="status">
            {interview.reviewNotice}
          </p>
        )}
        {!!interview.confirmedFacts.length && (
          <ProfileSummaryCard facts={interview.confirmedFacts} />
        )}
        <ProfileSourceSetup interview={interview} />
        {interview.message && !interview.callOpen && (
          <p className="fine" role="status">
            {interview.message}
          </p>
        )}
        <div ref={endRef} />
      </div>
      <form className="career-composer" onSubmit={send}>
        <Sparkle size={18} weight="fill" />
        <label className="sr-only" htmlFor="profile-chat">
          Add a conversation note
        </label>
        <input
          id="profile-chat"
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
          placeholder="Add a note for your conversation…"
        />
        <button
          type="button"
          onClick={interview.startCall}
          aria-label="Start a call"
        >
          <PhoneCall size={19} />
        </button>
        <button
          type="submit"
          disabled={!composer.trim()}
          aria-label="Save conversation note"
        >
          <ArrowUp size={18} weight="bold" />
        </button>
      </form>
      <Suspense fallback={null}>
        <VoiceProfileCall interview={interview} />
      </Suspense>
    </section>
  );
}
