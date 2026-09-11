export function routeCareerCommand(
  command,
  { hasJob = false, page = "briefing" } = {},
) {
  const text = String(command || "").trim();
  if (/\b(run|start|refresh|trigger)\b.*\bscan\b/i.test(text))
    return {
      handled: true,
      action: "scan",
      reply:
        "I’m refreshing the latest recorded scan now. The scheduled discovery task performs the fresh web searches at 08:00, 13:00 and 18:00 HKT.",
    };
  if (
    /\b(open|show|manage|view|edit|change)\b.*\b(schedule|search times?)\b/i.test(
      text,
    )
  )
    return {
      handled: true,
      action: "schedule",
      reply:
        "I opened your search schedule so you can adjust when CareerOS scans.",
    };
  if (
    /\b(open|show|view|review|edit|change|go to)\b.*\b(profile|criteria)\b/i.test(
      text,
    )
  )
    return {
      handled: true,
      action: "profile",
      reply:
        "I opened the profile and search criteria CareerOS uses for matching.",
    };
  if (
    /\b(open|show|view|review|go to)\b.*\b(opportunit(?:y|ies)|roles?|jobs?)\b/i.test(
      text,
    )
  )
    return {
      handled: true,
      action: "opportunities",
      reply:
        "I opened your ranked opportunities and kept this conversation available.",
    };
  if (/first|priority|next|start/i.test(text) && page === "briefing")
    return {
      handled: true,
      action: "none",
      reply:
        "Start with Reap’s Senior Software Engineer, Onboarding role. It is the strongest current combination of fit, interview likelihood, Hong Kong eligibility and a preserved employer link; review the grounded CV and confirm compensation before submission.",
    };
  if (/first|priority|next|start/i.test(text) && page === "opportunities")
    return {
      handled: true,
      action: "none",
      reply:
        "Review the Priority group first, then take any Quick Apply roles that need fifteen minutes or less. Keep evidence-blocked roles out of today’s application session.",
    };
  return {
    handled: false,
    action: "agent",
    reply: hasJob ? "I’m using this role as context." : "",
  };
}

export function assistantContextLabel(context = {}) {
  if (context.job)
    return `${context.job.company} · ${context.job.title || context.job.role}`;
  return (
    {
      briefing: "Today’s briefing",
      opportunities: "Opportunity review",
      profile: "Candidate profile",
    }[context.page] || "CareerOS workspace"
  );
}
