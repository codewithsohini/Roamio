import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // The backend URL for the dev proxy. Falls back to localhost:8080.
  const apiTarget = env.VITE_API_BASE_URL || "http://localhost:8080";

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },

    server: {
      host: "0.0.0.0",
      port: 5173,
    },

    preview: {
      host: "0.0.0.0",
      port: 4173,
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});