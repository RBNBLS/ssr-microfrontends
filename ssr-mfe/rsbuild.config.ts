import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

// Runtime dependencies that must stay singleton across shell + MFEs
// (architecture doc, "Mandatory Rules for MFE Teams" #5).
const shared = {
  react: { singleton: true, requiredVersion: '^19.3.0' },
  'react-dom': { singleton: true, requiredVersion: '^19.3.0' },
  'react-router': { singleton: true, requiredVersion: '^8.4.0' },
};

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  server: {
    port: 3001,
  },
  environments: {
    // Browser build — exposes `clientEntry`, consumed by the shell's browser bundle.
    web: {
      source: {
        entry: { index: './src/index.tsx' },
      },
      output: {
        target: 'web',
      },
    },
    // Node build — exposes `serverEntry`, consumed in-process by the shell's Start server.
    // rsbuild's dev server only serves the `web` environment's assets over HTTP, so this
    // environment writes to disk continuously and is served separately (see scripts/serve-node.mjs).
    node: {
      source: {
        entry: { index: './src/serverEntry.tsx' },
      },
      output: {
        target: 'node',
        distPath: { root: 'node' },
        // The manifest bakes this in as its `publicPath`, and the shell's
        // federation runtime fetches the remote entry from it. Without this
        // it inherits the project-wide dev server origin (:3001) and the
        // shell tries to load the node bundle from the web server.
        assetPrefix: 'http://localhost:3002/',
      },
      dev: {
        writeToDisk: true,
        // In dev, `dev.assetPrefix` wins over `output.assetPrefix` — without
        // it rsbuild uses the dev server origin (:3001) for this build too.
        assetPrefix: 'http://localhost:3002/',
      },
    },
  },
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginTailwindcss(),
    pluginModuleFederation(
      {
        name: 'mfe1',
        exposes: { './clientEntry': './src/clientEntry.tsx' },
        shared,
      },
      { target: 'web' },
    ),
    pluginModuleFederation(
      {
        name: 'mfe1',
        exposes: { './serverEntry': './src/serverEntry.tsx' },
        shared,
      },
      { target: 'node' },
    ),
  ],
});
