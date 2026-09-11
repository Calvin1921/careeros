import { profileFields } from "../lib/profile-proposals";

export function ProfileProposalReview({ interview }) {
  const proposal = interview.pendingProfile;
  if (!proposal?.facts.length) return null;
  const selected = proposal.facts.filter(
    (fact) => fact.approved && fact.value.trim(),
  ).length;
  return (
    <section
      className="profile-proposal-review"
      aria-labelledby="profile-proposal-title"
    >
      <p className="briefing-label">
        Proposed from your conversation · not saved
      </p>
      <h2 id="profile-proposal-title">Does this represent you accurately?</h2>
      <p>
        Review the source quote, correct any wording, then select the details
        you want to keep. Editing a detail clears its confirmation.
      </p>
      <div className="profile-proposal-list">
        {proposal.facts.map((fact) => (
          <article className="profile-proposal-fact" key={fact.field}>
            <label className="profile-proposal-value">
              <strong>{profileFields[fact.field]}</strong>
              <textarea
                value={fact.value}
                maxLength={1600}
                onChange={(event) =>
                  interview.updateProposedFact(fact.field, {
                    value: event.target.value,
                  })
                }
                aria-label={`Proposed ${profileFields[fact.field].toLowerCase()}`}
                rows={3}
              />
            </label>
            <p className="profile-proposal-source">Your words</p>
            <blockquote>{fact.evidence}</blockquote>
            <label className="profile-proposal-check">
              <input
                type="checkbox"
                checked={fact.approved}
                onChange={(event) =>
                  interview.updateProposedFact(fact.field, {
                    approved: event.target.checked,
                  })
                }
              />
              <span>
                I reviewed this {profileFields[fact.field].toLowerCase()} detail
                and confirm it is accurate.
              </span>
            </label>
          </article>
        ))}
      </div>
      <div className="profile-proposal-actions">
        <button
          className="primary"
          disabled={!selected}
          onClick={interview.saveConfirmedFacts}
        >
          Save{" "}
          {selected
            ? `${selected} confirmed detail${selected === 1 ? "" : "s"}`
            : "confirmed details"}
        </button>
        <button className="text-button" onClick={interview.discardProposal}>
          Dismiss proposal
        </button>
      </div>
      <p className="fine">
        Only selected details enter the local profile. Nothing is sent to an
        employer.
      </p>
    </section>
  );
}
