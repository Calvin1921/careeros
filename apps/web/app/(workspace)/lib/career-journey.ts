import type { Stage, JobRecord } from "@careeros/domain";
export type Guide = {
  title: string;
  description: string;
  label: string;
  section: "description" | "materials" | "tasks" | "status";
  tone: "action" | "attention" | "waiting" | "complete";
};
export function jobGuide(stage: Stage): Guide {
  switch (stage) {
    case "discovered":
      return {
        title: "First, decide if this role is worth pursuing.",
        description:
          "Review the description and requirements. Shortlist it if you want to apply.",
        label: "Review this role",
        section: "description",
        tone: "action",
      };
    case "shortlisted":
      return {
        title: "Next, get your application ready.",
        description:
          "Use your confirmed experience to prepare an outline, then finish your CV and any requested materials before applying.",
        label: "Prepare application",
        section: "materials",
        tone: "action",
      };
    case "applied":
      return {
        title: "Application sent. Keep track of the response.",
        description:
          "Add a dated follow-up if needed. When a recruiter invites you to a call, update the stage to Screening.",
        label: "Plan a follow-up",
        section: "tasks",
        tone: "waiting",
      };
    case "screening":
      return {
        title: "Get ready for your screening call.",
        description:
          "Prepare your introduction, relevant experience, and questions for the recruiter.",
        label: "Prepare for screening",
        section: "materials",
        tone: "attention",
      };
    case "interview":
      return {
        title: "Focus on your next interview.",
        description:
          "Review the role, your evidence, and the examples you want to discuss.",
        label: "Prepare for interview",
        section: "materials",
        tone: "attention",
      };
    case "offer":
      return {
        title: "Review the offer before deciding.",
        description:
          "Record questions about compensation, scope, and terms. Update the status once you have made your decision.",
        label: "Review offer questions",
        section: "tasks",
        tone: "attention",
      };
    case "accepted":
      return {
        title: "You’ve accepted this opportunity.",
        description:
          "Your preparation and history are here whenever you need them.",
        label: "View your record",
        section: "status",
        tone: "complete",
      };
    default:
      return {
        title: "This application is closed.",
        description:
          "Your notes and preparation remain available. Continue with another opportunity when you’re ready.",
        label: "View your record",
        section: "status",
        tone: "waiting",
      };
  }
}
export function interviewPreparationAvailable(stage: Stage) {
  return stage === "screening" || stage === "interview";
}
export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dailyIntake(jobs: JobRecord[], today: string) {
  const groups: { label: string; range: string; jobs: JobRecord[] }[] = [
    { label: "Morning", range: "Before 12:00", jobs: [] },
    { label: "Afternoon", range: "12:00–17:59", jobs: [] },
    { label: "Evening", range: "From 18:00", jobs: [] },
  ];
  for (const job of jobs) {
    const d = new Date(job.created_at);
    if (!Number.isFinite(d.getTime()) || localDate(d) !== today) continue;
    groups[d.getHours() < 12 ? 0 : d.getHours() < 18 ? 1 : 2].jobs.push(job);
  }
  return groups;
}
