"use client";
import { ViewTabs, ViewPanel } from "../components/ViewTabs";
import { PageHeader } from "../components/PageHeader";
import { isInitialProfile } from "../lib/profile-state";
import { ProfileOnboarding } from "./components/ProfileOnboarding";
import { LearningWorkspace } from "./components/LearningWorkspace";
import { CapabilitiesWorkspace } from "./components/CapabilitiesWorkspace";
import { ProfileCv } from "./components/ProfileCv";
import { ProfileDetails } from "./components/ProfileDetails";
import { ProfileVersions } from "./components/ProfileVersions";
import { useProfileWorkspace } from "./use-profile-workspace";
import { useWorkspaceSection } from "../hooks/use-workspace-section";
const sections = [
  "experience",
  "details",
  "capabilities",
  "learning",
  "versions",
] as const;
const labels = {
  experience: "Experience",
  details: "Personal details",
  capabilities: "Skills & evidence",
  learning: "Learning",
  versions: "Saved versions",
};
export default function ProfilePage() {
  const profile = useProfileWorkspace();
  const { section, select } = useWorkspaceSection(sections, "experience");
  const error = profile.error ?? profile.mutationError;
  const empty = Boolean(profile.data && isInitialProfile(profile.data));
  return (
    <main>
      <PageHeader
        title="My profile"
        description="The experience and evidence behind your applications."
      />
      {!empty && profile.data && (
        <ViewTabs
          id="profile"
          label="Profile sections"
          items={sections.map((value) => ({ value, label: labels[value] }))}
          value={section}
          onChange={select}
        />
      )}
      {error && (
        <p role="alert" className="error">
          {error.message}{" "}
          <button className="secondary" onClick={() => void profile.refetch()}>
            Retry
          </button>
        </p>
      )}
      {profile.notice && (
        <p role="status" className="notice">
          {profile.notice}
        </p>
      )}
      {profile.isLoading && <p role="status">Loading your profile…</p>}
      {empty && profile.data && (
        <ProfileOnboarding
          workspace={profile.data}
          busy={profile.busy}
          run={profile.run}
        />
      )}
      {!empty && profile.data && (
        <div className="profile-content">
          <ViewPanel id="profile" value="experience" selected={section}>
            <ProfileCv
              workspace={profile.data}
              busy={profile.busy}
              run={profile.run}
            />
          </ViewPanel>
          <ViewPanel id="profile" value="details" selected={section}>
            <ProfileDetails
              workspace={profile.data}
              busy={profile.busy}
              run={profile.run}
            />
          </ViewPanel>
          <ViewPanel id="profile" value="capabilities" selected={section}>
            <CapabilitiesWorkspace
              workspace={profile.data}
              busy={profile.busy}
              run={profile.run}
            />
          </ViewPanel>
          <ViewPanel id="profile" value="learning" selected={section}>
            <LearningWorkspace
              workspace={profile.data}
              busy={profile.busy}
              run={profile.run}
            />
          </ViewPanel>
          <ViewPanel id="profile" value="versions" selected={section}>
            <ProfileVersions
              workspace={profile.data}
              busy={profile.busy}
              run={profile.run}
            />
          </ViewPanel>
        </div>
      )}
    </main>
  );
}
