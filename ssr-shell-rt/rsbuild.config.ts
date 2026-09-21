import { fileURLToPath } from "node:url";
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginReactRouter } from "rsbuild-plugin-react-router";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";

const shared = {
  react: { singleton: true, requiredVersion: "^19.2.3" },
  "react-dom": { singleton: true, requiredVersion: "^19.2.3" },
  "react-router": { singleton: true, requiredVersion: "^8.4.0" },
};

export default defineConfig({
  server: { port: 3000, strictPort: true },
  tools: {
    rspack(config, { rspack, isDev }) {
      if (!isDev) return;
      config.plugins.push(
        new rspack.NormalModuleReplacementPlugin(
          /[\\/]react-refresh[\\/]runtime\.js$/,
          fileURLToPath(
            new URL("./scripts/react-refresh-singleton.cjs", import.meta.url),
          ),
        ),
      );
    },
  },
  plugins: [
    pluginReactRouter({ federation: true }),
    pluginReact(),
    pluginModuleFederation(
      {
        name: "shell",
        shared,
        // Belongs on the *Module Federation plugin*, not rsbuild's top-level
        // `experiments` — this is what wraps the entry in the async boundary
        // that shared consumption needs. `root.tsx` imports react-router at
        // module scope, so without it the browser throws
        // `RUNTIME-006: loadShareSync` before the app boots.
        experiments: { asyncStartup: true },
      },
      { target: "web", environment: "web" },
    ),
  ],
});
