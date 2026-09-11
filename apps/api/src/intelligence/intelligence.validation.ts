import { BadRequestException } from "@nestjs/common";
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BadRequestException("Request body must be an object.");
  return value as Record<string, unknown>;
}

export function only(value: Record<string, unknown>, fields: string[]) {
  if (Object.keys(value).some((key) => !fields.includes(key)))
    throw new BadRequestException("Request contains an unsupported field.");
}

export function text(
  value: unknown,
  label: string,
  maximum: number,
  minimum = 1,
): string {
  if (typeof value !== "string")
    throw new BadRequestException(`${label} must be text.`);
  const result = value.trim();
  if (result.length < minimum || result.length > maximum)
    throw new BadRequestException(
      `${label} must be between ${minimum} and ${maximum} characters.`,
    );
  return result;
}

export function id(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException("Invalid memory ID.");
  return value;
}

export function optionalQuery(value: unknown, label: string, maximum: number) {
  if (value === undefined) return undefined;
  return text(value, label, maximum);
}

export function expiry(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const result = text(value, "Expiry", 50);
  if (
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    throw new BadRequestException(
      "Expiry must be an ISO timestamp with a timezone.",
    );
  if (Date.parse(result) <= Date.now())
    throw new BadRequestException("Expiry must be in the future.");
  return new Date(result).toISOString();
}
