# Project context for Claude

SSR micro-frontend platform. A shell owns the document; each MFE is a separate
service rendering HTML fragments. Built and verified end-to-end — treat it as
working, not exploratory.

**Read first:** `mfe-ssr-decision-record.md` (why it is built this way, every
path tested and rejected) and `render-and-hydration-flow.md` (how a request
actually flows). This file is the operational layer: landmines and conventions.

---

## Layout

| Directory | What | Stack |
| --- | --- | --- |
| `ssr-shell-rt/` | The shell. Owns the document and URL space. | React Router **framework mode** + rsbuild |
| `ssr-mfe/` | MFE1. Renders fragments, serves them over HTTP. | React Router **library mode** + plain Node server |

An earlier `ssr-shell/` (TanStack Start, in-process federation) was deleted.
Older notes still reference it; §2.4 of the decision record has everything that
was learned from it.

## Running

Node **≥ 22.22** — both projects pin `24.21.0` in `.nvmrc`. The machine default
is Node 18, which Rspack rejects outright. Always `nvm use` first.

```sh
cd ssr-mfe      && nvm use && npm run dev   # :3001 browser build, :3002 fragment server
cd ssr-shell-rt && nvm use && npm run dev   # :3000
```

Start the MFE first — the shell fetches its fragment at request time (though it
degrades gracefully if absent).

---

## Landmines

Each of these cost real time. None are obvious from the symptom.

### Build / Module Federation

- **`experiments: { asyncStartup: true }` goes on the Module Federation plugin**,
  not rsbuild's top-level `experiments`. It creates the async boundary shared
  consumption needs. Without it the browser dies at startup with
  `RUNTIME-006: Invalid loadShareSync`. This one produced three wrong diagnoses
  before being found — the error names neither the option nor the config object.
  **Both projects need it.** The MFE went without for a while because the shell
  reaches it through `loadRemote` (already async); only the standalone page at
  :3001, which imports `clientEntry` synchronously, exposed it.
- **Never set `pluginReactRouter({ federation: false })`.** It reads like a
  build-output switch; it is startup wiring for MF. Turning it off breaks the
  browser before the app boots.
- **`federation: true` copies the whole server build into `build/client/static`.**
  Served as a static origin that publishes the shell's server bundle.
  `scripts/strip-server-copy.mjs` removes it after every build and fails if any
  file in `build/client` still hashes to `build/server/index.js`. Keep that check
  across plugin upgrades.
- **Don't declare `remotes` in the build config.** It bakes the URL into the
  bundle, so one build can't serve several environments. Remotes are registered
  at runtime from the registry the root route serialises into the document
  (`app/mfeRegistry.ts`).
- **`NODE_OPTIONS=--experimental-vm-modules`** is required by *rsbuild's dev
  runner* for ESM server bundles — not by Module Federation, despite appearances.
  Already in the shell's npm scripts.

### Rendering

- **Never put the MFE's `html` into loader data.** The framework serialises all
  loader data into the page, so the fragment would ship twice. A token goes
  through `app/mfeHtmlStore.ts` instead; the markup is looked up server-side only.
- **`#mfe1-root` is not React's territory.** The shell renders it with
  `suppressHydrationWarning` and an empty `__html` on the client, so React leaves
  the server markup alone for `clientEntry` to hydrate. Verified working — don't
  "tidy" it.
- **React Router 8 renamed the `meta` argument** from `data` to `loaderData`.
  Route modules now type their args from `./+types/<route>` (`Route.LoaderArgs`,
  `Route.MetaArgs`), generated into `.react-router/types` and wired up by
  `rootDirs` in `tsconfig.json`. A rename like that is a compile error now.
  Use the generated types in any new route module rather than restating shapes.

### Types

The federation contract is **hand-declared** in `app/routes/mfe1.tsx`, both
halves. MF can generate the browser half, but only with a build-time `remotes`
declaration — which reintroduces the baked-URL problem. Revisit only if the
contract or MFE count grows.

### Dead ends — do not re-attempt

- **TanStack Router for an MFE.** Renders an empty string server-side. Its SSR
  bootstrap is annotated `Framework-only` and expects TanStack Start to drive it.
  Behind that sits the `$_TSR` global collision. See appendix §10.
- **TanStack Start for an MFE.** Emits whole documents, no fragment contract.
- **Vite instead of rsbuild.** `@module-federation/vite` is CSR-oriented with
  documented SSR incompatibilities.
- **`eager: true` on shared deps** to fix `RUNTIME-006`. Pushes the failure one
  layer down into `Cannot read properties of undefined (reading 'consumes')`.
  The real fix is `asyncStartup` on the MF plugin.

---

## Process hygiene

- **Never `pkill -f "rsbuild dev"`** — it matches the shell *and* the MFE. Kill
  by port instead, **listeners only**: `lsof -ti:3000 -sTCP:LISTEN | xargs kill -9`.
  Without `-sTCP:LISTEN`, `lsof -i:PORT` also returns the *clients* connected to
  that port — i.e. the browser. `lsof -ti:3000 | xargs kill -9` kills Chrome.
- `@module-federation/dts-plugin` leaks a `fork-dev-worker.js` per dev session
  and never reaps it. They accumulate into dozens over a long session. Sweep with
  a path-scoped `ps aux | grep <project path>`.
- The repo root is a git repository now. It was not for most of the build —
  a directory was lost once that way and had to be reconstructed from
  conversation history. Still confirm before anything destructive; the owner
  handles commits themselves.

---

## How this project's owner works

- **Wants minimal configuration.** Anything whose justification disappears gets
  deleted, not commented out. Four things were removed this way —
  `remotes`, `dts`, an `externals` workaround, and an `unhandledRejection` guard.
  Propose removal when a reason evaporates.
- **Verify, don't assert.** Claims about library behaviour get checked against
  `node_modules` source or a running process. "The docs say" is not evidence, and
  neither is "the code is present in the bundle" — a static check gave false
  confidence about `federation: false` and a browser caught it immediately.
- **Brief answers.** Direct, no preamble. Explanations in plain words, with the
  repo's own code as the example.
- **Push back with evidence.** They will question a recommendation; a wrong one
  held on vibes gets found out. Say plainly what was tested versus reasoned.

---

## Open items

1. **Version skew on deploy** — the fragment server and browser bundle can drift
   apart mid-deploy. No strategy yet. Candidate: have the fragment response carry
   the matching client bundle's version.
2. **Request context is minimal** — only `headers` crosses. Locale, user, tenant
   and flags will need an explicit versioned slot; keep it small.
3. **`validate:mfe` unbuilt** — should cover no mutable module-scope state (a
   concurrency smoke test catches the realistic cases), no global mutation, SSR
   safety, pinned versions.
4. **Shell bundler** — rsbuild is a deliberate choice now, not an inherited
   constraint. §2.7 of the decision record lists the three rspack-model fixes
   `federation: true` performs and what a Vite move would leave untested. Don't
   reopen it without a concrete problem to solve.
