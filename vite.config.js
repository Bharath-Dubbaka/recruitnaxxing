import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";

// Copy manifest and icons after build
const copyFiles = () => {
   return {
      name: "copy-files",
      closeBundle: () => {
         // Copy manifest
         fs.copyFileSync("manifest.json", "dist/manifest.json");

         // Copy icon
         fs.copyFileSync("public/icon.png", "dist/icon.png");
      },
   };
};

export default defineConfig({
   plugins: [react(), copyFiles()],
   build: {
      outDir: "dist",
      rollupOptions: {
         input: {
            main: resolve(__dirname, "index.html"),
            background: resolve(__dirname, "src/background.js"),
         },
         output: {
            entryFileNames: "[name].js",
            chunkFileNames: "[name].[hash].js",
            assetFileNames: "assets/[name][extname]",
         },
      },
      cssCodeSplit: false,
   },
   css: {
      postcss: "./postcss.config.js",
   },
});
