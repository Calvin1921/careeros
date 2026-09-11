type ProfileState = {
  imports: unknown[];
  experiences: { status: string }[];
  profile: { full_name?: string } | null;
};
export function isInitialProfile(value: ProfileState) {
  return value.imports.length === 0 && value.experiences.length === 0;
}
export function isApplicationProfileReady(value: ProfileState) {
  return Boolean(
    value.profile?.full_name &&
    value.experiences.some((x) => x.status === "confirmed"),
  );
}
