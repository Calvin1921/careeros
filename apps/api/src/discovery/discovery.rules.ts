import type { ConversationFact } from "../conversation-facts.rules";
import {
  containsTerm,
  assessJob,
  type Criteria,
} from "../matching/matching.rules";
export const scannerVersion = "public-boards-v1";
export type SourceJob = {
  id: string;
  title: string;
  company: string;
  url: string;
  description: string;
  location: string;
  salary: string;
  updatedAt: string | null;
};
const skillNames = [
  "TypeScript",
  "JavaScript",
  "React",
  "React Native",
  "Next.js",
  "Node.js",
  "NestJS",
  "Go",
  "Python",
  "Java",
  "Kotlin",
  "Swift",
  "C++",
  "C#",
  "Ruby",
  "PHP",
  "Vue",
  "Angular",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "GraphQL",
  "REST",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "GCP",
  "Terraform",
  "SQL",
  "Figma",
  "Salesforce",
];
const roleFamilies = [
  { pattern: /front[ -]?end/i, terms: ["frontend", "front-end", "front end"] },
  { pattern: /back[ -]?end/i, terms: ["backend", "back-end", "back end"] },
  {
    pattern: /full[ -]?stack/i,
    terms: ["fullstack", "full-stack", "full stack"],
  },
  {
    pattern: /software (?:engineer|developer)/i,
    terms: ["software engineer", "software developer"],
  },
  {
    pattern: /mobile|ios developer|android developer/i,
    terms: ["mobile", "ios", "android"],
  },
  {
    pattern: /data (?:engineer|scientist|analyst)/i,
    terms: ["data engineer", "data scientist", "data analyst"],
  },
  {
    pattern: /devops|platform engineer|site reliability/i,
    terms: ["devops", "platform engineer", "site reliability"],
  },
  {
    pattern: /product designer|ux designer|ui designer/i,
    terms: ["product designer", "ux designer", "ui designer"],
  },
];
export function cvSignals(text: string) {
  const skills = skillNames.filter((skill) => containsTerm(text, skill));
  const roles = [
    ...new Set(
      roleFamilies.filter((f) => f.pattern.test(text)).flatMap((f) => f.terms),
    ),
  ];
  return { skills, roleTerms: roles.slice(0, 30) };
}
export function scheduledSlot(now: Date, times: string[], enabledAt: Date) {
  // This first release schedules in the user's confirmed Hong Kong timezone (UTC+08, no DST).
  const local = new Date(now.valueOf() + 8 * 3600000).toISOString();
  const day = local.slice(0, 10),
    clock = local.slice(11, 16);
  const due = times
    .filter(
      (time) =>
        time <= clock &&
        new Date(`${day}T${time}:00+08:00`).valueOf() > enabledAt.valueOf(),
    )
    .sort();
  return due.length ? `${day}T${due[due.length - 1]}+08:00` : null;
}
export function assessSource(
  job: SourceJob,
  rules: Criteria,
  skills: string[],
) {
  const exactHK = /^(?:Hong Kong|Hong Kong SAR)(?:,? China)?$/i.test(
    job.location.trim(),
  );
  const worldwide =
    /^(?:worldwide|global|remote\s*[-–:]\s*(?:worldwide|global)|anywhere)$/i.test(
      job.location.trim(),
    );
  const eligibility = exactHK
    ? "Location: Hong Kong"
    : worldwide
      ? "Remote: Worldwide"
      : "";
  const result = assessJob(
    {
      title: job.title,
      description: `${eligibility}\n${job.description}\n${job.salary ? "Salary: " + job.salary : ""}`,
      requirements: [],
    },
    rules,
  );
  if (job.description.trim().length < 20) {
    result.gaps.push("The source description is incomplete.");
    result.verdict = "review";
  }
  const matchedSkills = skills.filter((skill) =>
    containsTerm(job.description, skill),
  );
  if (!rules.roleTerms.some((term) => containsTerm(job.title, term)))
    result.verdict = "excluded";
  if (result.verdict !== "excluded" && skills.length && !matchedSkills.length) {
    result.gaps.push("No explicit overlap with the skills found in your CV.");
    result.verdict = "review";
  }
  if (matchedSkills.length)
    result.reasons.push(`Skills also in your CV: ${matchedSkills.join(", ")}`);
  // Source location remains authoritative even if the body mentions another office.
  if (
    rules.location === "hk-or-global" &&
    !exactHK &&
    !worldwide &&
    !result.gaps.some((x) => x.includes("eligibility"))
  ) {
    result.gaps.push(
      "The listed location is not explicitly Hong Kong or worldwide remote.",
    );
    if (result.verdict !== "excluded") result.verdict = "review";
  }
  return { ...result, matchedSkills };
}

export function profileSignals(text: string, facts: ConversationFact[]) {
  // Only confirmed skill/experience values establish skills. Quotes and aspirations do not.
  const base = cvSignals(text);
  const career = cvSignals(
    facts
      .filter((f) => ["skills", "experience"].includes(f.field))
      .map((f) => f.value)
      .join("\n"),
  );
  const targets = facts
    .filter((f) => f.field === "targetRole")
    .map((f) => f.value);
  return {
    skills: [...new Set([...base.skills, ...career.skills])],
    roleTerms: [
      ...new Set([...targets, ...base.roleTerms, ...career.roleTerms]),
    ].slice(0, 30),
  };
}
