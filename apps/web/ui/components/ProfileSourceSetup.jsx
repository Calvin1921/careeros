import { Check, PhoneCall, ShieldCheck } from "@phosphor-icons/react";
function Choice({ selected, children, onClick }) {
  return (
    <button
      type="button"
      className={
        selected ? "profile-choice profile-choice--selected" : "profile-choice"
      }
      onClick={onClick}
    >
      {children}
      {selected && <Check size={16} weight="bold" />}
    </button>
  );
}
export function ProfileSourceSetup({ interview }) {
  return (
    <section
      className="profile-source-setup"
      aria-label="Start your career conversation"
    >
      <h2>Start with a conversation.</h2>
      <p>
        You do not need a CV or LinkedIn profile to begin. Talk about your
        experience, the work you want and what matters next. CareerOS can
        propose details for your review.
      </p>
      <fieldset>
        <legend>What work should we discuss?</legend>
        <div className="profile-choice-grid">
          {["Full-time", "Contract", "Full-time or contract"].map((value) => (
            <Choice
              key={value}
              selected={interview.setup.workType === value}
              onClick={() => interview.updateSetup({ workType: value })}
            >
              {value}
            </Choice>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>How much may I do before asking?</legend>
        <div className="profile-choice-stack">
          <Choice
            selected={
              interview.setup.applicationControl ===
              "Prepare automatically · ask before submission"
            }
            onClick={() =>
              interview.updateSetup({
                applicationControl:
                  "Prepare automatically · ask before submission",
              })
            }
          >
            <span>
              <strong>Prepare automatically</strong>
              <small>Build the package, then ask before submission.</small>
            </span>
          </Choice>
          <Choice
            selected={
              interview.setup.applicationControl === "Ask before preparing"
            }
            onClick={() =>
              interview.updateSetup({
                applicationControl: "Ask before preparing",
              })
            }
          >
            <span>
              <strong>Ask before preparing</strong>
              <small>Wait for approval before tailoring anything.</small>
            </span>
          </Choice>
        </div>
      </fieldset>
      <div className="profile-setup-trust">
        <ShieldCheck size={19} />
        <p>
          ElevenLabs processes the voice conversation and transcript. Only
          details you review and approve are saved to your local profile. No
          employer submission happens here.
        </p>
      </div>
      <button
        className="primary profile-call-start"
        disabled={!interview.sourceReady}
        onClick={interview.startCall}
      >
        <PhoneCall size={19} weight="fill" /> Start a conversation
      </button>
    </section>
  );
}
