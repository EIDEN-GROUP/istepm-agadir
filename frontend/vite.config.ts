import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 5173,
  },
  build: {
    // Dossier d'assets dédié : l'image de production sert AUSSI la landing
    // page (dossier /assets/) depuis la même racine nginx. Sans ceci, les
    // deux builds Vite écriraient dans /assets/ et pourraient se mélanger.
    assetsDir: "crm-assets",
  },
});
