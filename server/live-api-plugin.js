import { voiceToken } from "./voice-api.js";
import {
  recordedDiscoveryOverview,
  recordedDiscoveryResults,
  refreshRecordedDiscovery,
  saveRecordedDiscoverySettings,
} from "./recorded-discovery.js";
export function careerApiBridge() {
  return {
    name: "fictional-demo-only-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const u = new URL(req.url, "http://localhost");
        if (
          !u.pathname.startsWith("/career-api") &&
          !u.pathname.startsWith("/api/voice")
        )
          return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        const path = u.pathname.replace("/career-api", "");
        if (u.pathname === "/api/voice/token") {
          void voiceToken(req, res);
          return;
        }
        if (
          u.pathname.startsWith("/api/voice") ||
          path === "/assistant/messages"
        ) {
          res.statusCode = 503;
          res.end(
            JSON.stringify({
              message:
                "The general reasoning provider is not connected in this demo. Start a profile call to speak with the voice agent. No application data was changed.",
            }),
          );
          return;
        }
        if (req.method === "GET" && path === "/discovery") {
          res.end(JSON.stringify(recordedDiscoveryOverview()));
          return;
        }
        if (req.method === "POST" && path === "/discovery/scans") {
          res.end(JSON.stringify(refreshRecordedDiscovery()));
          return;
        }
        const match = path.match(
          /^\/discovery\/scans\/([a-z0-9-]+)\/results$/i,
        );
        if (req.method === "GET" && match) {
          res.end(
            JSON.stringify(
              recordedDiscoveryResults(
                match[1],
                u.searchParams.get("verdict") || "match",
                Number(u.searchParams.get("offset") || 0),
              ) || { items: [], total: 0 },
            ),
          );
          return;
        }
        if (req.method === "PUT" && path === "/discovery/settings") {
          let text = "";
          req.on("data", (x) => (text += x));
          req.on("end", () => {
            try {
              res.end(
                JSON.stringify(saveRecordedDiscoverySettings(JSON.parse(text))),
              );
            } catch {
              res.statusCode = 400;
              res.end("{}");
            }
          });
          return;
        }
        res.statusCode = 404;
        res.end(
          JSON.stringify({
            message: "External sources are disabled in this fictional demo.",
          }),
        );
      });
    },
  };
}
