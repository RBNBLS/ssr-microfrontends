// The shell ↔ MFE contract — the same for every MFE. Only the shape of `data`
// is MFE-specific, hence the type parameter.
//
// Types only, apart from the version check: nothing here depends on a
// package, so it can be installed anywhere.

export declare const CONTRACT_VERSION: 1;

/** Whether a version an MFE reports can be used by this build. */
export declare function isCompatible(version: unknown): boolean;

// ── Server half: POST /__fragment ────────────────────────────────────────

export interface FragmentRequest {
  /** `pathname + search` as the shell received it, basePath included. */
  url: string;
  /** Forwarded so the MFE's loaders can pass auth/cookies to its API. */
  headers?: Record<string, string>;
  /** Where the shell mounts this MFE. The shell owns the URL space; the MFE
   *  owns everything below this path. */
  basePath: string;
}

export interface FragmentResponse<Data = Record<string, unknown>> {
  /** The CONTRACT_VERSION the fragment server was built against. */
  contractVersion: number;
  html: string;
  /** The document status this fragment asks for — 404 for an unknown path
   *  inside the MFE. The render itself succeeded either way. */
  status: number;
  /** Loader data, handed back to `clientEntry` to hydrate without refetching. */
  data: Data;
  head: { title: string };
}

// ── Browser half: the exposed `./clientEntry` module ─────────────────────

export interface ClientEntryInput<Data = Record<string, unknown>> {
  /** `FragmentResponse.data`. Absent when SSR failed and the host fell back
   *  to client rendering. */
  data?: Data;
  /** Must match the `basePath` the host sent to the fragment server. */
  basePath: string;
  /**
   * Present when mounted inside a host. The host then owns `window.history`
   * outright: the MFE routes in memory and asks the host to change the URL.
   * Absent when standalone, where the MFE is the only router on the page.
   */
  host?: {
    /** The address bar right now — `pathname + search`, basePath included. */
    href: string;
    /** The MFE navigated; the host should make the URL `href`. */
    onNavigate(href: string): void;
  };
}

/** What the host gets back — the MFE's lifecycle, owned by whoever mounted it. */
export interface ClientEntryHandle {
  /** The host changed the URL (its own link, back/forward); follow it.
   *  `href` is `pathname + search` with basePath. No-op if already there. */
  navigate(href: string): void;
  /** Unmount the React root and release the router. */
  unmount(): void;
}

/** What `loadRemote("<mfe>/clientEntry")` resolves to. */
export interface ClientEntryModule<Data = Record<string, unknown>> {
  /** The CONTRACT_VERSION the browser bundle was built against. */
  contractVersion: number;
  clientEntry(container: Element, input: ClientEntryInput<Data>): ClientEntryHandle;
}
