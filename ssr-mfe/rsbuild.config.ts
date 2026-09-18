import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";

// Shared as singletons with the shell in the browser, so the page carries one
// copy of React and one router. Only relevant client-side: the server boundary
// is a serialized string, so instance identity never matters there.
const shared = {
  react: { singleton: true, requiredVersion: "^19.3.0" },
  "react-dom": { singleton: true, requiredVersion: "^19.3.0" },
  "react-router": { singleton: true, requiredVersion: "^8.4.0" },
};

export default defineConfig({
  server: {
    port: 3001,
    // Fail on a taken port rather than drift onto :3002 and shadow the
    // fragment server. (The shell does the same for :3000.)
    strictPort: true,
  },
  environments: {
    // Browser build: the federated `clientEntry` the shell hydrates with, plus
    // a standalone dev page so MFE devs can work without running the shell.
    web: {
      source: {
        entry: { index: "./src/index.tsx" },
      },
      output: {
        target: "web",
      },
    },
    // Fragment server: a plain Node service wrapping `serverEntry` over HTTP.
    // No Module Federation here — the shell fetches rendered HTML rather than
    // loading this MFE's code into its own process.
    node: {
      source: {
        entry: { index: "./src/server.ts" },
      },
      output: {
        target: "node",
        distPath: { root: "node" },
        // Emitted as ESM, matching this package's "type": "module", so plain
        // `node node/index.js` runs it with no interop shims.
      },
      dev: {
        // The server runs from disk, so dev builds must be written out.
        writeToDisk: true,
      },
    },
  },
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginTailwindcss(),
    // Browser federation only.
    pluginModuleFederation(
      {
        name: "mfe1",
        exposes: { "./clientEntry": "./src/clientEntry.tsx" },
        shared,
        experiments: { asyncStartup: true },
      },
      { target: "web" },
    ),
  ],
});
