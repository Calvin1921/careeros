import test from "node:test";
import assert from "node:assert/strict";
import {
  GET,
  POST,
  PATCH,
  DELETE,
  PUT,
} from "../apps/web/app/api/[...path]/route";
const job = "00000000-0000-4000-8000-000000000001";

test("preparation routes forward the allowed methods and retain write protections", async (t) => {
  const base = `jobs/${job}/preparation`;
  const requirement = `${base}/requirements/requirement-1-aabb11223344`;
  const calls: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: unknown, init?: RequestInit) => {
      calls.push(`${init?.method} ${String(url)}`);
      return Response.json({ saved: true });
    },
  );
  for (const [method, handler, path] of [
    ["GET", GET, base],
    ["POST", POST, `${base}/requirements`],
    ["PUT", PUT, requirement],
    ["POST", POST, `${requirement}/tasks`],
  ] as const) {
    const response = await handler(
      request(method, path, { "content-type": "application/json" }),
      context(path),
    );
    assert.equal(response.status, 200, `${method} ${path}`);
  }
  assert.equal(calls.length, 4);
  assert.equal(
    (
      await PUT(
        request("PUT", requirement, {
          "content-type": "application/json",
          origin: "https://outside.example",
        }),
        context(requirement),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await POST(
        request("POST", `${requirement}/tasks`, {
          "content-type": "text/plain",
        }),
        context(`${requirement}/tasks`),
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await DELETE(
        request("DELETE", requirement, { "content-type": "application/json" }),
        context(requirement),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await PUT(
        request("PUT", `${base}/requirements/arbitrary-command`, {
          "content-type": "application/json",
        }),
        context(`${base}/requirements/arbitrary-command`),
      )
    ).status,
    404,
  );
  assert.equal(calls.length, 4, "blocked operations never reach the API");
});
function request(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body = "{}",
) {
  return {
    method,
    headers: new Headers(headers),
    nextUrl: new URL(`http://localhost:3000/api/${path}`),
    text: async () => body,
  } as Parameters<typeof GET>[0];
}
function context(path: string) {
  return { params: Promise.resolve({ path: path.split("?")[0].split("/") }) };
}
test("proxy rejects cross-origin changes and text/plain JSON before upstream", async () => {
  const blocked = await POST(
    request("POST", "jobs", {
      origin: "https://attacker.example",
      "content-type": "application/json",
    }),
    context("jobs"),
  );
  assert.equal(blocked.status, 403);
  const plaintext = await POST(
    request("POST", "jobs", { "content-type": "text/plain" }),
    context("jobs"),
  );
  assert.equal(plaintext.status, 415);
  const crossSite = await DELETE(
    request("DELETE", `intelligence/memory/${job}`, {
      "content-type": "application/json",
      "sec-fetch-site": "cross-site",
    }),
    context(`intelligence/memory/${job}`),
  );
  assert.equal(crossSite.status, 403);
});
test("proxy restricts methods and routes", async () => {
  assert.equal(
    (await GET(request("GET", "private-admin"), context("private-admin")))
      .status,
    404,
  );
  assert.equal(
    (
      await PATCH(
        request("PATCH", "jobs", { "content-type": "application/json" }),
        context("jobs"),
      )
    ).status,
    404,
  );
});
test("proxy preserves query strings and binary response headers", async (t) => {
  const bytes = new Uint8Array([0, 128, 255, 65]);
  let upstream = "";
  t.mock.method(globalThis, "fetch", async (url: unknown) => {
    upstream = String(url);
    return new Response(bytes, {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": "attachment; filename=sample.bin",
      },
    });
  });
  const path = "intelligence/memory?scope=job%3Aone";
  const response = await GET(request("GET", path), context(path));
  assert.match(upstream, /memory\?scope=job%3Aone$/);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal(
    response.headers.get("content-disposition"),
    "attachment; filename=sample.bin",
  );
  assert.equal(
    response.headers.get("content-type"),
    "application/octet-stream",
  );
});
test("proxy sends scoped DELETE and accepts same-origin JSON", async (t) => {
  let method = "",
    url = "";
  t.mock.method(
    globalThis,
    "fetch",
    async (target: unknown, options?: RequestInit) => {
      url = String(target);
      method = options?.method || "";
      return Response.json({ deleted: true });
    },
  );
  const path = `intelligence/memory/${job}?scope=career-planning`;
  const response = await DELETE(
    request(
      "DELETE",
      path,
      { origin: "http://localhost:3000", "content-type": "application/json" },
      "",
    ),
    context(path),
  );
  assert.equal(response.status, 200);
  assert.equal(method, "DELETE");
  assert.match(url, /scope=career-planning$/);
});

test("proxy accepts configured public origin when container request origin differs", async (t) => {
  const previous = process.env.WEB_ORIGIN;
  process.env.WEB_ORIGIN = "http://localhost:3001";
  t.after(() => {
    if (previous === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = previous;
  });
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ id: "created" }),
  );
  const response = await POST(
    request("POST", "jobs", {
      origin: "http://localhost:3001",
      "content-type": "application/json",
    }),
    context("jobs"),
  );
  assert.equal(response.status, 200);
  const blocked = await POST(
    request("POST", "jobs", {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    }),
    context("jobs"),
  );
  assert.equal(blocked.status, 403);
});

test("matching criteria PUT is forwarded with JSON and cross-origin writes are rejected", async () => {
  const original = globalThis.fetch;
  try {
    let forwarded = false;
    globalThis.fetch = async (_url, init) => {
      assert.equal(init?.method, "PUT");
      assert.equal(init?.body, '{"expectedVersion":0}');
      forwarded = true;
      return Response.json({ version: 1 });
    };
    const response = await PUT(
      request(
        "PUT",
        "matching/criteria",
        { "content-type": "application/json" },
        '{"expectedVersion":0}',
      ),
      context("matching/criteria"),
    );
    assert.equal(response.status, 200);
    assert.equal(forwarded, true);
    assert.equal(
      (
        await PUT(
          request("PUT", "matching/criteria", {
            origin: "https://outside.example",
            "content-type": "application/json",
          }),
          context("matching/criteria"),
        )
      ).status,
      403,
    );
  } finally {
    globalThis.fetch = original;
  }
});
