const evidenceGapPattern =
  /demonstrable|deeper production|production[- ]grade|production ai|production llm|production go|deployed ai|deployment evidence|portfolio proof/i;
const compensationRiskPattern =
  /below target|salary.*confirm|compensation.*confirm/i;
const eligibilityPattern =
  /eligibility|location.*confirm|timezone|working arrangement/i;

export function applicationReadiness(job) {
  const gaps = Array.isArray(job?.gaps) ? job.gaps : [];
  const joined = gaps.join(" ");
  if (evidenceGapPattern.test(joined))
    return {
      kind: "evidence-gap",
      label: "Build evidence first",
      title: "This is a market signal, not an immediate application",
      body: "The role asks for evidence that is not yet supported by your CV. Keep it in the market map and build one focused proof point before applying.",
    };
  if (
    !job?.url ||
    compensationRiskPattern.test(joined) ||
    eligibilityPattern.test(joined) ||
    /recover.*application link|official employer application/i.test(joined)
  )
    return {
      kind: "verify",
      label: "Verify, then apply",
      title: "Application is viable after one quick check",
      body: "Confirm the highlighted constraint before spending time on a tailored package.",
    };
  return {
    kind: "ready",
    label: "Prepare application",
    title: "Ready to prepare",
    body: "Your recorded experience supports the central requirements. Prepare the tailored CV and final application checks.",
  };
}
