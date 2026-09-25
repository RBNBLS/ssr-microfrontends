import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";

// MFE2 — client-rendered only: a browser bundle and nothing else. No fragment
// server, no node environment; the shell mounts it through `clientEntry`
// exactly as it does MFE1, just never with server markup or loader data.
//
// Same singletons as every app on the page; see ssr-mfe/rsbuild.config.ts for
// why each entry is there (react-dom/client especially).
const shared = {
  react: { singleton: true, requiredVersion: "^19.3.0" },
  "react-dom": { singleton: true, requiredVersion: "^19.3.0" },
  "react-dom/client": { singleton: true, requiredVersion: "^19.3.0" },
  "react-router": { singleton: true, requiredVersion: "^8.4.0" },
  "react-intl": { requiredVersion: "^12.1.3" },
};

export default defineConfig({
  server: {
    port: 3003,
    strictPort: true,
    historyApiFallback: true,
  },
  // The standalone dev page; the shell loads `./clientEntry` instead.
  source: {
    entry: { index: "./src/index.tsx" },
  },
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginTailwindcss(),
    pluginModuleFederation({
      name: "mfe2",
      exposes: {
        "./clientEntry": "./src/clientEntry.tsx",
      },
      shared,
      experiments: { asyncStartup: true },
    }),
  ],
});
