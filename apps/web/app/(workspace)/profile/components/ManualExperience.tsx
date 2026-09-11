"use client";
import type { ProfileSectionProps } from "../types";
export function ManualExperience({
  busy,
  run,
}: Pick<ProfileSectionProps, "busy" | "run">) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget,
          data = new FormData(form);
        void run(
          "profile/experiences",
          "POST",
          {
            kind: data.get("kind"),
            employer: data.get("employer"),
            roleTitle: data.get("roleTitle"),
            summary: data.get("summary"),
          },
          "Manual claim added as a proposal.",
        ).then((saved) => {
          if (saved) form.reset();
        });
      }}
    >
      <label>
        Type
        <select name="kind">
          <option value="experience">Work experience</option>
          <option value="project">Project</option>
          <option value="education">Education</option>
          <option value="certification">Certification</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Organization
        <input name="employer" />
      </label>
      <label>
        Role or title
        <input name="roleTitle" />
      </label>
      <label>
        Description
        <textarea name="summary" required minLength={5} />
      </label>
      <button disabled={busy}>Add proposal</button>
    </form>
  );
}
