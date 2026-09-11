import { BadRequestException } from "@nestjs/common";
export const conversationFields = [
  "targetRole",
  "experience",
  "skills",
  "location",
  "workStyle",
  "motivation",
] as const;
export type ConversationFact = {
  field: (typeof conversationFields)[number];
  value: string;
  evidence: string;
  confirmedAt?: string;
};
export function parseConfirmedFacts(input: unknown): ConversationFact[] {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new BadRequestException("Provide confirmed profile facts.");
  const body = input as Record<string, unknown>;
  if (
    body.confirmed !== true ||
    Object.keys(body).some((key) => !["facts", "confirmed"].includes(key))
  )
    throw new BadRequestException("Explicit confirmation is required.");
  if (!Array.isArray(body.facts) || body.facts.length > 6)
    throw new BadRequestException("Provide up to six profile facts.");
  const seen = new Set<string>();
  return body.facts.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      Object.keys(item).some(
        (key) => !["field", "value", "evidence"].includes(key),
      )
    )
      throw new BadRequestException("Invalid profile fact.");
    const { field, value, evidence } = item;
    if (!conversationFields.includes(field) || seen.has(field))
      throw new BadRequestException("Use each allowed profile field once.");
    seen.add(field);
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > (field === "targetRole" ? 100 : 2000) ||
      typeof evidence !== "string" ||
      !evidence.trim() ||
      evidence.trim().length > 4000 ||
      /\u0000/.test(value + evidence)
    )
      throw new BadRequestException(
        "Each fact needs a bounded value and supporting quote.",
      );
    return { field, value: value.trim(), evidence: evidence.trim() };
  });
}
