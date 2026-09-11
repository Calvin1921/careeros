"use client";
import { PageHeader } from "../../components/PageHeader";
import { ViewTabs, ViewPanel } from "../../components/ViewTabs";
import { JobJourney } from "./JobJourney";
import { jobGuide } from "../../lib/career-journey";
import Link from "next/link";
import { useJob, useJobActions } from "../../hooks/use-jobs";
import { useWorkspaceSection } from "../../hooks/use-workspace-section";
import { PipelineTools } from "../../components/PipelineTools";
import { JobMaterials } from "./JobMaterials";
import { JobStatus } from "./JobStatus";
import { PreparationWorkspace } from "../preparation/PreparationWorkspace";
const sections = [
  "materials",
  "practice",
  "tasks",
  "description",
  "history",
] as const;
const labels = {
  materials: "Preparation",
  practice: "Fit & practice",
  tasks: "Tasks",
  description: "Job description",
  history: "History",
};
export function JobWorkspace({ jobId }: { jobId: string }) {
  const { data: job, error, isPending, refetch } = useJob(jobId),
    { stage, prepare, refresh } = useJobActions(jobId);
  const target = job ? jobGuide(job.stage).section : "description";
  const { section, select } = useWorkspaceSection(
    sections,
    target === "status" ? "history" : target,
  );
  if (isPending)
    return (
      <main>
        <p role="status">Loading this opportunity…</p>
      </main>
    );
  if (error || !job)
    return (
      <main>
        <Link href="/jobs">← Applications</Link>
        <p role="alert" className="error">
          {error?.message || "Role not found"}
        </p>
        <button onClick={() => void refetch()}>Retry</button>
      </main>
    );
  return (
    <main>
      <Link className="back-link" href="/jobs">
        ← Applications
      </Link>
      <PageHeader
        title={job.title}
        description={undefined}
        action={
          <a
            className="button secondary"
            href={job.url}
            target="_blank"
            rel="noreferrer"
          >
            Original posting ↗
          </a>
        }
        context={
          <>
            <span>{job.company}</span>
            <span className="stage" data-stage={job.stage}>
              {job.stage}
            </span>
          </>
        }
      />
      <JobJourney
        stage={job.stage}
        section={section}
        onSection={select}
        change={stage}
      />
      <ViewTabs
        id="job"
        label="Application sections"
        items={sections.map((value) => ({ value, label: labels[value] }))}
        value={section}
        onChange={select}
      />
      <ViewPanel id="job" value="practice" selected={section}>
        <PreparationWorkspace jobId={job.id} description={job.description} />
      </ViewPanel>
      <div className="job-workspace" hidden={section === "practice"}>
        <div>
          <ViewPanel id="job" value="materials" selected={section}>
            <JobMaterials job={job} prepare={prepare} />
          </ViewPanel>
          <ViewPanel id="job" value="tasks" selected={section}>
            <section className="card" id="tasks">
              <PipelineTools
                jobId={job.id}
                view="tasks"
                onChanged={() => void refresh()}
              />
            </section>
          </ViewPanel>
          <ViewPanel id="job" value="history" selected={section}>
            <section className="card" id="history">
              <PipelineTools
                jobId={job.id}
                view="history"
                onChanged={() => void refresh()}
              />
            </section>
          </ViewPanel>
          <ViewPanel id="job" value="description" selected={section}>
            <section className="card" id="description">
              <h2>Job description</h2>
              <p className="description">{job.description}</p>
            </section>
          </ViewPanel>
        </div>
        <aside>
          <JobStatus job={job} stage={stage} />
        </aside>
      </div>
    </main>
  );
}
