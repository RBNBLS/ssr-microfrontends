// Process-level safety net for the shell's server. Shell-wide concern, not a
// per-MFE one — installed once at boot from `root.tsx`, so adding mfe2/mfe3
// requires nothing here.
//
// Originally added because in-process Module Federation leaked an unhandled
// rejection that killed the shell whenever a remote was unreachable. MFEs now
// run behind HTTP, so that specific hazard is gone — a failed fetch is an
// ordinary rejected promise caught at the call site.
//
// Kept deliberately: a web server should not die from a stray rejection
// anywhere in the process. If you add error reporting later, this is the hook.

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
