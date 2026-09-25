// The `./capabilities` contract of every MFE, keyed by its registry name.
//
// Hand-declared: these are MFE-specific, unlike the generic contract in
// @platform/mfe-contract. Adding an MFE that exposes capabilities means adding
// its entry here — the map is what makes `useCapabilities()` typed.

/** Lifecycle of a widget an MFE mounted for us. */
export interface WidgetHandle<Input> {
  update(input: Input): void;
  unmount(): void;
}

export interface MfeCapabilities {
  mfe1: {
    addTwoNumbers(a: number, b: number): number;
    /** Mounts MFE1's Greeting into `container`; the host owns the handle. */
    mountGreeting(
      container: Element,
      input: { text: string },
    ): WidgetHandle<{ text: string }>;
  };
}

export type MfeName = keyof MfeCapabilities;

/** The MFEs that expose `./capabilities` — not every registered MFE does
 *  (MFE2 doesn't), and asking one that doesn't is a load error. */
export const MFES_WITH_CAPABILITIES = ["mfe1"] as const satisfies ReadonlyArray<MfeName>;
