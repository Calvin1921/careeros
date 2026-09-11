// API credentials remain in the local server process, never in the browser bundle.
export async function voiceToken(
  req,
  res,
  { env = process.env, fetchImpl = fetch } = {},
) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  const origin = req.headers.origin;
  if (
    req.method !== "POST" ||
    req.headers["x-careeros-action"] !== "voice-call" ||
    (origin && !/^http:\/\/(127\.0\.0\.1|localhost):3002$/.test(origin))
  ) {
    res.statusCode = 403;
    res.end(JSON.stringify({ message: "Start the call from CareerOS." }));
    return;
  }
  const apiKey = env.ELEVENLABS_API_KEY,
    agentId = env.ELEVENLABS_DEMO_AGENT_ID;
  if (!apiKey || !agentId) {
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        message:
          "ElevenLabs voice is not configured. Your profile has not changed.",
      }),
    );
    return;
  }
  try {
    const url = new URL(
      "https://api.elevenlabs.io/v1/convai/conversation/token",
    );
    url.searchParams.set("agent_id", agentId);
    const response = await fetchImpl(url, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    if (!response.ok || !body.token) throw new Error("provider");
    res.end(JSON.stringify({ token: body.token }));
  } catch {
    res.statusCode = 502;
    res.end(
      JSON.stringify({
        message:
          "The voice service could not connect. Please try again. Your profile has not changed.",
      }),
    );
  }
}
