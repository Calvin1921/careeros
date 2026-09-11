import type { NextRequest } from "next/server";

const id = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const routes: Array<[string, RegExp]> = [
  ["GET", /^profile\/conversation-facts$/],
  ["PUT", /^profile\/conversation-facts$/],
  ["GET", /^health$/],
  ["GET", new RegExp(`^jobs/${id}/preparation$`, "i")],
  ["POST", new RegExp(`^jobs/${id}/preparation/requirements$`, "i")],
  [
    "PUT",
    new RegExp(
      `^jobs/${id}/preparation/requirements/requirement-[1-9][0-9]*-[0-9a-f]+$`,
      "i",
    ),
  ],
  [
    "POST",
    new RegExp(
      `^jobs/${id}/preparation/requirements/requirement-[1-9][0-9]*-[0-9a-f]+/tasks$`,
      "i",
    ),
  ],
  ["GET", /^discovery$/],
  ["GET", new RegExp(`^discovery/scans/${id}/results$`, "i")],
  ["POST", /^(discovery\/scans|profile\/extract)$/],
  ["PUT", /^discovery\/settings$/],
  ["GET", /^matching\/(criteria|results|history)$/],
  ["PUT", /^matching\/criteria$/],
  ["POST", /^matching\/process$/],
  [
    "GET",
    /^(jobs|analytics|capabilities|profile|workspace\/overview|intelligence\/(memory|analytics))$/,
  ],
  [
    "POST",
    /^(jobs|capabilities|evidence|pipeline\/imports|profile\/(imports|experiences|versions)|learning-milestones|intelligence\/memory)$/,
  ],
  ["PATCH", /^profile$/],
  [
    "GET",
    new RegExp(`^(jobs/${id}(?:/pipeline)?|profile/imports/${id})$`, "i"),
  ],
  ["POST", new RegExp(`^jobs/${id}/(?:artifacts|decisions)$`, "i")],
  [
    "PATCH",
    new RegExp(
      `^(jobs/${id}/(?:stage|stage-correction|decisions/${id})|profile/experiences/${id}|(?:capabilities|evidence|learning-milestones)/${id}|intelligence/memory/${id}/(?:confirm|correct))$`,
      "i",
    ),
  ],
  ["DELETE", new RegExp(`^intelligence/memory/${id}$`, "i")],
];

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (
    !routes.some(
      ([method, pattern]) => method === request.method && pattern.test(path),
    )
  )
    return Response.json({ message: "Not found" }, { status: 404 });
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const publicOrigin = process.env.WEB_ORIGIN ?? request.nextUrl.origin;
    if (
      (origin && origin !== publicOrigin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return Response.json(
        { message: "Cross-origin changes are not allowed." },
        { status: 403 },
      );
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      return Response.json(
        { message: "Send changes as application/json." },
        { status: 415 },
      );
  }
  try {
    const response = await fetch(
      (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000") +
        "/" +
        path +
        request.nextUrl.search,
      {
        method: request.method,
        headers: { "content-type": "application/json" },
        body: ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)
          ? (await request.text()) || undefined
          : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      },
    );
    const headers = new Headers({
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    for (const name of ["content-type", "content-disposition"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(
      response.status === 204 ? null : await response.arrayBuffer(),
      { status: response.status, headers },
    );
  } catch {
    return Response.json(
      {
        message:
          "CareerOS could not reach the service. Check that the local services are running.",
      },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

export const PUT = proxy;
