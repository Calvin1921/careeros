import type { JobRecord } from "@careeros/domain";
import type { Overview } from "../../hooks/use-workspace";
export function nextTodayAction(
  jobs: JobRecord[],
  overview: Overview,
  hasConfirmedProfile: boolean,
) {
  const due = overview.decisions[0];
  if (due)
    return {
      tone: "attention",
      title: due.title,
      description: `${due.company} · ${due.role_title}. ${due.due_date < overview.today ? "This follow-up is overdue." : "This follow-up is due today."}`,
      label: "Handle this follow-up",
      href: `/jobs/${due.job_id}#tasks`,
    };
  const interview = jobs.find(
    (j) => j.stage === "interview" || j.stage === "screening",
  );
  if (interview)
    return {
      tone: "attention",
      title: `Prepare for ${interview.company}`,
      description: `${interview.title} is at ${interview.stage}. Focus on this conversation before starting another application.`,
      label: "Prepare for the conversation",
      href: `/jobs/${interview.id}#materials`,
    };
  if (!hasConfirmedProfile)
    return {
      tone: "action",
      title: "Start with your experience.",
      description:
        "Import your CV or add experience, then confirm the details you want to use in applications.",
      label: "Set up my profile",
      href: "/profile",
    };
  const offer = jobs.find((j) => j.stage === "offer");
  if (offer)
    return {
      tone: "attention",
      title: `Review your offer from ${offer.company}`,
      description:
        "Record the terms and any questions before making your decision.",
      label: "Review offer questions",
      href: `/jobs/${offer.id}#tasks`,
    };
  const apply = jobs.find((j) => j.stage === "shortlisted");
  if (apply)
    return {
      tone: "action",
      title: `Prepare your application to ${apply.company}`,
      description: `${apply.title} is on your apply list. Review the requirements and finish your materials before submitting.`,
      label: "Continue this application",
      href: `/jobs/${apply.id}#materials`,
    };
  const fresh = jobs.find((j) => j.stage === "discovered");
  if (fresh)
    return {
      tone: "action",
      title: `Decide whether ${fresh.company} is a fit`,
      description:
        "Review the role, then shortlist it to add it to your apply list.",
      label: "Review this opportunity",
      href: `/jobs/${fresh.id}#description`,
    };
  if (jobs.some((j) => j.stage === "applied"))
    return {
      tone: "waiting",
      title: "Your applications are in progress.",
      description:
        "No dated follow-ups are due. Update an application when you hear back.",
      label: "Review submitted applications",
      href: "/jobs#applied",
    };
  return {
    tone: "action",
    title: "Find your next opportunity.",
    description:
      "Save a job or import the results of a scan to start your review list.",
    label: "Add a job",
    href: "/jobs/new",
  };
}
