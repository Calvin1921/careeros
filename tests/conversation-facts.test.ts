import test from "node:test";
import assert from "node:assert/strict";
import { parseConfirmedFacts } from "../apps/api/src/conversation-facts.rules";
import { profileSignals } from "../apps/api/src/discovery/discovery.rules";
const fact = {
  field: "skills",
  value: " TypeScript ",
  evidence: " I use TypeScript. ",
};
test("facts require explicit confirmation, known unique fields, and supporting evidence", () => {
  for (const body of [
    null,
    { facts: [fact] },
    { facts: [fact], confirmed: false },
    { facts: [fact, fact], confirmed: true },
    { facts: [{ ...fact, field: "salary" }], confirmed: true },
    { facts: [{ ...fact, evidence: " " }], confirmed: true },
    { facts: [{ ...fact, value: "x".repeat(2001) }], confirmed: true },
    {
      facts: [{ ...fact, field: "targetRole", value: "x".repeat(101) }],
      confirmed: true,
    },
    { facts: [{ ...fact, rawTranscript: "private" }], confirmed: true },
  ])
    assert.throws(() => parseConfirmedFacts(body));
  assert.deepEqual(parseConfirmedFacts({ facts: [fact], confirmed: true }), [
    { field: "skills", value: "TypeScript", evidence: "I use TypeScript." },
  ]);
  assert.deepEqual(parseConfirmedFacts({ facts: [], confirmed: true }), []);
});
test("confirmed facts influence discovery without converting aspirations or quotes into skills", () => {
  const facts = parseConfirmedFacts({
    confirmed: true,
    facts: [
      fact,
      {
        field: "targetRole",
        value: "AI Engineer",
        evidence: "I want an AI Engineer role using Python.",
      },
      {
        field: "motivation",
        value: "Learn Go",
        evidence: "I want to learn Go.",
      },
    ],
  });
  const result = profileSignals("Backend engineer with PostgreSQL", facts);
  assert.ok(result.skills.includes("TypeScript"));
  assert.ok(result.skills.includes("PostgreSQL"));
  assert.ok(!result.skills.includes("Python"));
  assert.ok(!result.skills.includes("Go"));
  assert.ok(result.roleTerms.includes("AI Engineer"));
  assert.ok(result.roleTerms.includes("backend"));
  assert.deepEqual(profileSignals("", []), { skills: [], roleTerms: [] });
});
