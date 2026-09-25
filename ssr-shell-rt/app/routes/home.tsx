import { useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useRouteLoaderData } from "react-router";
import { intlFor } from "../i18n";
import { localeFromParams } from "../locale";
import type { Route } from "./+types/home";
import type { loader as rootLoader } from "../root";
import { useCapabilities } from "../useCapabilities";
import { CustomWidget } from "../components/widget";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: intlFor(localeFromParams(params)).formatMessage({ id: "home.title" }) }];
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
    // Own element per mount, as in routes/mfe1.tsx: a remount never reuses a
    // container whose root is still being torn down.
    const el = widgetRef.current.appendChild(document.createElement("div"));
    const handle = mfe1.mountGreeting(el, { text: "Initial render" });
    updateGreeting.current = handle.update;
    return () => {
      // Deferred: this cleanup runs during the shell's render, and React
      // can't unmount another root mid-render.
      setTimeout(() => {
        handle.unmount();
        el.remove();
      });
    };
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
    <div className="p-2">
      <p>
        <FormattedMessage id="home.body" />
      </p>
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
