"use client";
import { useEffect, useState } from "react";
const key = "careeros.sidebar-hidden";
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(key) === "true");
    } catch {}
  }, []);
  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(key, String(next));
      } catch {}
      return next;
    });
  }
  return { collapsed, toggle };
}
