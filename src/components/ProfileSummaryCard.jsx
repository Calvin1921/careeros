import { useEffect, useState } from "react";
import {
  confirmedFactsFrom,
  confirmedProfileKey,
  profileChangedEvent,
  profileFields,
  readLocalProfile,
} from "../lib/profile-proposals";

export function ProfileSummaryCard({ compact = false, facts }) {
  const [stored, setStored] = useState(() =>
    confirmedFactsFrom(readLocalProfile(confirmedProfileKey, null)),
  );
  useEffect(() => {
    const refresh = () =>
      setStored(
        confirmedFactsFrom(readLocalProfile(confirmedProfileKey, null)),
      );
    window.addEventListener(profileChangedEvent, refresh);
    return () => window.removeEventListener(profileChangedEvent, refresh);
  }, []);
  const confirmed = facts || stored;
  return (
    <section
      className={
        compact
          ? "profile-summary-card profile-summary-card--compact"
          : "profile-summary-card"
      }
      aria-label="Confirmed profile details"
    >
      <p className="briefing-label">Confirmed by you</p>
      <h2>Your saved profile details</h2>
      {confirmed.length ? (
        <dl>
          {confirmed.map((fact) => (
            <div key={fact.field}>
              <dt>{profileFields[fact.field]}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>
          No conversation details have been confirmed yet. Proposed details stay
          separate until you review and save them.
        </p>
      )}
      <p className="fine">
        Saved on this device. A conversation or an AI suggestion does not
        confirm a fact for you.
      </p>
    </section>
  );
}
