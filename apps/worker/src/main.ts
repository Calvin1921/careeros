import { Queue, Worker } from "bullmq";
import { pool, transaction } from "@careeros/data";
const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6389),
};
const queue = new Queue("preparation", { connection });
const worker = new Worker(
  "preparation",
  async (job) => {
    const artifact = (
      await pool.query(
        "SELECT a.*,j.company,j.title,j.url,j.description,j.requirements FROM artifacts a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1",
        [job.data.artifactId],
      )
    ).rows[0];
    if (!artifact || artifact.status === "ready") return;
    const evidence = (
      await pool.query(
        "SELECT summary,source_url,kind FROM evidence WHERE verified=true AND attested_at IS NOT NULL ORDER BY created_at",
      )
    ).rows;
    const shared = {
      label: "Template draft — review before use",
      role: artifact.title,
      company: artifact.company,
      sourceUrl: artifact.url,
      requirements: artifact.requirements,
      evidence,
      decisions: [
        "Confirm fit and location/work eligibility",
        "Select only relevant verified evidence",
        "Review all text before using externally",
      ],
    };
    const content =
      artifact.kind === "application-package"
        ? {
            ...shared,
            checklist: [
              "Tailor CV using verified evidence",
              "Confirm cover letter requirement",
              "Check portfolio, video and external application fields",
            ],
            cvOutline: [
              "Professional summary — add your confirmed experience",
              "Relevant experience — choose evidence below",
              "Capability bundle and project links",
            ],
            note: "CV upload, tailored prose and export are next-phase work. This outline is not a completed CV.",
          }
        : {
            ...shared,
            questions: [
              "Why this role and company?",
              "Which verified project best demonstrates the requirements?",
              "What trade-offs did you make and what was the outcome?",
            ],
            studyPlan: artifact.requirements.map((requirement: string) => ({
              topic: requirement,
              action: "Prepare one practical example and explain limitations",
            })),
            note: "Template questions; company-specific research and AI coaching are not enabled.",
          };
    await pool.query(
      "UPDATE artifacts SET status='ready',content=$1,error=NULL WHERE id=$2",
      [JSON.stringify(content), artifact.id],
    );
  },
  { connection, concurrency: 2 },
);
worker.on("failed", (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1))
    void pool
      .query(
        "UPDATE artifacts SET status='failed',error=$1 WHERE id=$2 AND status<>'ready'",
        ["Preparation failed. Request a new draft.", job.data.artifactId],
      )
      .catch(console.error);
  console.error("Preparation failed", error.message);
});
worker.on("error", (error) => console.error("Worker error", error.message));
let stopping = false;
async function dispatch() {
  while (!stopping) {
    try {
      await transaction(async (db) => {
        const rows = (
          await db.query(
            "SELECT id FROM outbox WHERE dispatched_at IS NULL ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED",
          )
        ).rows;
        for (const row of rows) {
          await queue.add(
            "prepare",
            { artifactId: row.id },
            {
              jobId: row.id,
              attempts: 3,
              backoff: { type: "exponential", delay: 1000 },
            },
          );
          await db.query("UPDATE outbox SET dispatched_at=now() WHERE id=$1", [
            row.id,
          ]);
        }
      });
    } catch (error) {
      console.error("Outbox dispatch failed", (error as Error).message);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
const dispatching = dispatch();
async function shutdown() {
  stopping = true;
  await dispatching;
  await worker.close();
  await queue.close();
  await pool.end();
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
