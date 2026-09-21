import { createRoot } from "react-dom/client";

// Plain functions and small mountable widgets other apps may call. Nothing in
// here touches routing or window.history — that belongs to clientEntry.

export function addTwoNumbers(a: number, b: number) {
  return a + b;
}

export interface GreetingInput {
  text: string | undefined;
}

/** Lifecycle of a mounted widget, owned by whoever mounted it. */
export interface WidgetHandle<Input> {
  update(input: Input): void;
  unmount(): void;
}

function Greeting({ text }: GreetingInput) {
  return (
    <div style={{ border: "1px dashed #999", padding: 8, borderRadius: 8 }}>
      <strong>MFE widget mode:</strong> {text}
    </div>
  );
}

/**
 * Mount a Greeting into `container` with the given data. Own React root, so
 * a failure inside stays inside; the host drives it through the handle.
 */
export function mountGreeting(
  container: Element,
  input: GreetingInput,
): WidgetHandle<GreetingInput> {
  const root = createRoot(container);
  const render = (next: GreetingInput) => root.render(<Greeting {...next} />);
  render(input);
  return { update: render, unmount: () => root.unmount() };
}
