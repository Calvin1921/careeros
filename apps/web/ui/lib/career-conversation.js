export const careerConversationStorageKey =
  "portfolio-demo-careeros:conversation:v3";
export const legacyConversationStorageKeys = [
  "portfolio-demo-careeros:career-conversation",
  "portfolio-demo-careeros:assistant-conversation:v2",
];

export const initialCareerMessages = [
  {
    id: "welcome",
    role: "assistant",
    kind: "system",
    text: "Welcome. Tell CareerOS what you want from your next role. This demo uses a fictional candidate and a live ElevenLabs voice conversation.",
  },
  {
    id: "permission",
    role: "assistant",
    kind: "system",
    text: "Start with a conversation—no CV needed. Review and confirm the details CareerOS proposes before they are saved to your profile. Voice and transcript are processed by ElevenLabs; no application is submitted.",
  },
];

export function normalizeConversationMessage(message, index = 0) {
  if (
    !message ||
    !["assistant", "user"].includes(message.role) ||
    !String(message.text || "").trim()
  )
    return null;
  return {
    id: String(message.id || `migrated-${index}`),
    role: message.role,
    kind: String(message.kind || "chat"),
    text: String(message.text).trim(),
    createdAt: message.createdAt || null,
  };
}

export function mergeConversationHistories(histories = []) {
  const seen = new Set();
  return histories
    .flat()
    .map(normalizeConversationMessage)
    .filter(Boolean)
    .filter((message) => {
      const key = message.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
