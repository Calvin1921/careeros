"use client";
import type { ProfileSectionProps } from "../types";
import styles from "../profile.module.css";
export function ProfileDetails({ workspace, busy, run }: ProfileSectionProps) {
  const profile = workspace.profile;
  return (
    <section className={styles.panel}>
      <h2>Personal details</h2>
      <p className={styles.muted}>
        The details you want to use in your applications.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void run(
            "profile",
            "PATCH",
            {
              fullName: data.get("fullName"),
              headline: data.get("headline"),
              email: data.get("email"),
              phone: data.get("phone"),
              location: data.get("location"),
              websiteUrl: data.get("websiteUrl"),
              linkedinUrl: data.get("linkedinUrl"),
              summary: data.get("summary"),
            },
            "Personal details saved.",
          );
        }}
      >
        <div className="form-grid">
          <label>
            Full name
            <input name="fullName" required defaultValue={profile?.full_name} />
          </label>
          <label>
            Headline
            <input name="headline" defaultValue={profile?.headline} />
          </label>
          <label>
            Email
            <input name="email" type="email" defaultValue={profile?.email} />
          </label>
          <label>
            Phone
            <input name="phone" defaultValue={profile?.phone} />
          </label>
          <label>
            Location
            <input name="location" defaultValue={profile?.location} />
          </label>
          <label>
            Website
            <input
              name="websiteUrl"
              type="url"
              defaultValue={profile?.website_url}
            />
          </label>
          <label>
            LinkedIn
            <input
              name="linkedinUrl"
              type="url"
              defaultValue={profile?.linkedin_url}
            />
          </label>
        </div>
        <label>
          Summary
          <textarea name="summary" rows={5} defaultValue={profile?.summary} />
        </label>
        <button disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
      </form>
    </section>
  );
}
