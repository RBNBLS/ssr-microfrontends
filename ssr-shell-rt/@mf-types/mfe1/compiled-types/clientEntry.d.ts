export interface ClientEntryInput {
    /** Loader data from `serverEntry`, handed over by the shell as plain data.
     *  Absent when SSR failed and the shell fell back to client rendering. */
    data?: Record<string, unknown>;
    /** Must match the `basePath` the shell passed to `serverEntry`. */
    basePath: string;
}
/**
 * Federated client entry — called by the shell's browser code after the shell
 * hydrates. Creates MFE1's own router (own history, own basename) and hydrates
 * the server-rendered markup already in `container`.
 */
export declare function clientEntry(container: Element, input: ClientEntryInput): void;
