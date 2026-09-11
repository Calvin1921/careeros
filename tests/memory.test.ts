import test from "node:test";
import assert from "node:assert/strict";
import type { MemoryPort } from "../packages/domain/src";
import {
  MemoryNotFoundError,
  SqlMemoryPort,
  type Queryable,
  type QueryResult,
} from "../packages/data/src/memory";

type RecordedQuery = { text: string; values?: unknown[] };

function database(results: Array<QueryResult<any>> = []) {
  const queries: RecordedQuery[] = [];
  const db: Queryable = {
    async query<Row extends Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ) {
      queries.push({ text, values });
      return (results.shift() ?? { rows: [], rowCount: 1 }) as QueryResult<Row>;
    },
  };
  return { db, queries };
}

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  scope: "job:42",
  source_id: "conversation:7",
  content: "Ask about the reporting line.",
  verified: false,
  expires_at: null,
  created_at: new Date("2026-09-01T00:00:00Z"),
  updated_at: new Date("2026-09-01T00:00:00Z"),
  confirmed_at: null,
  correction_source_id: null,
};

test("SQL memory satisfies MemoryPort and proposals default to unverified", async () => {
  const { db, queries } = database();
  const memory = new SqlMemoryPort(db);
  const contract: MemoryPort = memory;
  const id = await contract.propose({
    scope: "job:42",
    sourceId: "conversation:7",
    content: "Ask about the reporting line.",
  });
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.match(
    queries[0].text,
    /verified,expires_at\)\s+VALUES\(\$1,\$2,\$3,\$4,false,\$5\)/,
  );
  assert.deepEqual(queries[0].values?.slice(1), [
    "job:42",
    "conversation:7",
    "Ask about the reporting line.",
    null,
  ]);
});

test("retrieval is scoped and excludes expired notes in SQL", async () => {
  const { db, queries } = database([{ rows: [row], rowCount: 1 }]);
  const notes = await new SqlMemoryPort(db).retrieve("job:42");
  assert.equal(notes[0].sourceId, "conversation:7");
  assert.equal(notes[0].verified, false);
  assert.match(queries[0].text, /scope=\$1/);
  assert.match(queries[0].text, /expires_at IS NULL OR expires_at > now\(\)/);
  assert.deepEqual(queries[0].values, ["job:42"]);
});

test("confirmation and correction require the matching scope", async () => {
  const confirmed = { ...row, verified: true, confirmed_at: new Date() };
  const corrected = {
    ...confirmed,
    verified: false,
    confirmed_at: null,
    content: "Ask the hiring manager about the reporting line.",
    correction_source_id: "user:manual-correction",
  };
  const { db, queries } = database([
    { rows: [confirmed], rowCount: 1 },
    { rows: [corrected], rowCount: 1 },
  ]);
  const memory = new SqlMemoryPort(db);
  await memory.confirm(row.id, "job:42");
  const result = await memory.correct(row.id, "job:42", {
    content: corrected.content,
    correctionSourceId: "user:manual-correction",
  });
  assert.equal(result.verified, false);
  assert.equal(result.correctionSourceId, "user:manual-correction");
  assert.match(queries[0].text, /id=\$1 AND scope=\$2/);
  assert.match(queries[1].text, /correction_source_id=\$4/);
  assert.match(queries[1].text, /verified=false,confirmed_at=NULL/);
  assert.deepEqual(queries[1].values, [
    row.id,
    "job:42",
    corrected.content,
    "user:manual-correction",
  ]);
});

test("delete is scope-bound and missing entries fail explicitly", async () => {
  const { db, queries } = database([{ rows: [], rowCount: 0 }]);
  await assert.rejects(
    new SqlMemoryPort(db).forget(row.id, "job:another"),
    MemoryNotFoundError,
  );
  assert.match(queries[0].text, /id=\$1 AND scope=\$2/);
  assert.deepEqual(queries[0].values, [row.id, "job:another"]);
});
