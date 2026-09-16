// Process-level safety net for the shell's server. Shell-wide concern, not a
// per-MFE one — installed once at boot from `root.tsx`, so adding mfe2/mfe3
// requires nothing here.
//
// Why it is needed: catching federation failures at the call site is NOT
// sufficient. When a remote is unreachable, `@module-federation/runtime-core`'s
// SnapshotHandler rejects an internal floating promise *in addition to* the one
// we await, and Node terminates the process on an unhandled rejection.
// Verified: with an MFE's SSR server down, the request degraded correctly to
// CSR and the shell process still exited seconds later.
//
// A web server must not die because one fragment's remote was unreachable.
// If you add error reporting later, this is the hook for it.

let installed = false

export function installServerGuards() {
  // No-op in the browser: `root.tsx` is universal, this module is server-only
  // in intent.
  if (installed || typeof process === 'undefined' || !process?.on) return
  installed = true

  process.on('unhandledRejection', (reason) => {
    console.error('[shell] unhandled rejection (kept alive):', reason)
  })
}
