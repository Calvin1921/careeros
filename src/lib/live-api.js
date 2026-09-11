export async function readApi(path, options = {}) {
  const response = await fetch("/career-api" + path, {
    ...options,
    signal: options.signal,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The preview service returned an unreadable response.");
  }
  if (!response.ok)
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "The request could not be completed.",
    );
  return data;
}
export function safeEmployerUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
