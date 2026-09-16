// Standalone server-side Module Federation host.
//
// This file is built as its own rsbuild environment ("mfHost"), NOT as part
// of TanStack Start's "ssr" bundle. That separation is required, not stylistic:
// `@module-federation/rsbuild-plugin` rewrites whatever environment it attaches
// to with `target: 'async-node'` + `output.chunkLoading: 'async-node'` (see
// its `patchNodeConfig`), while Start's server bundle needs the default
// node/`require` chunk loading for its own `loadEntries()`. Both can't hold in
// one compilation — so federation gets its own.
//
// Start's server loads the built output of this file at runtime via a native
// `require()`, which keeps the two module graphs fully independent.
//
// Note: this bundle carries its own React copy, separate from the shell's.
// That's harmless here because the boundary is serialized — `serverEntry`
// returns an HTML *string*, never React elements — so the two React instances
// never interact. Browser-side sharing is unaffected and still uses normal
// singleton federation.

export interface RenderInput {
  url: string
  headers?: Record<string, string>
}

export interface RenderResult {
  html: string
  data: unknown
  head: { title: string }
}

export async function renderMfe1(input: RenderInput): Promise<RenderResult> {
  const { serverEntry } = await import('mfe1/serverEntry')
  return serverEntry(input)
}
