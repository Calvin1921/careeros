export const profileFields = Object.freeze({
  targetRole: "Target role",
  experience: "Experience",
  skills: "Skills",
  location: "Location",
  workStyle: "Working style",
  motivation: "What matters next",
});
export const pendingProfileKey = "portfolio-demo-careeros.pending-profile.v1";
export const confirmedProfileKey =
  "portfolio-demo-careeros.confirmed-profile.v1";
export const profileChangedEvent = "portfolio-demo-profile-confirmed";

export function normalizeEvidence(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function validateProfileProposal(parameters, messages) {
  if (
    !Array.isArray(parameters?.facts) ||
    parameters.facts.length < 1 ||
    parameters.facts.length > 6
  ) {
    throw new Error("Propose between one and six facts.");
  }
  const userTurns = messages.filter(
    (message) => message.role === "user" && typeof message.text === "string",
  );
  if (!userTurns.length)
    throw new Error(
      "No candidate transcript is available yet. Wait for a candidate reply.",
    );
  const fields = new Set();
  return parameters.facts.map((fact) => {
    if (!Object.hasOwn(profileFields, fact?.field) || fields.has(fact.field))
      throw new Error("Use each allowed profile field at most once.");
    fields.add(fact.field);
    if (
      typeof fact.value !== "string" ||
      !fact.value.trim() ||
      fact.value.length > (fact.field === "targetRole" ? 100 : 1600)
    )
      throw new Error("Each fact needs a concise proposed value.");
    if (typeof fact.evidence !== "string" || fact.evidence.length > 1600)
      throw new Error("Each fact needs a literal quote from the candidate.");
    const quote = normalizeEvidence(fact.evidence);
    if (quote.length < 8)
      throw new Error("Use a meaningful literal quote from the candidate.");
    const source = userTurns.find((turn) =>
      normalizeEvidence(turn.text).includes(quote),
    );
    if (!source)
      throw new Error(
        `The quote for ${fact.field} does not match the candidate transcript. Use their exact words.`,
      );
    return {
      field: fact.field,
      value: fact.value.trim(),
      originalValue: fact.value.trim(),
      evidence: fact.evidence.trim(),
      sourceText: source.text,
      approved: false,
    };
  });
}

export function readLocalProfile(key, fallback) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function confirmedFactsFrom(value) {
  if (!Array.isArray(value?.facts)) return [];
  return value.facts.filter(
    (fact) =>
      Object.hasOwn(profileFields, fact?.field) &&
      typeof fact.value === "string" &&
      fact.confirmedAt,
  );
}
