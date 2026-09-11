"use client";
import { useEffect, useState } from "react";
import { sectionFromHash } from "../lib/workspace-section";
export function useWorkspaceSection<T extends string>(
  sections: readonly T[],
  fallback: T,
) {
  const [section, setSection] = useState<T>(fallback);
  useEffect(() => {
    const sync = () =>
      setSection(sectionFromHash(window.location.hash, sections, fallback));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [sections, fallback]);
  function select(next: T) {
    setSection(next);
    window.history.replaceState(null, "", `#${next}`);
  }
  return { section, select };
}
