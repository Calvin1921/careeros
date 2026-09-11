import { convert } from "html-to-text";
import { pool } from "@careeros/data";
import type { SourceJob } from "./discovery.rules";
export async function boundedJson(response: Response) {
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty source response.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 20_000_000)
        throw new Error("Source exceeds the 20 MB scan limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function sourceJobs(payload: unknown, company: string): SourceJob[] {
  const jobs = (payload as { jobs?: unknown })?.jobs;
  if (!Array.isArray(jobs) || jobs.length > 5000)
    throw new Error("Source did not return a complete supported job list.");
  return jobs
    .filter((j) => j.internal_job_id !== null)
    .map((j) => {
      if (
        !j.id ||
        typeof j.title !== "string" ||
        typeof j.content !== "string" ||
        typeof j.absolute_url !== "string"
      )
        throw new Error(
          "Source includes an incomplete posting; no complete list can be claimed.",
        );
      const url = new URL(j.absolute_url);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error("Invalid application link.");
      const text = convert(j.content, {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { ignoreHref: true } },
          { selector: "img", format: "skip" },
        ],
      }).slice(0, 49000);
      return {
        id: String(j.id),
        title: j.title.slice(0, 200),
        company: company.slice(0, 200),
        url: url.toString(),
        description: text,
        location: String(j.location?.name ?? ""),
        salary: "",
        updatedAt: typeof j.updated_at === "string" ? j.updated_at : null,
      };
    });
}
export async function fetchBoard(token: string) {
  if (!/^[a-z0-9_-]{1,80}$/.test(token)) throw new Error("Invalid board name.");
  const cached = (
    await pool.query("SELECT * FROM discovery_source_cache WHERE token=$1", [
      token,
    ])
  ).rows[0];
  if (cached && Date.now() - new Date(cached.fetched_at).valueOf() < 3600000)
    return {
      jobs: cached.jobs as SourceJob[],
      company: cached.company,
      fetchedAt: cached.fetched_at,
      cached: true,
    };
  const base = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}`;
  const options = {
    signal: AbortSignal.timeout(25000),
    redirect: "error" as const,
    headers: { "User-Agent": "CareerOS-local-discovery/1.0" },
  };
  const board = await boundedJson(await fetch(base, options));
  if (typeof board.name !== "string")
    throw new Error("Company name missing from source.");
  const response = await boundedJson(
    await fetch(base + "/jobs?content=true", {
      ...options,
      signal: AbortSignal.timeout(25000),
    }),
  );
  const jobs = sourceJobs(response, board.name),
    fetchedAt = new Date().toISOString();
  await pool.query(
    "INSERT INTO discovery_source_cache(token,jobs,company,fetched_at) VALUES($1,$2,$3,$4) ON CONFLICT(token) DO UPDATE SET jobs=EXCLUDED.jobs,company=EXCLUDED.company,fetched_at=EXCLUDED.fetched_at",
    [token, JSON.stringify(jobs), board.name, fetchedAt],
  );
  return { jobs, company: board.name, fetchedAt, cached: false };
}
