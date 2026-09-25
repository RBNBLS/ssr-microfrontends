# Project context for Claude

SSR micro-frontend platform. A shell owns the document; each MFE is a separate
service rendering HTML fragments. Built and verified end-to-end — treat it as
working, not exploratory.

**Read first:** `mfe-ssr-decision-record.md` (why it is built this way), `render-and-hydration-flow.md` (how a request
actually flows) and `ssr-or-csr-who-decides.md` (what makes a given request
server- or client-rendered — nothing decides; it is structural). This file is the operational layer: landmines and conventions.

---

## Layout

| Directory | What | Stack |
| --- | --- | --- |
| `ssr-shell-rt/` | The shell. Owns the document and URL space. | React Router **framework mode** + rsbuild |
| `ssr-mfe/` | MFE1. Renders fragments, serves them over HTTP. | React Router **library mode** + plain Node server |

React Router was chosen over TanStack Router/Start. An earlier `ssr-shell/`
(TanStack Start, in-process federation) was deleted; the evidence — every path
tested and rejected, and the `$_TSR` appendix — is in the decision record as of
commit `741d123` (`git show 741d123:mfe-ssr-decision-record.md`).

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
- **Share `react-dom/client`, not just `react-dom` — on both sides.** A subpath
  isn't covered by its package's shared entry, and `react-dom/client` holds the
  renderer. Unshared, MFE1 brought its own: two renderers on one page,
  interleaving concurrent renders over the shared router contexts, so MFE1's
  `RouterProvider` intermittently saw the shell's ("You cannot render a
  <Router> inside another <Router>", then React's "recovered by synchronously
  rendering the entire root"). Reproduced every run on home → MFE1 → About
  under 4× CPU throttling; zero after the fix. A single renderer then surfaced
  the two `#mfe1-root` problems below.
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
- **`#mfe1-root` is not React's territory, and MFE1's root doesn't go on it.**
  The shell renders it with `suppressHydrationWarning` and an empty `__html` on
  the client, so React leaves the server markup alone. That markup sits in an
  inner `<div data-mfe-ssr>`, and *that* is what MFE1 hydrates: React forbids a
  root on an element it renders with `dangerouslySetInnerHTML`. Client mounts
  get a fresh inner div each time; unmounts are deferred a tick (a cleanup runs
  mid-render, and React can't unmount another root then). Same for the
  capabilities widget in `routes/home.tsx`. The old "verified working" held only
  because two copies of `react-dom` hid it — see `react-dom/client` above.
- **React Router 8 renamed the `meta` argument** from `data` to `loaderData`.
  Route modules now type their args from `./+types/<route>` (`Route.LoaderArgs`,
  `Route.MetaArgs`), generated into `.react-router/types` and wired up by
  `rootDirs` in `tsconfig.json`. A rename like that is a compile error now.
  Use the generated types in any new route module rather than restating shapes.
  (`shouldRevalidate` has no generated type — use React Router's
  `ShouldRevalidateFunctionArgs`.)
- **A hosted MFE reports only settled navigations.** Its router's `subscribe`
  fires on every state change, and while a loader runs `state.location` is
  still the *previous* one. Reporting that to the host sends it back there: a
  back button to a route with a loader became an endless push loop (history
  grew to 50 entries). `clientEntry` returns early unless
  `state.navigation.state === "idle"`.
- **Forward the loader's `url`, never `request.url`.** On a client-side
  navigation the request is `/fr/mfe1/about.data?_routes=…`; React Router 8
  passes loaders a normalized `url` with that stripped. Forwarding the raw one
  made MFE1 match `/about.data` and answer 404 — hidden until the locale switch
  became the first client navigation to run the MFE route's loader.
- **`shouldRevalidate` on the MFE route is not a blanket `false`.** It skips
  MFE-internal navigation (the MFE owns that) but returns true when the locale
  changes, so the fragment is refetched and the mount effect — keyed on the
  loader data — remounts the MFE with the new `context`.

### Locale

The shell selects it; MFEs are told it and own their translations. Every page
is under `/:locale` (`app/locale.ts`, `routes/locale.tsx`) — subdirectories are
Google's recommended structure for indexed multilingual pages; `?lang=` is
explicitly not. A bare `/` redirects by the `locale` cookie the header picker
sets. The picker is a plain `navigate()`; nothing subscribes. The locale reaches
an MFE as `context.locale` on **both** halves of the contract, so the server
render and the hydration agree — MFEs never read it from headers, cookies or
storage. Standalone MFE pages take `?locale=`. Why the URL and not a cookie,
`?lang=` or `localStorage`: decision record §2.8.

Translations use **react-intl** in both the shell (`app/i18n.tsx`, `app/locales/`)
and MFE1 (`src/i18n.tsx`, `src/locales/`): one `IntlProvider` per render, no
global instance, no detection — safe on a server rendering many users at once.
English JSON defines the keys; other locales are typed against it and message
ids are typed via `FormatjsIntl.Message`, so a missing translation or a typo'd
id fails typecheck. `meta` runs outside the React tree: use `intlFor()`
(`createIntl`). `react-intl` is shared **without** `singleton` — one copy when
versions match, no forced upgrade when they don't. An MFE may use i18next
instead, but must keep it out of `shared` and never use the global instance or
`changeLanguage`: i18next's instance is module-level state.

### Types

Both halves of the contract (`FragmentRequest`/`FragmentResponse`,
`ClientEntryInput`/`ClientEntryHandle`/`ClientEntryModule`) come from
**`mfe-contract/`** (`@platform/mfe-contract`), installed in both projects as a
`file:` dependency — a stand-in for a registry package once shell and MFEs are
separate repos. It must not import any package: it sits outside both projects.
The MFE implements it (`satisfies ClientEntryModule`); the shell imports it.
Each side also reports the `CONTRACT_VERSION` it was built against, and the
shell checks it (`isCompatible`) before using a fragment or a `clientEntry` —
same types at compile time don't mean same types at runtime across independent
deploys. Bump it on any breaking change.

MF's own generated types (`dts`) aren't used: with runtime-registered remotes
they only arrive in dev, after a browser opens the page — never in CI. Only
MFE-specific extras (`app/mfeCapabilities.ts`) are still hand-declared.

### Dead ends — do not re-attempt

- **TanStack Router for an MFE.** Renders an empty string server-side. Its SSR
  bootstrap is annotated `Framework-only` and expects TanStack Start to drive it.
  Behind that sits the `$_TSR` global collision. Evidence: the decision
  record's appendix at commit `741d123`.
- **TanStack Start for an MFE.** Emits whole documents, no fragment contract.
- **Vite instead of rsbuild.** `@module-federation/vite` is CSR-oriented with
  documented SSR incompatibilities.
- **`eager: true` on shared deps** to fix `RUNTIME-006`. Pushes the failure one
  layer down into `Cannot read properties of undefined (reading 'consumes')`.
  The real fix is `asyncStartup` on the MF plugin.

---

## Process hygiene

- **Never `pkill -f "rsbuild dev"`** — it matches the shell *and* the MFE. Kill
  by port instead, **listeners only**: `lsof -ti:3000 -sTCP:LISTEN | xargs kill`.
  Without `-sTCP:LISTEN`, `lsof -i:PORT` also returns the *clients* connected to
  that port — i.e. the browser. `lsof -ti:3000 | xargs kill -9` kills Chrome.
- **SIGTERM, not `-9`.** The dev server spawns helpers (`fork-dev-worker.js` from
  `@module-federation/dts-plugin`, `typegen --watch` from the RR plugin) and
  reaps them only in its shutdown handlers. `kill -9` skips those, so every
  helper is orphaned to PID 1 — 35 accumulated this way. Plain `kill` (or
  Ctrl-C) leaves nothing behind; verified. Reach for `-9` only if SIGTERM
  didn't free the port, then sweep orphans with
  `ps -axo pid,ppid,command | grep <project path> | awk '$2==1'`.
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

1. **Version skew on deploy** — *shell ↔ MFE* skew is handled: a contract major
   mismatch falls back to client rendering (fragment) or leaves the server
   markup static (browser bundle). Still open: skew *within* one MFE — fragment
   server and browser bundle on the same contract major but different releases,
   so hydration sees markup from one and code from the other. Candidate: have
   the fragment response carry the matching client bundle's version.
2. **Request context** — `MfeContext` in the contract is the versioned slot;
   it carries `locale` today. User, tenant and flags go there too; keep it small.
3. **`validate:mfe` unbuilt** — should cover no mutable module-scope state (a
   concurrency smoke test catches the realistic cases), no global mutation, SSR
   safety, pinned versions.
4. **Shell bundler** — rsbuild is a deliberate choice now, not an inherited
   constraint. §2.7 of the decision record lists the three rspack-model fixes
   `federation: true` performs and what a Vite move would leave untested. Don't
   reopen it without a concrete problem to solve.
