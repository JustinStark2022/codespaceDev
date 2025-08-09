// client/vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // Load env vars (supports .env, .env.local, etc. in the client folder)
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_TARGET || "http://localhost:3001";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      host: true,         // allow LAN access (shows Network URLs)
      port: 5173,
      strictPort: true,
      proxy: {
        // API -> backend
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        // Static files served by backend (optional—remove if unused)
        "/uploads": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        // Socket.io / websockets (optional—keeps things future-proof)
        "/socket.io": {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 5173,
    },
    // Optional: speed up optimize step for common libs you use
    // optimizeDeps: {
    //   include: ["react", "react-dom", "@tanstack/react-query", "wouter"],
    // },
  };
});
