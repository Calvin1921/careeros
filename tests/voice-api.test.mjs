import test from "node:test";
import assert from "node:assert/strict";
import { voiceToken } from "../server/voice-api.js";
import { mergeConversationHistories } from "../src/lib/career-conversation.js";
const request = {
  method: "POST",
  headers: {
    origin: "http://127.0.0.1:3002",
    "x-careeros-action": "voice-call",
  },
};
function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(v) {
      this.body = JSON.parse(v);
    },
  };
}
test("token endpoint rejects foreign origins and missing action headers before contacting provider", async () => {
  for (const req of [
    { ...request, method: "GET" },
    { ...request, headers: {} },
    {
      ...request,
      headers: { ...request.headers, origin: "https://example.com" },
    },
  ]) {
    const res = response();
    await voiceToken(req, res, {
      fetchImpl: () => {
        assert.fail("must not contact provider");
      },
    });
    assert.equal(res.statusCode, 403);
  }
});
test("missing provider configuration fails without changing profile or exposing credentials", async () => {
  const res = response();
  await voiceToken(request, res, { env: {} });
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers["Cache-Control"], "no-store");
});
test("provider errors are generic and successful response exposes only the session token", async () => {
  const env = {
    ELEVENLABS_API_KEY: "test-only-placeholder",
    ELEVENLABS_DEMO_AGENT_ID: "test-agent",
  };
  const res = response();
  await voiceToken(request, res, {
    env,
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({ detail: "private upstream details" }),
    }),
  });
  assert.equal(res.statusCode, 502);
  assert.ok(!JSON.stringify(res.body).includes("private upstream"));
  const ok = response();
  await voiceToken(request, ok, {
    env,
    fetchImpl: async (url, options) => {
      assert.equal(url.hostname, "api.elevenlabs.io");
      assert.equal(options.headers["xi-api-key"], env.ELEVENLABS_API_KEY);
      return {
        ok: true,
        json: async () => ({ token: "test-session", extra: "not returned" }),
      };
    },
  });
  assert.deepEqual(ok.body, { token: "test-session" });
});
test("identical replies in distinct turns survive history reload", () => {
  const a = { id: "turn-1", role: "user", text: "Yes" },
    b = { ...a, id: "turn-2" };
  assert.equal(mergeConversationHistories([[a, b], [a]]).length, 2);
});
