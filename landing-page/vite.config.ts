import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    // 5173 is taken by the CRM frontend.
    port: 5174,
    // The API only allows its own domain in CORS, so the browser blocks calls from localhost.
    // In dev, the form calls /api/inscriptions on this server and Vite forwards it to the API.
    proxy: {
      "/api/inscriptions": { target: "https://istepm-agadir.eiden-group.com", changeOrigin: true },
    },
  },
});
