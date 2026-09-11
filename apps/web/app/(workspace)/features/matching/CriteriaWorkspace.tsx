"use client";
import { PageHeader } from "../../components/PageHeader";
import Link from "next/link";
import { useMatching } from "../../hooks/use-matching";
const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
export function CriteriaWorkspace() {
  const { criteria, save, process } = useMatching();
  const rules = criteria.data?.rules;
  return (
    <main className="narrow">
      <PageHeader
        title="Search criteria"
        description="Decide which roles belong on your shortlist."
        action={
          <Link className="text-link" href="/jobs">
            View shortlist →
          </Link>
        }
      />
      {criteria.isPending && <p role="status">Loading criteria…</p>}
      {criteria.error && (
        <p role="alert" className="error">
          {criteria.error.message}
        </p>
      )}
      {criteria.data && (
        <>
          <section className="card">
            <h2>Your matching rules</h2>
            <p className="section-caption">
              Hong Kong or worldwide remote follows your earlier preference.
              Confirm your target roles and deal-breakers before enabling
              automatic shortlisting.
            </p>
            <form
              key={criteria.data.version}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                save.mutate({
                  expectedVersion: criteria.data!.version,
                  roleTerms: lines(data.get("roles")),
                  requiredTerms: lines(data.get("required")),
                  excludeTerms: lines(data.get("exclude")),
                  location: data.get("location") as "hk-or-global" | "any",
                  salaryFloorHkd: data.get("salary")
                    ? Number(data.get("salary"))
                    : null,
                  autoShortlist: data.get("auto") === "on",
                });
              }}
            >
              <label>
                Target role titles{" "}
                <small>Match any one phrase. One per line.</small>
                <textarea
                  name="roles"
                  required
                  rows={3}
                  defaultValue={rules?.roleTerms.join("\n")}
                  placeholder={
                    "Senior Software Engineer\nForward Deployed Engineer"
                  }
                />
              </label>
              <div className="form-grid">
                <label>
                  Required skills{" "}
                  <small>
                    Every term must appear in the supplied description.
                  </small>
                  <textarea
                    name="required"
                    rows={3}
                    defaultValue={rules?.requiredTerms.join("\n")}
                  />
                </label>
                <label>
                  Exclude when mentioned{" "}
                  <small>
                    Use precise terms; keyword rules do not understand negation.
                  </small>
                  <textarea
                    name="exclude"
                    rows={3}
                    defaultValue={rules?.excludeTerms.join("\n")}
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Location eligibility
                  <select
                    name="location"
                    defaultValue={rules?.location ?? "hk-or-global"}
                  >
                    <option value="hk-or-global">
                      Hong Kong or worldwide remote
                    </option>
                    <option value="any">No location filter</option>
                  </select>
                </label>
                <label>
                  Monthly salary floor · HKD{" "}
                  <small>Leave blank until you decide.</small>
                  <input
                    name="salary"
                    type="number"
                    min="0"
                    max="1000000"
                    defaultValue={rules?.salaryFloorHkd ?? ""}
                  />
                </label>
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="auto"
                  defaultChecked={rules?.autoShortlist ?? false}
                />
                <span>
                  Automatically shortlist new imports when every rule passes
                  <small>
                    Missing eligibility or salary evidence stays in history for
                    review.
                  </small>
                </span>
              </label>
              {save.error && (
                <p role="alert" className="error">
                  {save.error.message}
                </p>
              )}
              <button disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save criteria"}
              </button>
              {save.isSuccess && (
                <p role="status" className="notice">
                  Criteria saved as version {save.data.version}.
                </p>
              )}
            </form>
          </section>
          <section className="card">
            <h2>Process existing discoveries</h2>
            <p className="section-caption">
              Recheck discovered roles against your saved criteria. Existing
              shortlisted, applied, and closed records are kept. Matching roles
              move to the shortlist only when automatic shortlisting is enabled
              above.
            </p>
            <button
              className="secondary"
              disabled={!criteria.data.version || process.isPending}
              onClick={() => process.mutate()}
            >
              {process.isPending ? "Processing…" : "Process saved discoveries"}
            </button>
            {process.data && (
              <p role="status" className="notice">
                {process.data.evaluated} evaluated · {process.data.shortlisted}{" "}
                shortlisted.
              </p>
            )}
            {process.error && (
              <p role="alert" className="error">
                {process.error.message}
              </p>
            )}
          </section>
          <details className="card">
            <summary>What the current matcher can verify</summary>
            <p>
              Matching uses explicit words in supplied source text, not a
              model-generated fit score. It does not yet research company
              background or enrich missing salary data.
            </p>
            <p>
              Location evidence currently requires “Location: Hong Kong”, “Based
              in: Hong Kong”, or “Remote: Worldwide / Global”. Salary filtering
              requires an explicit line such as “Salary: HKD 70000–90000/month”.
              Other formats remain uncertain for review; no salary or
              eligibility is invented.
            </p>
            <p>
              Discover roles scans public company pages on demand or on a
              schedule. Manual imports also use these saved rules.
            </p>
          </details>
        </>
      )}
    </main>
  );
}
