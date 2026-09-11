import { candidate } from "../data/candidate.js";
export function prepareCv(job) {
  const skills = Array.isArray(job?.matched_skills) ? job.matched_skills : [];
  return {
    ...structuredClone(candidate),
    title: job?.title || candidate.title,
    summary: `Fictional demonstration profile tailored for ${job?.title || "software engineering"} at ${job?.company || "the fictional employer"}. Relevant experience includes user-facing TypeScript workflows, APIs and automated testing. ${skills.length ? "Relevant skill overlap: " + skills.join(", ") + "." : ""} Review every statement before use.`,
  };
}
