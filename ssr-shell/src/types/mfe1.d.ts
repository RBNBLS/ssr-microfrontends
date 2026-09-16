// Hand-written ambient types for the federated MFE1 remote (dts generation
// via Module Federation is disabled for this PoC — see rsbuild.config.ts).
// This is the explicit federation contract described in the architecture
// doc ("Keep the federation contract explicit").
declare module 'mfe1/serverEntry' {
  export interface ServerEntryInput {
    url: string
    headers?: Record<string, string>
  }

  export interface ServerEntryResult {
    html: string
    data: unknown
    head: { title: string }
  }

  export function serverEntry(
    input: ServerEntryInput,
  ): Promise<ServerEntryResult>
}

declare module 'mfe1/clientEntry' {
  export interface ClientEntryInput {
    data?: unknown
  }

  export function clientEntry(
    container: Element,
    input?: ClientEntryInput,
  ): void
}
