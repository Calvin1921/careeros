import assert from "node:assert/strict";

const configuredBase = process.env.CAREEROS_TEST_API_URL;
if (!configuredBase || process.env.CAREEROS_ALLOW_TEST_WRITES !== "yes") {
  throw new Error(
    "Set CAREEROS_TEST_API_URL to the local preview API and CAREEROS_ALLOW_TEST_WRITES=yes. This smoke test creates synthetic records.",
  );
}

const target = new URL(configuredBase);
if (
  target.protocol !== "http:" ||
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  !["3017", "4017"].includes(target.port)
) {
  throw new Error(
    "Preparation smoke tests only allow the localhost preview API on port 4017 or its localhost proxy on port 3017.",
  );
}

const base = configuredBase.replace(/\/+$/, "");
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const fixtureUrl = `https://example.com/careeros-preparation-smoke/${suffix}`;

async function request(path, method = "GET", body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: response.status, body: parsed };
}

function expectStatus(result, status, label) {
  assert.equal(
    result.status,
    status,
    `${label}: ${JSON.stringify(result.body)}`,
  );
}

function expectOneOfStatuses(result, statuses, label) {
  assert.ok(
    statuses.includes(result.status),
    `${label}: expected ${statuses.join(" or ")}, got ${result.status}: ${JSON.stringify(result.body)}`,
  );
}

function preparationRequirement(preparation, key) {
  const requirement = preparation.requirements.find((item) => item.key === key);
  assert.ok(requirement, `Preparation requirement ${key} is present`);
  return requirement;
}

expectStatus(await request("/health"), 200, "health");

const jobResult = await request("/jobs", "POST", {
  company: `Preparation smoke ${suffix}`,
  title: "Synthetic platform engineer",
  url: fixtureUrl,
  description:
    "Synthetic role used only by the preparation vertical slice smoke check.",
  requirements: [
    `Synthetic requirement ${suffix} direct evidence`,
    `Synthetic requirement ${suffix} practice task`,
  ],
});
expectStatus(jobResult, 201, "import synthetic job");
assert.ok(jobResult.body?.id, "import returns a job id");
const jobId = jobResult.body.id;

const capabilityResult = await request("/capabilities", "POST", {
  name: `Preparation smoke capability ${suffix}`,
  technologies: ["TypeScript"],
  transferablePrinciples: ["Synthetic verification"],
  learningHours: 2,
});
expectStatus(capabilityResult, 201, "create capability");
const capabilityId = capabilityResult.body?.id;
assert.ok(capabilityId, "capability returns an id");

const evidenceResult = await request("/evidence", "POST", {
  capabilityId,
  kind: "project",
  summary: `Synthetic attested evidence ${suffix}`,
  sourceUrl: `https://example.com/careeros-preparation-evidence/${suffix}`,
  sourceLabel: "Preparation smoke fixture",
  verified: true,
});
expectStatus(evidenceResult, 201, "create attested evidence");
const evidenceId = evidenceResult.body?.id;
assert.ok(evidenceId, "evidence returns an id");
assert.equal(evidenceResult.body.verified, true, "evidence is verified");
const capabilityList = await request("/capabilities");
expectStatus(capabilityList, 200, "read capabilities after evidence");
const persistedEvidence = capabilityList.body
  .flatMap((capability) => capability.evidence ?? [])
  .find((evidence) => evidence.id === evidenceId);
assert.ok(persistedEvidence, "attested evidence is persisted");
assert.ok(
  persistedEvidence.attested_at ?? persistedEvidence.attestedAt,
  "evidence is attested",
);

let preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(preparation, 200, "get initial preparation");
assert.equal(preparation.body.jobId, jobId);
assert.equal(preparation.body.requirements.length, 2);
assert.deepEqual(preparation.body.summary, {
  total: 2,
  reviewed: 0,
  practiced: 0,
  ready: 0,
});

const firstKey = preparation.body.requirements[0].key;
const secondKey = preparation.body.requirements[1].key;
const firstReview = preparationRequirement(preparation.body, firstKey).review;
assert.equal(firstReview.version, 0);
const initialEvidenceOption =
  preparation.body.requirements[0].evidenceOptions.find(
    (option) => option.id === evidenceId,
  );
assert.ok(initialEvidenceOption, "attested evidence is selectable");
assert.match(initialEvidenceOption.signature, /^[0-9a-f]{64}$/);
const initialEvidenceSignature = initialEvidenceOption.signature;

const directReview = await request(
  `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(firstKey)}`,
  "PUT",
  {
    expectedVersion: firstReview.version,
    expectedEvidenceSignature: initialEvidenceSignature,
    status: "direct",
    evidenceId,
    notes: `Synthetic review note ${suffix}`,
    response: "",
    selfRating: null,
  },
);
expectStatus(directReview, 200, "save requirement review");
assert.equal(directReview.body.status, "direct");
assert.equal(directReview.body.evidenceId, evidenceId);

preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(preparation, 200, "reload preparation after review");
const reviewedRequirement = preparationRequirement(preparation.body, firstKey);
assert.equal(reviewedRequirement.review.status, "direct");
assert.equal(reviewedRequirement.review.evidenceId, evidenceId);
assert.equal(reviewedRequirement.review.version, 1);
assert.equal(preparation.body.summary.reviewed, 1);

const responseReview = await request(
  `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(firstKey)}`,
  "PUT",
  {
    expectedVersion: reviewedRequirement.review.version,
    expectedEvidenceSignature: initialEvidenceSignature,
    status: "direct",
    evidenceId,
    notes:
      reviewedRequirement.review.notes ?? `Synthetic review note ${suffix}`,
    response: `Synthetic response ${suffix}`,
    selfRating: "ready",
  },
);
expectStatus(responseReview, 200, "save response and self rating");
assert.equal(responseReview.body.response, `Synthetic response ${suffix}`);
assert.equal(responseReview.body.selfRating, "ready");

const invalidCapture = await request(
  `/jobs/${jobId}/preparation/requirements`,
  "POST",
  { text: `Not present in synthetic description ${suffix}` },
);
expectStatus(
  invalidCapture,
  400,
  "reject non-source-backed requirement capture",
);

const capturedText = "preparation vertical slice";
const duplicateCaptures = await Promise.all([
  request(`/jobs/${jobId}/preparation/requirements`, "POST", {
    text: capturedText,
  }),
  request(`/jobs/${jobId}/preparation/requirements`, "POST", {
    text: capturedText,
  }),
]);
for (const [index, result] of duplicateCaptures.entries())
  expectStatus(result, 201, `concurrent duplicate capture ${index + 1}`);
assert.ok(
  duplicateCaptures.some((result) => result.body.reused === false),
  "concurrent capture appends a new requirement",
);
assert.equal(
  new Set(duplicateCaptures.map((result) => result.body.key)).size,
  1,
  "concurrent duplicate capture reuses one requirement key",
);
assert.ok(
  duplicateCaptures.some((result) => result.body.reused === true),
  "duplicate capture reports reuse",
);
const capturedRequirement = duplicateCaptures.find(
  (result) => result.body.reused === false,
);
assert.equal(capturedRequirement.body.text, capturedText);
assert.ok(capturedRequirement.body.key);
const capturedKey = capturedRequirement.body.key;

preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(preparation, 200, "reload preparation after requirement capture");
assert.equal(preparation.body.summary.total, 3);
assert.equal(preparation.body.summary.reviewed, 1);
assert.equal(
  preparationRequirement(preparation.body, firstKey).review.status,
  "direct",
  "capturing a requirement retains existing reviews",
);
assert.equal(
  preparationRequirement(preparation.body, capturedKey).text,
  capturedText,
);

const emptyRequirementsJob = await request("/jobs", "POST", {
  company: `Preparation discovery smoke ${suffix}`,
  title: "Synthetic discovery-like role",
  url: `https://example.com/careeros-preparation-empty/${suffix}`,
  description:
    "Synthetic discovery-like description contains a capture excerpt.",
  requirements: [],
});
expectStatus(
  emptyRequirementsJob,
  201,
  "import discovery-like job without requirements",
);
const emptyRequirementsJobId = emptyRequirementsJob.body?.id;
assert.ok(emptyRequirementsJobId, "empty-requirements job returns an id");
const emptyPreparation = await request(
  `/jobs/${emptyRequirementsJobId}/preparation`,
);
expectStatus(
  emptyPreparation,
  200,
  "get preparation for empty-requirements job",
);
assert.equal(emptyPreparation.body.summary.total, 0);
const capturedEmptyRequirement = await request(
  `/jobs/${emptyRequirementsJobId}/preparation/requirements`,
  "POST",
  { text: "capture excerpt" },
);
expectStatus(
  capturedEmptyRequirement,
  201,
  "capture requirement for empty job",
);
assert.equal(capturedEmptyRequirement.body.text, "capture excerpt");
assert.equal(capturedEmptyRequirement.body.reused, false);
const capturedEmptyPreparation = await request(
  `/jobs/${emptyRequirementsJobId}/preparation`,
);
expectStatus(
  capturedEmptyPreparation,
  200,
  "reload captured empty-requirements job",
);
assert.equal(capturedEmptyPreparation.body.summary.total, 1);
assert.equal(
  capturedEmptyPreparation.body.requirements[0].text,
  "capture excerpt",
);

