import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild'
import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin'

// Must match the MFE's shared config (architecture doc, rule #5).
const shared = {
  react: { singleton: true, requiredVersion: '^19.2.3' },
  'react-dom': { singleton: true, requiredVersion: '^19.2.3' },
  '@tanstack/react-router': { singleton: true, requiredVersion: '^1.170.36' },
}

export default defineConfig({
  server: {
    port: 3000,
  },
  environments: {
    // Server-side federation host — deliberately a SEPARATE compilation from
    // TanStack Start's own "ssr" environment.
    //
    // `@module-federation/rsbuild-plugin` rewrites whatever environment it
    // attaches to with `target: 'async-node'` + `output.chunkLoading:
    // 'async-node'` (its `patchNodeConfig`). Start's server bundle needs the
    // default node/`require` chunk loading for its own `loadEntries()`, so
    // attaching federation directly to "ssr" breaks every route with
    // `__webpack_modules__[moduleId] is not a function`. Giving federation
    // its own environment keeps both chunk-loading strategies intact.
    //
    // Start's server `require()`s this bundle's output at runtime — see
    // src/routes/mfe1.$.tsx.
    mfHost: {
      source: {
        entry: { index: './src/federation/serverHost.ts' },
      },
      output: {
        target: 'node',
        distPath: { root: 'dist/mf-host' },
        // This package is "type": "module", so Node would read the emitted
        // .js as ESM and choke on the CommonJS bundle the federation plugin
        // produces. A `{"type":"commonjs"}` package.json in the output dir
        // marks the whole directory CJS — including federation's own chunks,
        // which a per-file .cjs rename would miss.
        copy: [
          { from: './src/federation/mf-host-package.json', to: 'package.json' },
        ],
      },
      dev: {
        // Must exist on disk for the runtime require() above.
        writeToDisk: true,
      },
    },
  },
  plugins: [
    pluginTailwindcss(),
    pluginReact(),
    tanstackStart({
      srcDirectory: 'src',
    }),
    // Browser host: consumes MFE1's `clientEntry`. TanStack Start's rsbuild
    // plugin names its browser environment "client".
    pluginModuleFederation(
      {
        name: 'shell',
        remotes: { mfe1: 'mfe1@http://localhost:3001/mf-manifest.json' },
        shared,
      },
      { target: 'web', environment: 'client' },
    ),
    // Node host: consumes MFE1's `serverEntry`, in its own environment.
    pluginModuleFederation(
      {
        name: 'shell',
        remotes: { mfe1: 'mfe1@http://localhost:3002/mf-manifest.json' },
        shared,
      },
      { target: 'node', environment: 'mfHost' },
    ),
  ],
})
