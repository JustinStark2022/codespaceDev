import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Explicitly load .env.client from the root directory
  const env = loadEnv(mode, process.cwd(), ".env.client");

  return {
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      hmr: {
        host: "localhost",
        port: 5173,
      },
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:3001", // Updated: Use port 3001 as default
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, _res) => {
              console.log("proxy error", err);
            });
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Origin", env.VITE_FRONTEND_URL || "http://localhost:5173");
            });
          },
        },
      },
    },
    build: {
      outDir: path.resolve(__dirname, "dist"), // Output frontend build files to the "dist" directory
      emptyOutDir: true, // Clear the output directory before building
      sourcemap: mode === "development", // Generate sourcemaps in development mode
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("react-dom")) {
                return "vendor";
              }
              if (id.includes("@radix-ui")) {
                return "ui";
              }
              return "vendor";
            }
          },
        },
      },
    },
    plugins: [react()], // Add React plugin for Vite
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"), // Alias for the "src" directory
      },
    },
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV), // Define environment-specific variables
    },
  };
});
