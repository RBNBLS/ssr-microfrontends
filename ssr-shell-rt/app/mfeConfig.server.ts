// Server-only MFE configuration.
//
// Imported exclusively from `loader` functions, which React Router strips from
// the client bundle along with their exclusive imports — so these values, and
// any infrastructure detail added here later, stay out of the browser.

/** MFE1's fragment server, called during SSR. */
export const MFE1_FRAGMENT_URL =
  process.env.MFE1_FRAGMENT_URL ?? "http://localhost:3002/__fragment";

/** MFE1's browser container. Read here on the server and handed to the browser
 *  through the document's registry, never compiled into the bundle, so one
 *  shell build runs against any environment. */
export const MFE1_REMOTE_ENTRY =
  process.env.MFE1_REMOTE_ENTRY ?? "http://localhost:3001/mf-manifest.json";

/** Budget for an MFE's server render. Past this the shell stops waiting and
 *  falls back to client rendering, so one slow MFE cannot hold the whole
 *  response hostage. */
export const MFE_SSR_TIMEOUT_MS = 1000;

/** Registry of MFE browser containers, serialised into the document by the
 *  root route. Adding an MFE is an entry here, not a code change. */
export function buildMfeRegistry(): Record<string, string> {
  return {
    mfe1: MFE1_REMOTE_ENTRY,
  };
}
