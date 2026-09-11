import test from "node:test";
import assert from "node:assert/strict";
import {
  route,
  delegate,
  type AgentTask,
  type ModelSpec,
} from "../packages/agents/src";
const models: ModelSpec[] = [
  {
    id: "fast",
    provider: "test",
    tier: "economy",
    inputUsdPerMillion: 1,
    outputUsdPerMillion: 2,
    contextTokens: 10000,
  },
  {
    id: "reasoning",
    provider: "test",
    tier: "strong",
    inputUsdPerMillion: 5,
    outputUsdPerMillion: 10,
    contextTokens: 10000,
  },
];
const task: AgentTask = {
  id: "extract",
  kind: "extract",
  complexity: 1,
  input: "A supplied job description",
  maxOutputTokens: 100,
};
test("cheap extraction; strong planning; no silent downgrade", () => {
  assert.equal(route(task, models, 1).model.id, "fast");
  assert.equal(
    route({ ...task, kind: "plan" }, models, 1).model.id,
    "reasoning",
  );
  assert.throws(() => route({ ...task, kind: "review" }, [models[0]], 1));
  assert.throws(() => route(task, models, 0));
});
test("reject cycles before calling provider", async () => {
  await assert.rejects(
    delegate([{ task, dependsOn: ["extract"] }], models, {}, 1),
    /Cyclic/,
  );
});
test("dependent subagents receive output and consume shared reservation", async () => {
  const inputs: string[] = [];
  const result = await delegate(
    [
      { task, dependsOn: [] },
      { task: { ...task, id: "plan", kind: "plan" }, dependsOn: ["extract"] },
    ],
    models,
    {
      test: {
        generate: async (_, t) => {
          inputs.push(t.input);
          return {
            text: "verified fixture",
            inputTokens: 30,
            outputTokens: 20,
          };
        },
      },
    },
    1,
  );
  assert.equal(result.audit.length, 2);
  assert.match(inputs[1], /verified fixture/);
  assert.ok(result.reservedUsd > 0);
});
test("provider budget violation halts further work", async () => {
  let calls = 0;
  await assert.rejects(
    delegate(
      [
        { task, dependsOn: [] },
        { task: { ...task, id: "second" }, dependsOn: ["extract"] },
      ],
      models,
      {
        test: {
          generate: async () => {
            calls++;
            return { text: "x", inputTokens: 999999, outputTokens: 1 };
          },
        },
      },
      1,
    ),
    /exceeded/,
  );
  assert.equal(calls, 1);
});
