// The `./capabilities` contract of every MFE, keyed by its registry name.
//
// Hand-declared, like the rest of the federation contract (see the note in
// app/routes/mfe1.tsx). Adding an MFE that exposes capabilities means adding
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
