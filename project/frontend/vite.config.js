// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  define: {
    // Required for @solana/web3.js and wallet-adapter in browser
    "process.env": {},
    global: "globalThis",
  },

  optimizeDeps: {
    include: [
      "@solana/web3.js",
      "@solana/wallet-adapter-base",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-react-ui",
      "@solana/wallet-adapter-phantom",
    ],
    esbuildOptions: {
      target: "esnext",
    },
  },

  build: {
    target: "esnext",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
