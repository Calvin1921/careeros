"use client";
import type { ProfileSectionProps } from "../types";
import styles from "../profile.module.css";
export function LearningMilestoneForm({
  workspace,
  busy,
  run,
}: ProfileSectionProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget,
          data = new FormData(form);
        void run(
          "learning-milestones",
          "POST",
          {
            capabilityId: data.get("capabilityId"),
            title: data.get("title"),
            weekStart: data.get("weekStart"),
            weeklyHours: Number(data.get("weeklyHours")),
            practicalEvidenceGoal: data.get("goal"),
            status: "planned",
          },
          "Learning milestone planned.",
        ).then((saved) => {
          if (saved) form.reset();
        });
      }}
    >
      <label>
        Capability
        <select name="capabilityId">
          {workspace.capabilities.map((capability) => (
            <option key={capability.id} value={capability.id}>
              {capability.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Milestone
        <input name="title" required />
      </label>
      <div className={styles.twoCol}>
        <label>
          Week starting
          <input name="weekStart" type="date" required />
        </label>
        <label>
          Time budget
          <input
            name="weeklyHours"
            type="number"
            step="0.5"
            min="0"
            max="168"
            required
          />
        </label>
      </div>
      <label>
        Practical evidence goal
        <textarea name="goal" required minLength={5} />
      </label>
      <button disabled={busy}>Plan milestone</button>
    </form>
  );
}
