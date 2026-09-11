const clean = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");
const slug = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function opportunityKey(job) {
  return `${slug(job.company)}::${slug(job.title)}`;
}

export function adaptJobScan({
  id,
  label,
  scannedAt,
  conversation,
  threadId,
  jobs,
  observations = [],
}) {
  const byKey = new Map();
  jobs.forEach((record, index) => {
    const key = opportunityKey(record);
    const job = {
      salary: "Not disclosed",
      interviewChance: null,
      effort: "Effort not assessed",
      action: "Review",
      reasons: [],
      gaps: [],
      matched_skills: [],
      url: null,
      ...record,
      id: record.id || slug(`${record.company}-${record.title}`),
      provenance: {
        threadId,
        conversation,
        scanId: id,
        scanLabel: label,
        scannedAt,
        source: record.source,
        sourceNote: record.sourceNote || null,
      },
      snapshot: true,
      snapshotId: id,
      snapshotLabel: label,
      snapshotAt: scannedAt,
      conversation,
      verdict: "match",
      _sourceOrder: index,
    };
    const current = byKey.get(key);
    if (!current || Number(job.fit || 0) > Number(current.fit || 0))
      byKey.set(key, job);
  });
  const normalized = [...byKey.values()].sort(
    (a, b) =>
      Number(b.fit || 0) - Number(a.fit || 0) ||
      a._sourceOrder - b._sourceOrder,
  );
  return {
    id,
    label,
    scannedAt,
    conversation,
    threadId,
    jobs: normalized.map(({ _sourceOrder, ...job }) => job),
    observations,
  };
}

export function mergeImportedJobs(snapshots) {
  const byKey = new Map();
  snapshots.forEach((snapshot, snapshotOrder) =>
    snapshot.jobs.forEach((record, recordOrder) => {
      const enriched = record.provenance
        ? record
        : {
            ...record,
            snapshot: true,
            snapshotId: snapshot.id,
            snapshotLabel: snapshot.label,
            snapshotAt: snapshot.scannedAt,
            conversation: snapshot.conversation,
            verdict: "match",
          };
      const key = opportunityKey(enriched);
      const current = byKey.get(key);
      const candidateTime =
        Date.parse(enriched.snapshotAt || snapshot.scannedAt || 0) || 0;
      const currentTime = Date.parse(current?.snapshotAt || 0) || 0;
      if (
        !current ||
        candidateTime > currentTime ||
        (candidateTime === currentTime &&
          Number(enriched.fit || 0) > Number(current.fit || 0))
      )
        byKey.set(key, {
          ...enriched,
          _order: snapshotOrder * 1000 + recordOrder,
        });
    }),
  );
  return [...byKey.values()]
    .sort(
      (a, b) =>
        Date.parse(b.snapshotAt || 0) - Date.parse(a.snapshotAt || 0) ||
        a._order - b._order,
    )
    .map(({ _order, ...job }) => job);
}
