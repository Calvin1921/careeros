import { BadRequestException } from "@nestjs/common";
export function parseSettings(body: unknown) {
  const value = body as { sources?: unknown; scheduleTimes?: unknown };
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).some((k) => !["sources", "scheduleTimes"].includes(k))
  )
    throw new BadRequestException("Invalid discovery settings.");
  if (
    !Array.isArray(value.sources) ||
    !value.sources.length ||
    value.sources.length > 20 ||
    value.sources.some(
      (x) => typeof x !== "string" || !/^[a-z0-9_-]{1,80}$/.test(x),
    )
  )
    throw new BadRequestException(
      "Choose 1–20 valid public Greenhouse board names.",
    );
  if (
    !Array.isArray(value.scheduleTimes) ||
    value.scheduleTimes.length > 4 ||
    value.scheduleTimes.some(
      (x) => typeof x !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x),
    )
  )
    throw new BadRequestException(
      "Choose up to four scan times in HH:MM format.",
    );
  return {
    sources: [...new Set(value.sources as string[])],
    scheduleTimes: [...new Set(value.scheduleTimes as string[])].sort(),
  };
}