const staleReview = await request(
  `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(firstKey)}`,
  "PUT",
  {
    expectedVersion: firstReview.version,
    expectedEvidenceSignature: initialEvidenceSignature,
    status: "direct",
    evidenceId,
    notes: "Stale synthetic write",
    response: "",
    selfRating: null,
  },
);
expectStatus(staleReview, 409, "reject stale review version");

const unconfirmedEvidence = await request("/evidence", "POST", {
  capabilityId,
  kind: "project",
  summary: `Synthetic unconfirmed evidence ${suffix}`,
  sourceUrl: `https://example.com/careeros-preparation-unconfirmed/${suffix}`,
  sourceLabel: "Preparation smoke fixture",
  verified: false,
});
expectStatus(unconfirmedEvidence, 201, "create unconfirmed evidence");
const unconfirmedEvidenceId = unconfirmedEvidence.body?.id;
assert.ok(unconfirmedEvidenceId);

const unconfirmedReview = await request(
  `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(secondKey)}`,
  "PUT",
  {
    expectedVersion: 0,
    expectedEvidenceSignature: "0".repeat(64),
    status: "direct",
    evidenceId: unconfirmedEvidenceId,
    notes: "Unconfirmed synthetic evidence",
    response: "",
    selfRating: null,
  },
);
expectStatus(unconfirmedReview, 409, "reject unconfirmed evidence");

const unknownKey = `requirement-99-${"0".repeat(16)}`;
const unknownRequirement = await request(
  `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(unknownKey)}`,
  "PUT",
  {
    expectedVersion: 0,
    expectedEvidenceSignature: null,
    status: "gap",
    evidenceId: null,
    notes: "Unknown synthetic requirement",
    response: "",
    selfRating: null,
  },
);
expectStatus(unknownRequirement, 404, "reject unknown requirement key");

preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(
  preparation,
  200,
  "snapshot evidence before edit and re-attestation",
);
const reviewBeforeEvidenceChange = preparationRequirement(
  preparation.body,
  firstKey,
).review;
assert.equal(reviewBeforeEvidenceChange.status, "direct");
const evidenceVersionBeforeChange = reviewBeforeEvidenceChange.version;

const changedEvidence = await request(`/evidence/${evidenceId}`, "PATCH", {
  summary: `Changed synthetic evidence ${suffix}`,
});
expectStatus(changedEvidence, 200, "change attested evidence");
assert.equal(changedEvidence.body.verified, false);
const reattestedEvidence = await request(`/evidence/${evidenceId}`, "PATCH", {
  attested: true,
});
expectStatus(reattestedEvidence, 200, "re-attest changed evidence");
assert.equal(reattestedEvidence.body.verified, true);

preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(preparation, 200, "read invalidated review after re-attestation");
const invalidatedAfterReattestation = preparationRequirement(
  preparation.body,
  firstKey,
).review;
const currentEvidenceOption = preparation.body.requirements
  .find((item) => item.key === firstKey)
  .evidenceOptions.find((option) => option.id === evidenceId);
assert.ok(currentEvidenceOption, "re-attested evidence is selectable");
assert.match(currentEvidenceOption.signature, /^[0-9a-f]{64}$/);
assert.notEqual(currentEvidenceOption.signature, initialEvidenceSignature);
assert.equal(invalidatedAfterReattestation.status, "unknown");
assert.equal(
  invalidatedAfterReattestation.version,
  evidenceVersionBeforeChange,
);
assert.ok(invalidatedAfterReattestation.invalidatedReason);

const staleEvidenceReview = await request(
  `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(firstKey)}`,
  "PUT",
  {
    expectedVersion: evidenceVersionBeforeChange,
    expectedEvidenceSignature: initialEvidenceSignature,
    status: "direct",
    evidenceId,
    notes: invalidatedAfterReattestation.notes,
    response: invalidatedAfterReattestation.response,
    selfRating: invalidatedAfterReattestation.selfRating,
  },
);
expectStatus(staleEvidenceReview, 409, "reject stale evidence signature");

preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(
  preparation,
  200,
  "retain invalidated review after stale signature",
);
const stillInvalidated = preparationRequirement(
  preparation.body,
  firstKey,
).review;
assert.equal(stillInvalidated.status, "unknown");
assert.equal(stillInvalidated.version, evidenceVersionBeforeChange);
assert.ok(stillInvalidated.invalidatedReason);

const refreshedEvidenceReview = await request(
  `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(firstKey)}`,
  "PUT",
  {
    expectedVersion: evidenceVersionBeforeChange,
    expectedEvidenceSignature: currentEvidenceOption.signature,
    status: "direct",
    evidenceId,
    notes: stillInvalidated.notes,
    response: stillInvalidated.response,
    selfRating: stillInvalidated.selfRating,
  },
);
expectStatus(
  refreshedEvidenceReview,
  200,
  "save with current evidence signature",
);
assert.equal(refreshedEvidenceReview.body.status, "direct");
assert.equal(refreshedEvidenceReview.body.evidenceId, evidenceId);

preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(preparation, 200, "read re-confirmed evidence review");
const revalidatedReview = preparationRequirement(
  preparation.body,
  firstKey,
).review;
assert.equal(revalidatedReview.status, "direct");
assert.equal(revalidatedReview.evidenceId, evidenceId);
assert.equal(revalidatedReview.invalidatedReason, null);

const malformedDate = await request(
  `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(firstKey)}/tasks`,
  "POST",
  { dueDate: "2026-02-31" },
);
expectStatus(malformedDate, 400, "reject malformed task date");

const taskBody = { dueDate: "2099-01-02" };
const taskResults = await Promise.all([
  request(
    `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(secondKey)}/tasks`,
    "POST",
    taskBody,
  ),
  request(
    `/jobs/${jobId}/preparation/requirements/${encodeURIComponent(secondKey)}/tasks`,
    "POST",
    taskBody,
  ),
]);
for (const [index, result] of taskResults.entries())
  expectOneOfStatuses(
    result,
    [200, 201],
    `concurrent task creation ${index + 1}`,
  );
assert.equal(
  new Set(
    taskResults.map((result) => result.body?.decision?.id ?? result.body?.id),
  ).size,
  1,
  "repeated concurrent task creation returns one task",
);
assert.ok(
  taskResults.some((result) => result.body?.reused === true),
  "repeated task creation reports reuse",
);

preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(preparation, 200, "reload preparation after task creation");
const taskedRequirement = preparationRequirement(preparation.body, secondKey);
assert.equal(taskedRequirement.tasks.length, 1);
assert.equal(taskedRequirement.tasks[0].dueDate, taskBody.dueDate);
assert.equal(preparation.body.summary.reviewed, 1);
const taskId = taskedRequirement.tasks[0].id;

let pipeline = await request(`/jobs/${jobId}/pipeline`);
expectStatus(pipeline, 200, "read pipeline decision from preparation task");
let pipelineDecision = pipeline.body.decisions.find(
  (decision) => decision.id === taskId,
);
assert.ok(
  pipelineDecision,
  "preparation task is linked to a pipeline decision",
);
assert.equal(pipelineDecision.due_date, taskBody.dueDate);
assert.equal(pipelineDecision.completed_at, null);

const completedDecision = await request(
  `/jobs/${jobId}/decisions/${taskId}`,
  "PATCH",
  { expectedVersion: pipelineDecision.version, completed: true },
);
expectStatus(completedDecision, 200, "complete shared pipeline decision");
assert.equal(completedDecision.body.due_date, taskBody.dueDate);
assert.ok(completedDecision.body.completed_at);
assert.equal(completedDecision.body.version, pipelineDecision.version + 1);

pipeline = await request(`/jobs/${jobId}/pipeline`);
expectStatus(pipeline, 200, "reload pipeline after decision completion");
pipelineDecision = pipeline.body.decisions.find(
  (decision) => decision.id === taskId,
);
assert.equal(pipelineDecision.due_date, taskBody.dueDate);
assert.ok(pipelineDecision.completed_at);
assert.equal(pipelineDecision.version, completedDecision.body.version);

preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(preparation, 200, "reload preparation after decision completion");
const completedTask = preparationRequirement(
  preparation.body,
  secondKey,
).tasks.find((task) => task.id === taskId);
assert.ok(completedTask, "preparation retains the completed shared task");
assert.equal(completedTask.dueDate, taskBody.dueDate);
assert.ok(completedTask.completedAt);
assert.equal(completedTask.version, completedDecision.body.version);

const invalidatedEvidence = await request(`/evidence/${evidenceId}`, "PATCH", {
  summary: `Edited synthetic evidence ${suffix}`,
});
expectStatus(invalidatedEvidence, 200, "edit attested evidence");
assert.equal(invalidatedEvidence.body.verified, false);

preparation = await request(`/jobs/${jobId}/preparation`);
expectStatus(preparation, 200, "read preparation after evidence invalidation");
const invalidatedRequirement = preparationRequirement(
  preparation.body,
  firstKey,
);
assert.ok(
  invalidatedRequirement.review.invalidatedReason,
  "preparation read exposes invalidated evidence",
);
assert.equal(invalidatedRequirement.review.status, "unknown");
assert.equal(invalidatedRequirement.review.evidenceId, null);

console.log(
  `PASS: preparation import, source-backed requirement capture, attested evidence, versioned reviews, validation conflicts, idempotent tasks, persistence and evidence invalidation. Synthetic records retained for inspection. jobId=${jobId} fixtureUrl=${fixtureUrl}`,
);
