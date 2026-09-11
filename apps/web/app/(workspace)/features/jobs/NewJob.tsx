"use client";
import { PageHeader } from "../../components/PageHeader";
import { useState } from "react";
import { ViewTabs, ViewPanel } from "../../components/ViewTabs";
import Link from "next/link";
import { JobImport } from "../../components/PipelineTools";
import { useCreateJob } from "../../hooks/use-create-job";
export function NewJob() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const { save, refresh } = useCreateJob();
  return (
    <main className="narrow">
      <Link className="back-link" href="/jobs">
        ← Applications
      </Link>
      <PageHeader
        title="Add jobs"
        description="Save one role or import a group from your latest scan."
      />
      <ViewTabs
        id="import"
        label="Import method"
        items={[
          { value: "single", label: "One job" },
          { value: "batch", label: "Several jobs" },
        ]}
        value={mode}
        onChange={setMode}
      />
      <ViewPanel id="import" value="single" selected={mode}>
        <section className="card">
          {save.error && (
            <p className="error" role="alert">
              {save.error.message}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              save.mutate({
                company: d.get("company"),
                title: d.get("title"),
                url: d.get("url"),
                description: d.get("description"),
                requirements: String(d.get("requirements"))
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean),
              });
            }}
          >
            <div className="form-grid">
              <label>
                Company
                <input name="company" required maxLength={200} />
              </label>
              <label>
                Role title
                <input name="title" required maxLength={200} />
              </label>
            </div>
            <label>
              Application link
              <input name="url" type="url" required placeholder="https://…" />
            </label>
            <label>
              Job description
              <textarea
                name="description"
                required
                minLength={20}
                maxLength={50000}
                rows={7}
              />
            </label>
            <details className="section-disclosure">
              <summary>
                Add specific requirements{" "}
                <span className="muted">· optional</span>
              </summary>
              <label>
                Requirements
                <small>
                  One per line, including portfolio or video requests
                </small>
                <textarea name="requirements" rows={4} />
              </label>
            </details>
            <div className="actions" style={{ marginTop: 28 }}>
              <button disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save job"}
              </button>
              <Link className="button secondary" href="/jobs">
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </ViewPanel>
      <ViewPanel id="import" value="batch" selected={mode}>
        <JobImport onImported={refresh} />
      </ViewPanel>
    </main>
  );
}
