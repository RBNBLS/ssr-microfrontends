import { useEffect, useRef, useState } from "react";
import { useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "../root";
import { useCapabilities } from "../useCapabilities";
import { CustomWidget } from "../components/widget";

export function meta() {
  return [{ title: "Shell (React Router framework mode)" }];
}

export default function Home() {
  const { mfeRegistry } = useRouteLoaderData<typeof rootLoader>("root")!;
  const capabilities = useCapabilities(mfeRegistry);
  const widgetRef = useRef<HTMLDivElement>(null);
  //@ts-ignore
  const updateGreeting = useRef(({ text }) => {});

  // Mount MFE1's widget with data from the shell. Client-only by nature —
  // capabilities are `{}` during SSR — so the div is empty in the document
  // and fills in after load. The cleanup hands the root back.
  useEffect(() => {
    const mfe1 = capabilities.mfe1;
    if (!mfe1 || !widgetRef.current) return;
    const handle = mfe1.mountGreeting(widgetRef.current, {
      text: "Initial render",
    });
    updateGreeting.current = handle.update;
    return () => handle.unmount();
  }, [capabilities.mfe1]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const debouncedSelection = debounce(function onSelection() {
      updateGreeting.current({ text: document.getSelection()?.toString() });
    }, 500);
    document.addEventListener("selectionchange", debouncedSelection);

    return () => {
      document.removeEventListener("selectionchange", debouncedSelection);
      debouncedSelection.cancel();
    };
  }, []);

  return (
    <div style={{ padding: 8 }}>
      <p>Shell home route — server-rendered.</p>
      <CustomWidget ref={widgetRef} />
    </div>
  );
}

function debounce(fn: any, timer: number) {
  let t: any;

  const debounced = () => {
    clearTimeout(t);
    t = setTimeout(fn, timer);
  };

  debounced.cancel = () => clearTimeout(t);

  return debounced;
}
