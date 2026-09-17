import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginReactRouter } from 'rsbuild-plugin-react-router'
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin'

// Same singletons as the MFE, so the page carries one React and one router.
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
    pluginReactRouter({ federation: false }),
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
    //     source, so the contract is declared by hand in app/mfeContract.ts.
    //     For a two-function contract that is less machinery than the config
    //     it replaces; revisit if the contract or MFE count grows.
    pluginModuleFederation(
      {
        name: 'shell',
        shared,
      },
      { target: 'web', environment: 'web' },
    ),
  ],
})
