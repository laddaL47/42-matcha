import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // Socket.IO path is configured to /ws on backend
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
});
