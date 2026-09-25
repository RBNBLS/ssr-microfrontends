// Universal MFE configuration — safe in both bundles.
//
// Anything that reads `process.env` or describes infrastructure lives in
// mfeConfig.server.ts instead, so it never reaches the browser.

export const MFE1_SEGMENT = 'mfe1'

/** Where the shell mounts MFE1 for a locale. The shell owns the URL space; the
 *  MFE owns everything below this path and is told it rather than hardcoding it. */
export const mfe1Base = (locale: string) => `/${locale}/${MFE1_SEGMENT}`
