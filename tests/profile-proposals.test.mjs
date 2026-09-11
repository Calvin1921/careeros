import test from "node:test";
import assert from "node:assert/strict";
import {
  validateProfileProposal,
  confirmedFactsFrom,
} from "../src/lib/profile-proposals.js";
import {
  profileSetupReady,
  defaultProfileSetup,
} from "../src/lib/profile-setup.js";
const transcript = [
  { role: "assistant", text: "You have ten years of banking experience." },
  {
    role: "user",
    text: "I want an AI engineer role. I build tools with TypeScript and Python.",
  },
];
const fact = {
  field: "targetRole",
  value: "AI engineer",
  evidence: "I want an AI engineer role",
};
test("conversation onboarding needs no imported source", () =>
  assert.equal(profileSetupReady(defaultProfileSetup), true));
test("literal candidate evidence permits punctuation and case differences but never confirms", () => {
  const result = validateProfileProposal(
    { facts: [{ ...fact, evidence: "I WANT an AI engineer role!" }] },
    transcript,
  );
  assert.equal(result[0].approved, false);
  assert.equal(result[0].sourceText, transcript[1].text);
  assert.equal(result[0].originalValue, "AI engineer");
});
test("assistant claims and invented evidence cannot become proposals", () => {
  assert.throws(
    () =>
      validateProfileProposal(
        {
          facts: [
            {
              field: "experience",
              value: "Ten years banking",
              evidence: transcript[0].text,
            },
          ],
        },
        transcript,
      ),
    /does not match/,
  );
  assert.throws(
    () => validateProfileProposal({ facts: [fact] }, []),
    /No candidate transcript/,
  );
});
test("unknown, duplicate, empty, overlong and meaningless facts are rejected", () => {
  for (const facts of [
    [{ ...fact, field: "salary" }],
    [fact, fact],
    [{ ...fact, value: " " }],
    [{ ...fact, value: "x".repeat(1601) }],
    [{ ...fact, evidence: "I" }],
    [],
  ])
    assert.throws(() => validateProfileProposal({ facts }, transcript));
});
test("pending suggestions never qualify as confirmed profile", () => {
  assert.deepEqual(
    confirmedFactsFrom({
      facts: validateProfileProposal({ facts: [fact] }, transcript),
    }),
    [],
  );
  assert.equal(
    confirmedFactsFrom({
      facts: [{ ...fact, confirmedAt: "2026-09-11T00:00:00Z" }],
    }).length,
    1,
  );
});
