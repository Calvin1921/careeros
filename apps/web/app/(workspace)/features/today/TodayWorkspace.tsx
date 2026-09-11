"use client";
import { PageHeader } from "../../components/PageHeader";
import { isApplicationProfileReady } from "../../lib/profile-state";
import Link from "next/link";
import { useWorkspace } from "../../hooks/use-workspace";
import { useJobs } from "../../hooks/use-jobs";
import { useProfileWorkspace } from "../../profile/use-profile-workspace";
import { nextTodayAction } from "./today-journey";
import { DailyIntake } from "./DailyIntake";
import { TodayQueues } from "./TodayQueues";
export function TodayWorkspace() {
  const overview = useWorkspace(),
    jobs = useJobs(),
    profile = useProfileWorkspace();
  const error = overview.error ?? jobs.error ?? profile.error;
  const loaded = overview.data && jobs.data && profile.data;
  const action = loaded
    ? nextTodayAction(
        jobs.data!,
        overview.data!,
        isApplicationProfileReady(profile.data!),
      )
    : null;
  return (
    <main>
      <PageHeader
        title="Today"
        description="Your next action and the roles worth your time."
        action={
          <Link className="button secondary" href="/discover">
            Discover roles
          </Link>
        }
      />
      {error && (
        <p role="alert" className="error">
          {error.message}{" "}
          <button
            onClick={() => {
              void overview.refetch();
              void jobs.refetch();
              void profile.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {!loaded && !error && <p role="status">Finding your next action…</p>}
      {loaded && action && (
        <>
          <section className="priority-card" data-tone={action.tone}>
            <div>
              <p className="eyebrow">START HERE</p>
              <h2>{action.title}</h2>
              <p>{action.description}</p>
            </div>
            <Link className="button" href={action.href}>
              {action.label} →
            </Link>
          </section>
          <TodayQueues jobs={jobs.data!} overview={overview.data!} />
          <DailyIntake jobs={jobs.data!} today={overview.data!.today} />
        </>
      )}
    </main>
  );
}
