import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from 'vite-plugin-svgr';

installGlobals();

export default defineConfig({
  server: { port: 5174, strictPort: true },
  plugins: [remix(), tsconfigPaths(), svgr()],
});
