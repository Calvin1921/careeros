import Link from "next/link";
import type { JobRecord } from "@careeros/domain";
import { dailyIntake } from "../../lib/career-journey";
export function DailyIntake({
  jobs,
  today,
}: {
  jobs: JobRecord[];
  today: string;
}) {
  const groups = dailyIntake(jobs, today);
  return (
    <section className="card">
      <div className="section-title">
        <h2>Jobs added today</h2>
        <Link className="text-link" href="/scans">
          Import history →
        </Link>
      </div>
      <div className="daily-grid">
        {groups.map((group) => (
          <div className="daily-slot" key={group.label}>
            <h3>{group.label}</h3>
            <strong>{group.jobs.length}</strong>
            <small>
              {group.jobs.length === 1 ? "job saved" : "jobs saved"} ·{" "}
              {group.range}
            </small>
          </div>
        ))}
      </div>
      <p className="intake-note">
        Based on the local time jobs were saved in CareerOS. Scheduled company
        scans are managed in Discover roles.
      </p>
      <Link className="text-link" href="/discover">
        Scan company pages →
      </Link>
    </section>
  );
}
