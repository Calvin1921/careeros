import { stages, type Stage } from "@careeros/domain";

export type CurrentStageRow = { stage: Stage; count: number | string };
export type StageEventRow = {
  application_id: string;
  from_stage: Stage | null;
  to_stage: Stage;
  created_at: Date | string;
  event_kind?: "transition" | "correction";
};

export interface AnalyticsOptions {
  timezone: string;
  from?: string;
  to?: string;
  asOf: Date;
}

const funnelStages: Stage[] = [
  "discovered",
  "shortlisted",
  "applied",
  "screening",
  "interview",
  "offer",
  "accepted",
];
const terminalStages = new Set<Stage>(["accepted", "rejected", "withdrawn"]);

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function localDate(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: "year" | "month" | "day") =>
    parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function percent(numerator: number, denominator: number): number | null {
  return denominator === 0
    ? null
    : Math.round((numerator / denominator) * 1000) / 10;
}

function days(milliseconds: number): number {
  return Math.round((milliseconds / 86_400_000) * 10) / 10;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildOperationalAnalytics(
  currentRows: CurrentStageRow[],
  eventRows: StageEventRow[],
  options: AnalyticsOptions,
) {
  const current = new Map<Stage, number>(
    currentRows.map((row) => [row.stage, Number(row.count)]),
  );
  const eventsByApplication = new Map<string, StageEventRow[]>();
  for (const event of eventRows) {
    const events = eventsByApplication.get(event.application_id) ?? [];
    events.push(event);
    eventsByApplication.set(event.application_id, events);
  }

  for (const events of eventsByApplication.values())
    events.sort(
      (left, right) =>
        new Date(left.created_at).getTime() -
        new Date(right.created_at).getTime(),
    );

  let excludedCorrectedApplications = 0;
  const cohort = [...eventsByApplication.entries()].filter(([, events]) => {
    const first = events[0];
    if (!first) return false;
    const date = localDate(new Date(first.created_at), options.timezone);
    if (
      (options.from && date < options.from) ||
      (options.to && date > options.to)
    )
      return false;
    if (events.some((event) => event.event_kind === "correction")) {
      excludedCorrectedApplications++;
      return false;
    }
    return true;
  });

  const highestMilestone = new Map<string, number>();
  for (const [applicationId, events] of cohort) {
    let highest = -1;
    for (const event of events) {
      for (const stage of [event.from_stage, event.to_stage]) {
        if (!stage) continue;
        highest = Math.max(highest, funnelStages.indexOf(stage));
      }
    }
    highestMilestone.set(applicationId, highest);
  }

  const reachedByStage = funnelStages.map(
    (_, index) =>
      [...highestMilestone.values()].filter((highest) => highest >= index)
        .length,
  );

  const durations = new Map<Stage, number[]>();
  for (const [, events] of cohort) {
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      if (terminalStages.has(event.to_stage)) continue;
      const started = new Date(event.created_at).getTime();
      const ended = events[index + 1]
        ? new Date(events[index + 1].created_at).getTime()
        : options.asOf.getTime();
      if (
        !Number.isFinite(started) ||
        !Number.isFinite(ended) ||
        ended < started
      )
        continue;
      const samples = durations.get(event.to_stage) ?? [];
      samples.push(ended - started);
      durations.set(event.to_stage, samples);
    }
  }

  const outcomes = { accepted: 0, rejected: 0, withdrawn: 0 };
  for (const [, events] of cohort) {
    const final = events.at(-1)?.to_stage;
    if (final === "accepted" || final === "rejected" || final === "withdrawn")
      outcomes[final]++;
  }

  return {
    generatedAt: options.asOf.toISOString(),
    currentStages: stages.map((stage) => ({
      stage,
      count: current.get(stage) ?? 0,
    })),
    cohort: {
      from: options.from ?? null,
      to: options.to ?? null,
      timezone: options.timezone,
      sampleSize: cohort.length,
      excludedCorrectedApplications,
      definition:
        "Applications are grouped by the local calendar date of their first recorded stage event. Applications with correction events are excluded from conversion and duration samples.",
    },
    funnel: funnelStages.map((stage, index) => {
      const reached = reachedByStage[index];
      const previous = index === 0 ? cohort.length : reachedByStage[index - 1];
      return {
        stage,
        reached,
        cohortDenominator: cohort.length,
        cohortRatePercent: percent(reached, cohort.length),
        priorMilestoneDenominator: previous,
        priorMilestoneRatePercent: percent(reached, previous),
      };
    }),
    funnelDefinition:
      "Reached means the application entered this stage or a later milestone, including accepted. A skipped stage counts as passing its funnel milestone, but does not create a time-in-stage sample.",
    timeInStage: funnelStages
      .filter((stage) => stage !== "accepted")
      .map((stage) => {
        const values = durations.get(stage) ?? [];
        return {
          stage,
          sampleSize: values.length,
          averageDays: values.length
            ? days(
                values.reduce((sum, value) => sum + value, 0) / values.length,
              )
            : null,
          medianDays: values.length ? days(median(values)) : null,
        };
      }),
    durationDefinition:
      "Elapsed calendar time runs from a recorded stage entry to its next event. The current non-terminal stage runs to generatedAt; terminal stages have no ongoing duration. Skipped stages add no duration sample.",
    outcomes,
  };
}
