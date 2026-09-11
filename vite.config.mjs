import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { careerApiBridge } from "./server/live-api-plugin.js";
export default defineConfig({
  cacheDir: ".vite-cache",
  build: { outDir: "dist/client" },
  server: { host: "127.0.0.1", port: 3002, strictPort: true },
  plugins: [react(), careerApiBridge()],
});
