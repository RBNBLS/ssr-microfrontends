import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginReactRouter } from 'rsbuild-plugin-react-router'
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin'

// Same singletons as the MFE. Non-eager, per the RR plugin's federation docs.
const shared = {
  react: { singleton: true, requiredVersion: '^19.2.3' },
  'react-dom': { singleton: true, requiredVersion: '^19.2.3' },
  'react-router': { singleton: true, requiredVersion: '^8.4.0' },
}

const mf = {
  name: 'shell',
  shared,
  experiments: { asyncStartup: true },
  // We hand-write the federation contract in app/mfe1.d.ts, so MF's type
  // generation buys nothing — and its background watcher fetches remote
  // manifests outside the request path, where an unhandled rejection kills
  // the dev process if an MFE is unreachable. Verified: with :3002 down the
  // route degraded correctly, then the DTS watcher exited the server anyway.
  dts: false,
}

export default defineConfig({
  server: { port: 3000 },
  experiments: {
    // Required for federation per the plugin's docs.
    asyncStartup: true,
  },
  plugins: [
    pluginReactRouter({ federation: true }),
    pluginReact(),
    pluginModuleFederation(
      { ...mf, remotes: { mfe1: 'mfe1@http://localhost:3001/mf-manifest.json' } },
      { target: 'web', environment: 'web' },
    ),
    pluginModuleFederation(
      {
        name: 'shell',
        experiments: { asyncStartup: true },
        dts: false,
        // NOTE: `shared` is deliberately omitted here. With react-router
        // shared on the server, React Router's server entry consumes it
        // before the share scope is ready and the build dies with
        // `__webpack_modules__[moduleId] is not a function`. Harmless: the
        // server boundary is a serialized string, so instance identity does
        // not matter. Client-side sharing (above) is unaffected.
        remotes: { mfe1: 'mfe1@http://localhost:3002/mf-manifest.json' },
      },
      { target: 'node', environment: 'node' },
    ),
  ],
})
