export const discoverySweepTimes = ["08:00", "13:00", "18:00"];
export const dailyApplyQueueTime = "19:30";

export function effectiveSweepTimes(times = []) {
  const values = Array.isArray(times) ? times : [];
  const legacy = values.join(",") === "09:00,13:30,18:30";
  return values.length && !legacy ? values : discoverySweepTimes;
}
