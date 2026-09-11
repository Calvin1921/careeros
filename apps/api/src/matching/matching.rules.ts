export type Criteria = {
  roleTerms: string[];
  requiredTerms: string[];
  excludeTerms: string[];
  location: "hk-or-global" | "any";
  salaryFloorHkd: number | null;
  autoShortlist: boolean;
};
export type MatchInput = {
  title: string;
  description: string;
  requirements: string[];
};
export function containsTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Word boundaries avoid e.g. matching Go in Django; multiword phrases stay literal.
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(text);
}
export function assessJob(job: MatchInput, rules: Criteria) {
  const text = [job.title, job.description, ...job.requirements].join("\n");
  const reasons: string[] = [],
    gaps: string[] = [];
  const excluded = rules.excludeTerms.filter((t) => containsTerm(text, t));
  if (excluded.length)
    return {
      verdict: "excluded" as const,
      reasons: [`Excluded terms present: ${excluded.join(", ")}`],
      gaps,
    };
  const roles = rules.roleTerms.filter((t) => containsTerm(job.title, t));
  if (!roles.length) gaps.push("Job title does not match a target role term.");
  else reasons.push(`Title matches: ${roles.join(", ")}`);
  for (const term of rules.requiredTerms) {
    if (containsTerm(text, term))
      reasons.push(`Required skill mentioned: ${term}`);
    else gaps.push(`Required skill not found: ${term}`);
  }
  if (rules.location === "hk-or-global") {
    if (
      /^(?:location|based in)\s*:\s*Hong Kong\s*[.]?\s*$/im.test(text) &&
      !/(?:US|USA|Europe|UK|EU)[ -]only|must (?:be|reside|live) in/i.test(text)
    )
      reasons.push("Source explicitly lists Location: Hong Kong.");
    else if (
      /^remote\s*:\s*(?:worldwide|global)\s*[.]?\s*$/im.test(text) &&
      !/(?:US|USA|Europe|UK|EU)[ -]only|must (?:be|reside|live) in/i.test(text)
    )
      reasons.push(
        "Source explicitly lists worldwide/global remote eligibility.",
      );
    else
      gaps.push(
        "Hong Kong or worldwide remote eligibility needs source confirmation.",
      );
  }
  if (rules.salaryFloorHkd !== null) {
    const match = text.match(
      /salary\s*:\s*(?:HKD|HK\$)\s*([\d,]+)\s*(?:[-–]\s*([\d,]+))?\s*(?:\/\s*month|per month)/i,
    );
    if (!match) gaps.push("No explicit monthly HKD salary range found.");
    else {
      const lower = Number(match[1].replace(/,/g, "")),
        upper = Number((match[2] ?? match[1]).replace(/,/g, ""));
      if (upper < lower || lower <= 0)
        gaps.push("Salary range needs verification.");
      else if (upper < rules.salaryFloorHkd)
        return {
          verdict: "excluded" as const,
          reasons: [
            ...reasons,
            "Published monthly salary ceiling is below your floor.",
          ],
          gaps,
        };
      else if (lower < rules.salaryFloorHkd)
        gaps.push(
          "Salary range overlaps your floor; confirm the attainable offer.",
        );
      else
        reasons.push(
          `Explicit monthly HKD salary meets your ${rules.salaryFloorHkd.toLocaleString("en-US")} floor.`,
        );
    }
  }
  return {
    verdict: gaps.length ? ("review" as const) : ("match" as const),
    reasons,
    gaps,
  };
}
