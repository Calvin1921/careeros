import { useEffect, useRef, useState } from "react";
import { defaultProfileSetup, profileSetupReady } from "../lib/profile-setup";
import { useCareerConversation } from "../context/CareerConversationContext";
import {
  confirmedFactsFrom,
  confirmedProfileKey,
  pendingProfileKey,
  profileChangedEvent,
  readLocalProfile,
  validateProfileProposal,
} from "../lib/profile-proposals";

function formatElapsed(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function initialPending() {
  const value = readLocalProfile(pendingProfileKey, null);
  return Array.isArray(value?.facts) ? value : null;
}

export function useProfileInterview() {
  const [setup, setSetup] = useState(defaultProfileSetup);
  const { messages, appendMessage } = useCareerConversation();
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [callOpen, setCallOpen] = useState(false);
  const [callStatus, setCallStatus] = useState("ready");
  const [draft, setDraft] = useState("");
  const [captionsOpen, setCaptionsOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");
  const [pendingProfile, setPendingProfile] = useState(initialPending);
  const [confirmedFacts, setConfirmedFacts] = useState(() =>
    confirmedFactsFrom(readLocalProfile(confirmedProfileKey, null)),
  );
  const [reviewNotice, setReviewNotice] = useState("");

  useEffect(() => {
    if (!callOpen) return;
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [callOpen]);
  function addMessage(entry) {
    // Keep a synchronous transcript for a client-tool call arriving before React's next render.
    messagesRef.current = [...messagesRef.current, entry];
    appendMessage(entry);
  }
  function addCallMessage(entry) {
    addMessage(entry);
  }
  function updateSetup(patch) {
    setSetup((current) => ({ ...current, ...patch }));
  }
  function startCall() {
    if (!profileSetupReady(setup)) return;
    setCallOpen(true);
    setCallStatus("ready");
    setElapsed(0);
    setMessage("");
  }
  function completeProviderCall() {
    setCallStatus("complete");
    setMessage(
      "The call is complete. Review any proposed details before saving them to your profile.",
    );
  }
  function endCall() {
    setCallOpen(false);
    setCallStatus("ready");
    setCaptionsOpen(false);
  }
  function returnToConversation() {
    endCall();
  }
  function sendChat(value) {
    const text = String(value || "").trim();
    if (!text) return;
    addMessage({ role: "user", text });
    setMessage(
      "Note added to this conversation. Start a call to discuss it; your profile has not changed.",
    );
  }
  function proposeProfileFacts(parameters) {
    try {
      const facts = validateProfileProposal(parameters, messagesRef.current);
      const proposal = {
        id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
        createdAt: new Date().toISOString(),
        facts,
      };
      // A durable pending proposal is separate from confirmed facts.
      window.localStorage.setItem(pendingProfileKey, JSON.stringify(proposal));
      setPendingProfile(proposal);
      setReviewNotice(
        "New details proposed from your words. Review each one before saving.",
      );
      return JSON.stringify({
        status: "pending_confirmation",
        proposed: facts.length,
        message:
          "The details are proposed for candidate review. Nothing has been saved to the confirmed profile. Ask them to review the cards after the call.",
      });
    } catch (error) {
      return JSON.stringify({
        status: "rejected",
        message:
          error.message ||
          "The proposed details could not be validated. No profile facts were changed.",
      });
    }
  }
  function updateProposedFact(field, patch) {
    setPendingProfile((current) => {
      if (!current) return current;
      const next = {
        ...current,
        facts: current.facts.map((fact) =>
          fact.field === field
            ? {
                ...fact,
                ...patch,
                ...(Object.hasOwn(patch, "value") ? { approved: false } : {}),
              }
            : fact,
        ),
      };
      try {
        window.localStorage.setItem(pendingProfileKey, JSON.stringify(next));
        setReviewNotice("");
      } catch {
        setReviewNotice(
          "These edits are not saved on this device yet. Keep this page open.",
        );
      }
      return next;
    });
  }
  function saveConfirmedFacts() {
    const chosen = (pendingProfile?.facts || []).filter(
      (fact) => fact.approved && fact.value.trim(),
    );
    if (!chosen.length) {
      setReviewNotice("Select at least one reviewed detail to save.");
      return;
    }
    const confirmedAt = new Date().toISOString();
    const chosenFields = new Set(chosen.map((fact) => fact.field));
    const next = [
      ...confirmedFacts.filter((fact) => !chosenFields.has(fact.field)),
      ...chosen.map(({ approved, ...fact }) => ({
        ...fact,
        value: fact.value.trim(),
        confirmedAt,
        valueSource:
          fact.value.trim() === fact.originalValue
            ? "reviewed-agent-proposal"
            : "candidate-correction",
      })),
    ];
    try {
      window.localStorage.setItem(
        confirmedProfileKey,
        JSON.stringify({ updatedAt: confirmedAt, facts: next }),
      );
    } catch {
      setReviewNotice(
        "The confirmed details could not be saved on this device. Nothing was confirmed.",
      );
      return;
    }
    setConfirmedFacts(next);
    const remaining = {
      ...pendingProfile,
      facts: pendingProfile.facts.filter(
        (fact) => !chosenFields.has(fact.field),
      ),
    };
    try {
      if (remaining.facts.length)
        window.localStorage.setItem(
          pendingProfileKey,
          JSON.stringify(remaining),
        );
      else window.localStorage.removeItem(pendingProfileKey);
    } catch {
      /* Confirmed profile remains saved; remaining proposals are still reviewable. */
    }
    setPendingProfile(remaining.facts.length ? remaining : null);
    setReviewNotice(
      `${chosen.length} reviewed detail${chosen.length === 1 ? "" : "s"} saved to your local profile.`,
    );
    addMessage({
      role: "assistant",
      kind: "profile-confirmed",
      text: `You confirmed ${chosen.length} profile detail${chosen.length === 1 ? "" : "s"}. They are saved on this device.`,
    });
    window.dispatchEvent(new Event(profileChangedEvent));
  }
  function discardProposal() {
    try {
      window.localStorage.removeItem(pendingProfileKey);
    } catch {
      setReviewNotice(
        "The pending proposal could not be removed from this device.",
      );
      return;
    }
    setPendingProfile(null);
    setReviewNotice(
      "Proposal dismissed. Your confirmed profile has not changed.",
    );
  }
  return {
    setup,
    updateSetup,
    messages,
    sourceReady: profileSetupReady(setup),
    callOpen,
    startCall,
    endCall,
    returnToConversation,
    callStatus,
    draft,
    setDraft,
    captionsOpen,
    setCaptionsOpen,
    elapsed,
    elapsedLabel: formatElapsed(elapsed),
    message,
    sendChat,
    addCallMessage,
    completeProviderCall,
    setCallStatus,
    setMessage,
    proposeProfileFacts,
    pendingProfile,
    confirmedFacts,
    reviewNotice,
    updateProposedFact,
    saveConfirmedFacts,
    discardProposal,
  };
}
