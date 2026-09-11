import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  normalizeElevenLabsMessage,
  requestConversationToken,
} from "../lib/elevenlabs-call";

export function useElevenLabsCall({
  active,
  onMessage,
  onProfileProposal,
  onConnected,
  onDisconnected,
  onError,
}) {
  const callbacks = useRef({
    onMessage,
    onProfileProposal,
    onConnected,
    onDisconnected,
    onError,
  });
  callbacks.current = {
    onMessage,
    onProfileProposal,
    onConnected,
    onDisconnected,
    onError,
  };
  const seenMessages = useRef(new Set());
  const activeRef = useRef(active);
  const intentionalEndRef = useRef(false);
  const [connectionError, setConnectionError] = useState("");
  const handleMessage = useCallback((payload) => {
    const message = normalizeElevenLabsMessage(payload);
    if (!message) return;
    const key = payload.event_id;
    if (key && seenMessages.current.has(key)) return;
    if (key) seenMessages.current.add(key);
    callbacks.current.onMessage(message);
  }, []);

  const conversation = useConversation({
    clientTools: {
      propose_profile_facts: (parameters) =>
        callbacks.current.onProfileProposal(parameters),
    },
    onConnect: ({ conversationId }) =>
      callbacks.current.onConnected(conversationId),
    onDisconnect: (details) => {
      const expected =
        intentionalEndRef.current ||
        !activeRef.current ||
        details?.reason === "agent";
      if (!expected)
        setConnectionError(
          "The voice connection ended unexpectedly. You can return and try again.",
        );
      callbacks.current.onDisconnected(details, { expected });
    },
    onError: (message) => {
      const text = message || "ElevenLabs could not connect. Please try again.";
      setConnectionError(text);
      callbacks.current.onError(text);
    },
    onMessage: handleMessage,
  });

  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      intentionalEndRef.current = true;
      conversation.endSession();
      return;
    }
    intentionalEndRef.current = false;
    seenMessages.current.clear();
    setConnectionError("");
    let cancelled = false;
    requestConversationToken()
      .then((conversationToken) => {
        if (cancelled) return;
        return conversation.startSession({
          conversationToken,
          connectionType: "webrtc",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setConnectionError(error.message);
        callbacks.current.onError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(
    () => () => {
      intentionalEndRef.current = true;
      conversation.endSession();
    },
    [],
  );

  const endCall = useCallback(() => {
    intentionalEndRef.current = true;
    conversation.endSession();
  }, [conversation.endSession]);

  return { ...conversation, connectionError, endCall };
}
