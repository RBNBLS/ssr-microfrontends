import { useEffect, useRef } from "react";
import { useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "../root";
import { useCapabilities } from "../useCapabilities";

export function meta() {
  return [{ title: "Shell (React Router framework mode)" }];
}

export default function Home() {
  const { mfeRegistry } = useRouteLoaderData<typeof rootLoader>("root")!;
  const capabilities = useCapabilities(mfeRegistry);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Mount MFE1's widget with data from the shell. Client-only by nature —
  // capabilities are `{}` during SSR — so the div is empty in the document
  // and fills in after load. The cleanup hands the root back.
  useEffect(() => {
    const mfe1 = capabilities.mfe1;
    if (!mfe1 || !widgetRef.current) return;
    const handle = mfe1.mountGreeting(widgetRef.current, {
      text: "text passed in by the shell",
    });
    return () => handle.unmount();
  }, [capabilities.mfe1]);

  return (
    <div style={{ padding: 8 }}>
      <p>Shell home route — server-rendered.</p>
      <div ref={widgetRef} />
    </div>
  );
}
