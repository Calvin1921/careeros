import type { Analytics } from "./types";
export function statusSegments(current: Analytics["currentStages"]) {
  const count = (stages: string[]) =>
    current
      .filter((x) => stages.includes(x.stage))
      .reduce((sum, x) => sum + x.count, 0);
  return [
    { label: "To review", count: count(["discovered"]), color: "#93a9db" },
    {
      label: "Preparing to apply",
      count: count(["shortlisted"]),
      color: "#3159de",
    },
    {
      label: "Awaiting a response",
      count: count(["applied"]),
      color: "#b6c1d2",
    },
    {
      label: "In conversation",
      count: count(["screening", "interview", "offer"]),
      color: "#be842f",
    },
    { label: "Accepted", count: count(["accepted"]), color: "#2d8a68" },
    {
      label: "Closed",
      count: count(["rejected", "withdrawn"]),
      color: "#e3e8ef",
    },
  ];
}
export function donutGradient(segments: ReturnType<typeof statusSegments>) {
  const total = segments.reduce((sum, x) => sum + x.count, 0);
  if (!total) return "#edf1f7";
  let start = 0;
  return `conic-gradient(${segments
    .map((x) => {
      const end = start + (x.count / total) * 100;
      const part = `${x.color} ${start}% ${end}%`;
      start = end;
      return part;
    })
    .join(",")})`;
}
