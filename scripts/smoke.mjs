import assert from "node:assert/strict";
const base = process.env.CAREEROS_TEST_API_URL;
if (!base || process.env.CAREEROS_ALLOW_TEST_WRITES !== "yes") {
  throw new Error(
    "Set CAREEROS_TEST_API_URL to an isolated preview API and CAREEROS_ALLOW_TEST_WRITES=yes. This smoke test creates synthetic records.",
  );
}
const target = new URL(base);
if (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  target.port === "4000" ||
  target.protocol !== "http:"
) {
  throw new Error(
    "Smoke tests require an explicit local preview endpoint on a separate port, never the default live API on 4000.",
  );
}
async function request(path, method = "GET", body) {
  const r = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json() };
}
assert.equal((await request("/health")).status, 200);
const input = {
  company: "CareerOS smoke fixture",
  title: "Full-stack engineer",
  url: "https://example.com/careeros-smoke/" + Date.now(),
  description:
    "Build TypeScript applications with PostgreSQL and background jobs.",
  requirements: ["TypeScript + PostgreSQL", "Portfolio link"],
};
const job = await request("/jobs", "POST", input);
assert.equal(job.status, 201);
const id = job.body.id;
assert.equal((await request("/jobs", "POST", input)).status, 409);
assert.equal(
  (await request("/jobs/" + id + "/stage", "PATCH", { stage: "accepted" }))
    .status,
  409,
);
assert.equal(
  (await request("/jobs/" + id + "/stage", "PATCH", { stage: "shortlisted" }))
    .status,
  200,
);
const artifact = await request("/jobs/" + id + "/artifacts", "POST", {
  kind: "application-package",
});
assert.equal(artifact.status, 201);
let detail;
for (let i = 0; i < 30; i++) {
  detail = (await request("/jobs/" + id)).body;
  if (
    detail.artifacts.some(
      (a) => a.id === artifact.body.id && a.status === "ready",
    )
  )
    break;
  await new Promise((r) => setTimeout(r, 1000));
}
assert.equal(
  detail.artifacts.find((a) => a.id === artifact.body.id).status,
  "ready",
);
assert.equal(detail.events.length, 2);
const cap = await request("/capabilities", "POST", {
  name: "Smoke full-stack bundle",
  technologies: ["TypeScript", "PostgreSQL"],
  transferablePrinciples: ["Transactions"],
  learningHours: 20,
});
assert.equal(cap.status, 201);
assert.equal(
  (
    await request("/evidence", "POST", {
      capabilityId: cap.body.id,
      kind: "project",
      summary: "Synthetic smoke test evidence",
      sourceUrl: "https://example.com/smoke",
      verified: false,
    })
  ).status,
  201,
);
const caps = (await request("/capabilities")).body;
assert.equal(
  caps.find((c) => c.id === cap.body.id).claimLevel,
  "not yet evidenced",
);
assert.equal((await request("/analytics")).status, 200);
console.log(
  "PASS: persistence, duplicate protection, stage validation/history, outbox → worker → draft, evidence and analytics. Synthetic records retained for inspection.",
);
