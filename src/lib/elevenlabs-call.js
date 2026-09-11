export function normalizeElevenLabsMessage(payload = {}) {
  const text = String(payload.message || "").trim();
  if (!text || /^[.\s…]+$/.test(text)) return null;
  return {
    role:
      payload.role === "user" || payload.source === "user"
        ? "user"
        : "assistant",
    kind: "call",
    text,
  };
}

export function elevenLabsCallLabel({ status, mode }) {
  if (status === "connecting") return "Connecting";
  if (status === "error") return "Connection problem";
  if (status !== "connected") return "Ready to call";
  return mode === "speaking" ? "Speaking" : "Listening";
}

export async function requestConversationToken(fetchImpl = fetch) {
  const response = await fetchImpl("/api/voice/token", {
    method: "POST",
    headers: { "x-careeros-action": "voice-call" },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token)
    throw new Error(body.message || "The voice call could not start.");
  return body.token;
}
