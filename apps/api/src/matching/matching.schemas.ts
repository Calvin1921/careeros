import { BadRequestException } from "@nestjs/common";
import type { Criteria } from "./matching.rules";
export function parseCriteria(
  input: unknown,
): Criteria & { expectedVersion: number } {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new BadRequestException("Criteria must be an object.");
  const data = input as Record<string, unknown>;
  const allowed = [
    "roleTerms",
    "requiredTerms",
    "excludeTerms",
    "location",
    "salaryFloorHkd",
    "autoShortlist",
    "expectedVersion",
  ];
  if (Object.keys(data).some((key) => !allowed.includes(key)))
    throw new BadRequestException("Unknown criteria field.");
  const list = (key: string, min = 0) => {
    const value = data[key];
    if (
      !Array.isArray(value) ||
      value.length < min ||
      value.length > 30 ||
      value.some((x) => typeof x !== "string" || !x.trim() || x.length > 100)
    )
      throw new BadRequestException(`Check ${key}.`);
    return [...new Set((value as string[]).map((x) => x.trim()))];
  };
  if (data.location !== "hk-or-global" && data.location !== "any")
    throw new BadRequestException("Choose a location rule.");
  if (
    data.salaryFloorHkd !== null &&
    (!Number.isInteger(data.salaryFloorHkd) ||
      Number(data.salaryFloorHkd) < 0 ||
      Number(data.salaryFloorHkd) > 1000000)
  )
    throw new BadRequestException(
      "Salary floor must be monthly HKD, or left blank.",
    );
  if (
    typeof data.autoShortlist !== "boolean" ||
    !Number.isInteger(data.expectedVersion) ||
    Number(data.expectedVersion) < 0
  )
    throw new BadRequestException(
      "Invalid criteria version or automation setting.",
    );
  return {
    roleTerms: list("roleTerms", 1),
    requiredTerms: list("requiredTerms"),
    excludeTerms: list("excludeTerms"),
    location: data.location,
    salaryFloorHkd: data.salaryFloorHkd as number | null,
    autoShortlist: data.autoShortlist,
    expectedVersion: Number(data.expectedVersion),
  };
}
