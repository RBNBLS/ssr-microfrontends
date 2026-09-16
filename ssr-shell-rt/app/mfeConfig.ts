// Single source of truth for where MFEs are mounted.
//
// The shell owns the URL space; each MFE owns everything below its mount path.
// Both the route table and the federation call read from here, so the two can
// never drift — previously `/mfe1` was hardcoded independently in the shell's
// route and in the MFE's router basename.

export const MFE1_SEGMENT = 'mfe1'
export const MFE1_BASE = `/${MFE1_SEGMENT}`

/** Budget for an MFE's server render. Past this the shell stops waiting and
 *  falls back to client rendering, so one slow MFE cannot hold the whole
 *  response hostage. */
export const MFE_SSR_TIMEOUT_MS = 800
