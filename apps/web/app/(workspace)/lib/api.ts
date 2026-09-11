export async function api<T = unknown>(
  path: string,
  method = "GET",
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    method,
    headers: { "content-type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
    signal,
  });
  const text = await response.text();
  let value: unknown;
  try {
    value = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      response.ok
        ? "The service returned an unreadable response."
        : `The service could not complete the request (${response.status}). Please try again.`,
    );
  }
  if (!response.ok) {
    const message =
      value && typeof value === "object" && "message" in value
        ? (value as { message: unknown }).message
        : undefined;
    throw new Error(
      typeof message === "string"
        ? message
        : "Something went wrong. Please try again.",
    );
  }
  return value as T;
}
