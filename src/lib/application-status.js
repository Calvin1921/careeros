export const applicationStatuses = [
  "Not started",
  "Ready to apply",
  "Applied",
  "Recruiter screen",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
];

export function opportunityKey(job) {
  return (
    job.id || `${job.source || "source"}:${job.source_job_id || job.title}`
  );
}

export function withApplicationStatus(
  records,
  job,
  status,
  occurredAt = new Date().toISOString(),
) {
  const key = opportunityKey(job);
  const previous = records[key] || { status: "Not started", history: [] };
  if (previous.status === status) return records;
  return {
    ...records,
    [key]: {
      ...previous,
      status,
      updatedAt: occurredAt,
      history: [
        ...(Array.isArray(previous.history) ? previous.history : []),
        { status, occurredAt },
      ],
    },
  };
}

export function withPriorApplicationFlag(
  records,
  job,
  note,
  occurredAt = new Date().toISOString(),
) {
  const key = opportunityKey(job);
  const previous = records[key] || { status: "Not started", history: [] };
  return {
    ...records,
    [key]: {
      ...previous,
      possibleDuplicate: {
        reportedAt: occurredAt,
        note: String(
          note ||
            `Previously applied to ${job.company}; confirm whether this is the same role.`,
        ),
      },
      updatedAt: occurredAt,
      history: [
        ...(Array.isArray(previous.history) ? previous.history : []),
        {
          type: "possible-duplicate",
          status: "Possible prior application",
          occurredAt,
        },
      ],
    },
  };
}

export function resolvePriorApplicationFlag(
  records,
  job,
  resolution,
  occurredAt = new Date().toISOString(),
) {
  const key = opportunityKey(job);
  const previous = records[key] || { status: "Not started", history: [] };
  const { possibleDuplicate, ...withoutFlag } = previous;
  if (!possibleDuplicate) return records;
  const confirmed = resolution === "same-role";
  return {
    ...records,
    [key]: {
      ...withoutFlag,
      status: confirmed ? "Applied" : withoutFlag.status,
      updatedAt: occurredAt,
      history: [
        ...(Array.isArray(withoutFlag.history) ? withoutFlag.history : []),
        {
          type: "duplicate-resolution",
          status: confirmed
            ? "Prior application confirmed"
            : "Duplicate cleared",
          occurredAt,
        },
      ],
    },
  };
}

export function statusGroup(status) {
  if (["Rejected", "Withdrawn"].includes(status)) return "closed";
  if (["Applied", "Recruiter screen", "Interview", "Offer"].includes(status))
    return "in-progress";
  return "to-apply";
}

export function funnelMetrics(records) {
  const statuses = Object.values(records).map((record) => record.status);
  const reached = (targets) =>
    statuses.filter((status) => targets.includes(status)).length;
  return {
    tracked: statuses.length,
    applied: reached([
      "Applied",
      "Recruiter screen",
      "Interview",
      "Offer",
      "Rejected",
    ]),
    screens: reached(["Recruiter screen", "Interview", "Offer"]),
    interviews: reached(["Interview", "Offer"]),
    offers: reached(["Offer"]),
    rejected: reached(["Rejected"]),
  };
}

export function funnelGuidance(metrics) {
  if (metrics.applied < 5)
    return {
      title: "Build a reliable baseline",
      body: "Track at least five submitted applications before changing strategy. Early outcomes are too noisy to diagnose.",
    };
  const screenRate = metrics.screens / metrics.applied;
  if (metrics.applied >= 10 && screenRate < 0.15)
    return {
      title: "Refine targeting and CV positioning",
      body: "Your application-to-screen rate is below 15%. Recheck role selection, opening summary and evidence in tailored CVs before expanding the search.",
    };
  const interviewRate = metrics.interviews / Math.max(metrics.screens, 1);
  if (metrics.screens >= 5 && interviewRate < 0.4)
    return {
      title: "Strengthen recruiter-screen positioning",
      body: "Screens are not converting consistently. Tighten the two-minute career story, role motivation and compensation alignment.",
    };
  const offerRate = metrics.offers / Math.max(metrics.interviews, 1);
  if (metrics.interviews >= 3 && offerRate < 0.2)
    return {
      title: "Prioritize interview preparation",
      body: "Applications and screens are working. The largest leverage is now role-specific technical practice and stronger evidence stories.",
    };
  return {
    title: "Keep the current strategy",
    body: "The funnel has no repeated weak stage yet. Continue tracking outcomes before making a major pivot.",
  };
}
