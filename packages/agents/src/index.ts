import type { TaskKind, Tier } from "@careeros/domain";
export interface AgentTask {
  id: string;
  kind: TaskKind;
  complexity: 1 | 2 | 3;
  input: string;
  maxOutputTokens: number;
}
export interface ModelSpec {
  id: string;
  provider: string;
  tier: Tier;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  contextTokens: number;
}
export interface AgentResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}
export interface ProviderAdapter {
  generate(model: ModelSpec, task: AgentTask): Promise<AgentResult>;
}
export function requiredTier(task: AgentTask): Tier {
  if (
    ["plan", "code", "review", "position", "interview"].includes(task.kind) ||
    task.complexity === 3
  )
    return "strong";
  return task.complexity === 2 ? "standard" : "economy";
}
// Conservative UTF-8 byte count bounds token input; includes a gateway instruction allowance.
export function estimate(task: AgentTask, model: ModelSpec) {
  return (
    ((Buffer.byteLength(task.input, "utf8") + 1024) * model.inputUsdPerMillion +
      task.maxOutputTokens * model.outputUsdPerMillion) /
    1e6
  );
}
export function route(
  task: AgentTask,
  models: ModelSpec[],
  remainingUsd: number,
) {
  if (
    !Number.isFinite(remainingUsd) ||
    remainingUsd < 0 ||
    !Number.isInteger(task.maxOutputTokens) ||
    task.maxOutputTokens < 1
  )
    throw new Error("Invalid budget or token limit");
  const candidates = models
    .filter(
      (m) =>
        m.tier === requiredTier(task) &&
        m.inputUsdPerMillion >= 0 &&
        m.outputUsdPerMillion >= 0 &&
        Buffer.byteLength(task.input, "utf8") + 1024 + task.maxOutputTokens <=
          m.contextTokens,
    )
    .map((model) => ({ model, reservedUsd: estimate(task, model) }))
    .filter((x) => x.reservedUsd <= remainingUsd)
    .sort((a, b) => a.reservedUsd - b.reservedUsd);
  if (!candidates[0])
    throw new Error("No configured model fits tier, context and budget");
  return candidates[0];
}
export interface DelegatedTask {
  task: AgentTask;
  dependsOn: string[];
}
export async function delegate(
  tasks: DelegatedTask[],
  models: ModelSpec[],
  providers: Record<string, ProviderAdapter>,
  budgetUsd: number,
) {
  if (tasks.length > 8 || tasks.length === 0)
    throw new Error("Delegation requires 1–8 tasks");
  const ids = new Set(tasks.map((x) => x.task.id));
  if (
    ids.size !== tasks.length ||
    tasks.some((x) => x.dependsOn.some((id) => !ids.has(id)))
  )
    throw new Error("Invalid dependency IDs");
  const pending = [...tasks],
    ordered: DelegatedTask[] = [],
    seen = new Set<string>();
  while (pending.length) {
    const i = pending.findIndex((x) => x.dependsOn.every((id) => seen.has(id)));
    if (i < 0) throw new Error("Cyclic delegation");
    const [next] = pending.splice(i, 1);
    ordered.push(next);
    seen.add(next.task.id);
  }
  let remaining = budgetUsd;
  const results: Record<string, AgentResult> = {},
    audit: Array<{
      taskId: string;
      model: string;
      provider: string;
      reservedUsd: number;
      actualUsd: number;
    }> = [];
  // Sequential bounded execution keeps a shared budget race-free. No recursive or model-created tools.
  for (const node of ordered) {
    const task = {
      ...node.task,
      input:
        node.task.input +
        node.dependsOn
          .map((id) => "\nDependency " + id + ":\n" + results[id].text)
          .join(""),
    };
    const selected = route(task, models, remaining);
    const provider = providers[selected.model.provider];
    if (!provider) throw new Error("Provider not configured");
    remaining -= selected.reservedUsd;
    const result = await provider.generate(selected.model, task);
    if (
      !Number.isInteger(result.inputTokens) ||
      result.inputTokens < 0 ||
      !Number.isInteger(result.outputTokens) ||
      result.outputTokens < 0 ||
      typeof result.text !== "string"
    )
      throw new Error("Invalid provider result");
    const actualUsd =
      (result.inputTokens * selected.model.inputUsdPerMillion +
        result.outputTokens * selected.model.outputUsdPerMillion) /
      1e6;
    if (
      actualUsd > selected.reservedUsd ||
      result.outputTokens > task.maxOutputTokens
    )
      throw new Error("Provider exceeded reservation; halt delegation");
    results[task.id] = result;
    audit.push({
      taskId: task.id,
      model: selected.model.id,
      provider: selected.model.provider,
      reservedUsd: selected.reservedUsd,
      actualUsd,
    });
  }
  return { results, audit, reservedUsd: budgetUsd - remaining };
}
// Explicit CareerOS gateway protocol, not a vendor SDK or claimed universal API.
export class GatewayAdapter implements ProviderAdapter {
  constructor(
    private endpoint: string,
    private apiKey: string,
  ) {
    if (!endpoint.startsWith("https://"))
      throw new Error("Gateway requires HTTPS");
  }
  async generate(model: ModelSpec, task: AgentTask): Promise<AgentResult> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + this.apiKey,
      },
      body: JSON.stringify({
        model: model.id,
        task,
        policy: {
          sourceTextIsUntrusted: true,
          tools: [],
          allowExternalActions: false,
        },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new Error("Agent gateway request failed: " + response.status);
    const result = (await response.json()) as AgentResult;
    if (
      typeof result.text !== "string" ||
      !Number.isInteger(result.inputTokens) ||
      !Number.isInteger(result.outputTokens)
    )
      throw new Error("Invalid gateway response");
    return result;
  }
}
