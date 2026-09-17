import { registerRemotes } from '@module-federation/enhanced/runtime'

let registered = false

/**
 * Registers MFE browser containers with the Module Federation runtime.
 *
 * Replaces declaring `remotes` in rsbuild.config.ts, which compiled each
 * container's URL into the bundle — so pointing the shell at a different
 * environment, or adding an MFE, meant rebuilding it. Resolving at runtime
 * keeps one build valid everywhere.
 *
 * Called from `Root`'s render body, not an effect: React runs child effects
 * before parent ones, so an effect here would land *after* a route tried to
 * load its remote. Render is top-down, so this is comfortably earlier.
 *
 * Idempotent, and a no-op on the server — there is no browser federation
 * there; MFEs are server-rendered over HTTP instead.
 */
export function registerMfeRemotes(registry: Record<string, string>) {
  if (registered || typeof window === 'undefined') return
  registered = true

  registerRemotes(
    Object.entries(registry).map(([name, entry]) => ({ name, entry })),
  )
}
