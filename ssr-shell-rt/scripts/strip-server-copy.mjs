// Removes the server bundle that rsbuild-plugin-react-router copies into the
// client output, and fails the build if any of it survives.
//
// Why this exists: with `federation: true` the plugin runs
//   copySync(build/server, build/client/static)
// (see its dist/index.js, guarded on `pluginOptions.federation && ssr`). That
// publishes the shell's entire server bundle — including server-only config —
// to anything serving build/client as a static origin. Verified: the copied
// file is byte-identical to build/server/index.js and fetchable over HTTP.
//
// The flag can't simply be turned off: it also wires Module Federation's
// startup, and disabling it breaks the browser before the app boots. So the
// copy is removed after the fact instead.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const clientDir = 'build/client'
const serverEntry = 'build/server/index.js'

// What the plugin copies: build/server/* → build/client/static/*
for (const leaked of [
  join(clientDir, 'static/index.js'),
  join(clientDir, 'static/package.json'),
  join(clientDir, 'static/static'),
]) {
  if (existsSync(leaked)) {
    rmSync(leaked, { recursive: true, force: true })
    console.log(`[strip-server-copy] removed ${leaked}`)
  }
}

// Belt and braces: if the plugin ever changes what it copies, catch it here
// rather than in production.
if (existsSync(serverEntry)) {
  const serverHash = createHash('sha256')
    .update(readFileSync(serverEntry))
    .digest('hex')

  const offenders = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (
        createHash('sha256').update(readFileSync(full)).digest('hex') ===
        serverHash
      ) {
        offenders.push(full)
      }
    }
  }
  if (existsSync(clientDir)) walk(clientDir)

  if (offenders.length > 0) {
    console.error(
      `[strip-server-copy] server bundle still present in ${clientDir}:\n  ${offenders.join('\n  ')}`,
    )
    process.exit(1)
  }
}

console.log('[strip-server-copy] client output clean')
