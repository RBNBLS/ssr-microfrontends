// Federation contract for the MFE1 remote (hand-written; dts generation off).
declare module 'mfe1/serverEntry' {
  export function serverEntry(input: {
    url: string
    headers?: Record<string, string>
    /** Where the shell has mounted this MFE. */
    basePath: string
  }): Promise<{
    html: string
    data: unknown
    head: { title: string }
  }>
}

declare module 'mfe1/clientEntry' {
  export function clientEntry(
    container: Element,
    input: {
      /** Absent when SSR failed and the shell fell back to client rendering. */
      data?: unknown
      /** Must match the `basePath` passed to `serverEntry`. */
      basePath: string
    },
  ): void
}
