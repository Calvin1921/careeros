// Only fictional records; intentionally restricted to the dedicated portfolio API.
const base = process.env.CAREEROS_DEMO_API_URL;
if (base !== 'http://127.0.0.1:4017' || process.env.CAREEROS_ALLOW_DEMO_WRITES !== 'yes') {
  throw new Error('Use the isolated portfolio API on 4017 and explicitly enable demo writes.');
}
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
  if (!response.ok) throw new Error(`Demo request failed: ${method} ${path} (${response.status})`);
  return response.json();
}
await request('/health');
const input = {
  company: 'Example Ledger Labs (fictional)', title: 'Full-stack Engineer',
  url: 'https://example.com/jobs/portfolio-demo',
  description: 'Build TypeScript workflows with PostgreSQL transactions and reliable background jobs. Explain how proposed claims are reviewed before use.',
  requirements: ['TypeScript', 'PostgreSQL transactions', 'Reliable background jobs'],
};
const existing = await request('/jobs');
if (!Array.isArray(existing)) throw new Error('Unexpected job-list response; no fixtures written.');
if (existing.some(job => job.url === input.url)) {
  console.log('Fictional role already exists. No duplicate fixtures created.');
} else {
  const job = await request('/jobs', 'POST', input);
  await request(`/jobs/${job.id}/stage`, 'PATCH', {stage: 'shortlisted'});
  const capability = await request('/capabilities', 'POST', {
    name: 'Demo workflow project', technologies: ['TypeScript', 'PostgreSQL'],
    transferablePrinciples: ['Transactions', 'Idempotent background work'], learningHours: 12,
  });
  await request('/evidence', 'POST', {
    capabilityId: capability.id, kind: 'project',
    summary: 'Fictional demo: built a task workflow with explicit state transitions and retryable jobs.',
    sourceUrl: 'https://example.com/projects/workflow-demo', verified: false,
  });
  await request(`/jobs/${job.id}/artifacts`, 'POST', {kind: 'application-package'});
  console.log('Fictional role, proposed evidence and template request created. Review the demo evidence manually in the UI.');
}
