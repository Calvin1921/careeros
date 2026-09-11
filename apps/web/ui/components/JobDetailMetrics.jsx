import { opportunityPriority } from "../lib/opportunity-priority";

function formatHkt(value) {
  if (!value) return "Not recorded";
  return `${new Intl.DateTimeFormat("en-HK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(new Date(value))} HKT`;
}

export function JobDetailMetrics({ job }) {
  const items = [
    ["Priority", job.fit ? `${opportunityPriority(job)}/100` : "Unscored"],
    ["Fit", job.fit ? `${job.fit}/100` : "Needs review"],
    ["Freshness", job.freshness || "Not verified"],
    ["Salary", job.salary || "Not listed"],
    ["Delivered", formatHkt(job.snapshotAt || job.checked)],
    ["Source", job.source || "Not recorded"],
  ];
  return (
    <dl className="job-detail-metrics">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
