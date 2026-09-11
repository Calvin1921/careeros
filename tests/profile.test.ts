import test from "node:test";
import assert from "node:assert/strict";
import {
  assertSelectedEvidenceIsAttested,
  confirmedExperiencesForSnapshot,
  evidenceVerificationAfterPatch,
  parseCapabilityPatch,
  proposeExperiences,
} from "../apps/api/src/profile.service";

const importId = "00000000-0000-4000-8000-000000000001";

test("plain text import keeps exact source lines and invents no structured career facts", () => {
  const proposals = proposeExperiences(
    importId,
    "text",
    "Senior designer\n2019–2022\nShipped an accessible checkout",
  );
  assert.deepEqual(
    proposals.map((item) => item.summary),
    ["Senior designer", "2019–2022", "Shipped an accessible checkout"],
  );
  assert.ok(
    proposals.every(
      (item) =>
        item.employer === "" &&
        item.roleTitle === "" &&
        item.startDate === "" &&
        item.endDate === "",
    ),
  );
  assert.deepEqual(proposals[2].sourceRefs, [
    { importId, line: 3, quote: "Shipped an accessible checkout" },
  ]);
  assert.ok(proposals.every((item) => item.unresolvedQuestions.length === 1));
});

test("JSON import maps only supplied values and retains a source path", () => {
  const source = JSON.stringify({
    experiences: [
      {
        company: "Synthetic Studio",
        title: "Designer",
        summary: "Built a synthetic fixture",
      },
    ],
  });
  const [proposal] = proposeExperiences(importId, "json", source);
  assert.equal(proposal.employer, "Synthetic Studio");
  assert.equal(proposal.roleTitle, "Designer");
  assert.equal(proposal.startDate, "");
  assert.equal(
    "path" in proposal.sourceRefs[0] && proposal.sourceRefs[0].path,
    "$.experiences[0]",
  );
});

test("confirmed snapshots exclude every proposed or incompletely confirmed claim", () => {
  const rows = [
    { id: "draft", status: "proposed", confirmed_at: null },
    { id: "broken", status: "confirmed", confirmed_at: null },
    {
      id: "confirmed",
      status: "confirmed",
      confirmed_at: "2026-09-06T00:00:00Z",
    },
  ];
  assert.deepEqual(
    confirmedExperiencesForSnapshot(rows).map((item) => item.id),
    ["confirmed"],
  );
});

test("version evidence selection rejects missing, unconfirmed, and stale attestations", () => {
  const rows = [
    { id: "ready", verified: true, attested_at: "2026-09-06T00:00:00Z" },
    { id: "draft", verified: false, attested_at: null },
    { id: "stale", verified: true, attested_at: null },
  ];
  assert.deepEqual(
    assertSelectedEvidenceIsAttested(rows, ["ready"]).map((item) => item.id),
    ["ready"],
  );
  assert.throws(
    () => assertSelectedEvidenceIsAttested(rows, ["draft"]),
    /explicitly attested/,
  );
  assert.throws(
    () => assertSelectedEvidenceIsAttested(rows, ["stale"]),
    /explicitly attested/,
  );
  assert.throws(
    () => assertSelectedEvidenceIsAttested(rows, ["missing"]),
    /explicitly attested/,
  );
});

test("editing evidence invalidates verification unless the user re-attests", () => {
  const current = { verified: true, attested_at: "2026-09-06T00:00:00Z" };
  assert.deepEqual(
    evidenceVerificationAfterPatch(current, { summary: "Changed claim" }),
    { verified: false, attested: false },
  );
  assert.deepEqual(
    evidenceVerificationAfterPatch(current, {
      summary: "Changed claim",
      attested: true,
    }),
    { verified: true, attested: true },
  );
  assert.deepEqual(
    evidenceVerificationAfterPatch(current, { attested: false }),
    { verified: false, attested: false },
  );
});

test("capability edits keep dimensions bounded and reject empty technology bundles", () => {
  assert.deepEqual(
    parseCapabilityPatch({
      technologies: ["TypeScript", "PostgreSQL"],
      learningHours: 12,
    }),
    {
      name: undefined,
      technologies: ["TypeScript", "PostgreSQL"],
      transferablePrinciples: undefined,
      learningHours: 12,
    },
  );
  assert.throws(
    () => parseCapabilityPatch({ technologies: [] }),
    /at least one technology/,
  );
  assert.throws(
    () => parseCapabilityPatch({ learningHours: 12.5 }),
    /whole number/,
  );
});
