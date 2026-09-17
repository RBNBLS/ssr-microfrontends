import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginReactRouter } from 'rsbuild-plugin-react-router'
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin'

// Same singletons as the MFE, so the page carries one React and one router.
//
// Kept NON-eager deliberately: `pluginReactRouter({ federation: true })`
// enforces the async startup boundary that shared consumption needs, and the
// plugin's docs specify non-eager shared alongside it. Turning that flag off
// breaks the browser at startup — first `RUNTIME-006: loadShareSync`, then
// `Cannot read properties of undefined (reading 'consumes')` once eager was
// added. The flag is startup wiring, not just a build-output switch.
const shared = {
  react: { singleton: true, requiredVersion: '^19.2.3' },
  'react-dom': { singleton: true, requiredVersion: '^19.2.3' },
  'react-router': { singleton: true, requiredVersion: '^8.4.0' },
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
    // Browser federation only — the server renders MFEs by fetching rendered
    // fragments over HTTP (app/routes/mfe1.tsx), so no MFE code is ever loaded
    // into the shell's process and there is no node-target federation.
    //
    // Deliberately no `remotes` and no `dts`:
    //   • A declared remote is compiled into the browser bundle as a
    //     pre-registration, not just used for type generation. That baked URL
    //     would ship to production and act as a silent fallback whenever the
    //     runtime registry was missing.
    //   • Containers are registered at runtime instead (app/mfeRegistry.ts),
    //     so this build is environment-independent and there is exactly one
    //     source of truth for where an MFE lives.
    //   • With no declared remote, MF's type generation has no build-time
    //     source, so the contract is declared by hand in app/routes/mfe1.tsx.
    //     For a two-function contract that is less machinery than the config
    //     it replaces; revisit if the contract or MFE count grows.
    pluginModuleFederation(
      {
        name: 'shell',
        shared,
        // Belongs on the *Module Federation plugin*, not rsbuild's top-level
        // `experiments` — this is what wraps the entry in the async boundary
        // that shared consumption needs. `root.tsx` imports react-router at
        // module scope, so without it the browser throws
        // `RUNTIME-006: loadShareSync` before the app boots.
        experiments: { asyncStartup: true },
      },
      { target: 'web', environment: 'web' },
    ),
  ],
})
