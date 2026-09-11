const significantCompany = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

export function agentOpportunityContext(jobs, recordFor) {
  return jobs.map((job) => ({
    id: job.id,
    company: job.company,
    title: job.title,
    status: recordFor(job).status,
  }));
}

export function opportunityForAgentAction(action, jobs) {
  if (!action?.opportunityId) return null;
  return jobs.find((job) => job.id === action.opportunityId) || null;
}

export function priorApplicationFromText(text, jobs) {
  const normalized = significantCompany(text);
  if (
    !/(applied|application)/i.test(text) ||
    !/(before|already|previous|duplicate)/i.test(text)
  )
    return null;
  const matches = jobs.filter((job) => {
    const company = significantCompany(job.company);
    return company.length > 2 && normalized.includes(company);
  });
  return matches.length === 1 ? matches[0] : null;
}
