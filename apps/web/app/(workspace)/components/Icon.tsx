import type { CSSProperties } from "react";
const paths = {
  today: "M3 5h18v16H3z M7 3v4 M17 3v4 M3 10h18 M7 14h3 M7 17h6",
  jobs: "M8 6V3h8v3 M3 6h18v14H3z M3 11c6 4 12 4 18 0 M10 12h4",
  profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 6 0 0 1 16 0v3",
  insights: "M4 3v18h17 M8 16v-4 M13 16V8 M18 16V4",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  check: "M5 12l4 4L19 6",
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
