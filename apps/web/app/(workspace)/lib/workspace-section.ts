export function sectionFromHash<T extends string>(
  hash: string,
  sections: readonly T[],
  fallback: T,
): T {
  const value = hash.replace(/^#/, "");
  return sections.find((section) => section === value) ?? fallback;
}
