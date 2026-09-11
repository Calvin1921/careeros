function number(value) {
  return Number(value) || 0;
}

function sourceTotals(run) {
  const sources = Array.isArray(run?.source_results) ? run.source_results : [];
  return sources.reduce(
    (totals, source) => ({
      checked: totals.checked + number(source.checked ?? source.count),
      matched: totals.matched + number(source.matched),
      review: totals.review + number(source.review),
      excluded: totals.excluded + number(source.excluded),
    }),
    { checked: 0, matched: 0, review: 0, excluded: 0 },
  );
}

function topSkills(rows) {
  const counts = new Map();
  for (const row of rows)
    for (const skill of Array.isArray(row?.matched_skills)
      ? row.matched_skills
      : []) {
      const label = String(skill).trim();
      if (label) counts.set(label, (counts.get(label) || 0) + 1);
    }
  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));
}

function gapThemes(jobs) {
  const themes = [
    [
      "Location or eligibility",
      /eligibility|location|timezone|working arrangement/i,
    ],
    ["Compensation clarity", /salary|compensation|pay|target/i],
    [
      "Production AI evidence",
      /demonstrable|production ai|deployment evidence|ai project/i,
    ],
    ["Adjacent stack depth", /\bgo\b|ramp-up|deeper/i],
    ["Application effort", /assessment|effort/i],
  ];
  const text = jobs.flatMap((job) => job.gaps || []);
  return themes
    .map(([label, pattern]) => ({
      label,
      count: text.filter((item) => pattern.test(item)).length,
    }))
    .filter((item) => item.count)
    .sort((left, right) => right.count - left.count);
}

export function marketIntelligence({
  run,
  total = 0,
  loadedResults = [],
  selectedJobs = [],
}) {
  const totals = sourceTotals(run);
  const retained = Math.max(totals.checked, number(total), selectedJobs.length);
  const selected = selectedJobs.length;
  const yieldPercent = retained
    ? Math.round((selected / retained) * 1000) / 10
    : 0;
  const sample = [...loadedResults, ...selectedJobs];
  return {
    retained,
    selected,
    notSelected: Math.max(retained - selected, 0),
    yieldPercent,
    skills: topSkills(sample),
    gaps: gapThemes(selectedJobs),
    recommendation:
      selected < 15
        ? "Expand source coverage and role-family breadth before tightening the criteria. The fictional sample is too small to support personal career advice."
        : "Keep the criteria stable long enough to compare response rates before widening the search again.",
  };
}
