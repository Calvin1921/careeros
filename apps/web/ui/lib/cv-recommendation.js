const cryptoPattern = /crypto|blockchain|web3|wallet|digital asset/i;
const financePattern = /bank|finance|fintech|trading|insurance|payments/i;

function focusFor(job) {
  const title = String(job?.title || "");
  if (/frontend|front-end|design engineer|react engineer/i.test(title))
    return "Frontend";
  if (/\bai\b|forward.deployed|llm/i.test(title)) return "AI";
  return "Fullstack";
}

function industryFor(job) {
  const text = `${job?.company || ""} ${job?.title || ""} ${(job?.matched_skills || []).join(" ")}`;
  if (cryptoPattern.test(text)) return "Crypto";
  if (financePattern.test(text)) return "Finance";
  return "Startup";
}

export function recommendCv(job) {
  const focus = focusFor(job);
  const industry = industryFor(job);
  return {
    focus,
    industry,
    label: `${focus} · ${industry}`,
    url: `/resumes/ats/${focus}/${industry}/Demo_Candidate_Resume.pdf`,
  };
}
