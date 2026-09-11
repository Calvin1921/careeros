"use client";
import Link from "next/link";
import { useSidebar } from "../hooks/use-sidebar";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/workspace", label: "Today", icon: "today" },
  { href: "/discover", label: "Discover roles", icon: "jobs" },
  { href: "/jobs", label: "Applications", icon: "jobs" },
  { href: "/scans", label: "Import history", icon: "today" },
  { href: "/criteria", label: "Search criteria", icon: "jobs" },
  { href: "/profile", label: "My profile", icon: "profile" },
  { href: "/intelligence", label: "Insights", icon: "insights" },
];
export function Navigation() {
  const path = usePathname();
  const { collapsed, toggle } = useSidebar();
  return (
    <>
      <button
        className="rail-toggle"
        aria-controls="workspace-sidebar"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
        title={collapsed ? "Show sidebar" : "Hide sidebar"}
        onClick={toggle}
      >
        {collapsed ? "☰" : "‹"}
      </button>
      <aside
        id="workspace-sidebar"
        className="app-rail"
        data-collapsed={collapsed}
      >
        <Link className="brand" href="/workspace" aria-label="CareerOS home">
          <span className="brand-mark">
            c<span>↗</span>
          </span>
          career<span className="brand-os">os</span>
        </Link>
        <p className="rail-caption">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (href === "/" ? path === "/" : path.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              <Icon name={icon} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="rail-bottom">
          <span className="workspace-avatar">ME</span>
          <div>
            <strong>Personal workspace</strong>
            <small>CareerOS</small>
          </div>
        </div>
      </aside>
    </>
  );
}
