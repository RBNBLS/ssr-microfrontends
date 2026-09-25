import { loadRemote } from "@module-federation/enhanced/runtime";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  isCompatible,
  type ClientEntryHandle,
  type ClientEntryModule,
} from "@platform/mfe-contract";

// Marks the element wrapping server-rendered MFE markup inside the mount
// point — the element the MFE's root hydrates.
const SSR_MARK = "data-mfe-ssr";

interface MfeMountProps {
  /** The MFE's registry name: its browser half is `<remote>/clientEntry`. */
  remote: string;
  /** Where the shell mounts it — the MFE owns everything below. */
  basePath: string;
  locale: string;
  /** The fragment's loader data. Absent for a client-rendered MFE, or when
   *  its server render failed. */
  data?: Record<string, unknown>;
  /** The fragment's markup — server render only. */
  ssrHtml?: string;
}

/**
 * Mounts an MFE's browser half, server-rendered or not: the same code path
 * for both, which is the point. With `ssrHtml` the MFE hydrates it; without,
 * it renders from scratch and runs its own loaders.
 *
 * The shell stays the only writer of `window.history`: the MFE routes in
 * memory, and navigation crosses as plain calls — `host.onNavigate` up,
 * `handle.navigate` down — each side ignoring what it already knows.
 */
export function MfeMount({ remote, basePath, locale, data, ssrHtml }: MfeMountProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ClientEntryHandle | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Where the shell's router believes it is, readable from callbacks without
  // re-running the mount effect on every navigation.
  const href = location.pathname + location.search;
  const hrefRef = useRef(href);
  hrefRef.current = href;

  useEffect(() => {
    const outer = containerRef.current;
    if (!outer) return;
    // The MFE's root never goes on the mount point itself: React forbids a
    // root on an element it renders with dangerouslySetInnerHTML. It gets an
    // inner element — the server's wrapper, to hydrate, on the first mount; a
    // fresh one otherwise, so a remount never reuses one whose root is still
    // being torn down.
    const ssrEl = outer.querySelector<HTMLElement>(`:scope > [${SSR_MARK}]`);
    ssrEl?.removeAttribute(SSR_MARK);
    const container = ssrEl ?? outer.appendChild(document.createElement("div"));
    // Set by the cleanup. Covers StrictMode's mount → unmount → mount in dev
    // and a real unmount racing the async load: a load that resolves after
    // cleanup must not mount into a container this route no longer owns.
    let cancelled = false;

    async function loadRemoteMfe() {
      const entry = `${remote}/clientEntry`;
      const mfeClientModule = await loadRemote<ClientEntryModule>(entry);
      if (cancelled) return;
      if (!mfeClientModule) {
        throw new Error(`${entry} unavailable (remote not registered)`);
      }
      // A browser bundle on another contract major. Not mounting it leaves any
      // server markup static — visible, not interactive — rather than broken.
      if (!isCompatible(mfeClientModule.contractVersion)) {
        throw new Error(
          `${entry} speaks contract v${mfeClientModule.contractVersion}, this shell doesn't`,
        );
      }
      handleRef.current = mfeClientModule.clientEntry(container, {
        data,
        basePath,
        // The same context the fragment server rendered with, if it did.
        context: { locale },
        host: {
          href: hrefRef.current,
          // MFE → shell. An in-MFE link becomes a shell navigation; the
          // route's `shouldRevalidate` keeps it from refetching the fragment.
          onNavigate: (next) => {
            if (next !== hrefRef.current) void navigate(next);
          },
        },
      });
    }

    loadRemoteMfe().catch((error) => {
      console.error(`[shell] ${remote} client entry failed to load:`, error);
    });

    return () => {
      cancelled = true;
      const handle = handleRef.current;
      handleRef.current = null;
      if (!handle) {
        // Never mounted (StrictMode's immediate cleanup, or the load still
        // pending): hand the server markup back for the next mount to hydrate.
        if (ssrEl) ssrEl.setAttribute(SSR_MARK, "");
        else container.remove();
        return;
      }
      // Without this the MFE's React root outlives the route: detached from
      // the DOM but still rendering. Deferred: this cleanup runs during the
      // shell's render, and React can't unmount another root mid-render.
      container.hidden = true;
      setTimeout(() => {
        handle.unmount();
        container.remove();
      });
    };
    // New loader data (a locale switch refetches the fragment) or a new
    // locale remounts the MFE with the new `context`.
  }, [remote, basePath, locale, data, navigate]);

  // Shell → MFE. Every shell navigation — its own links, back/forward, and the
  // ones the MFE just asked for — ends here; the MFE ignores the ones it
  // already knows about. Keyed on `location.key` so a navigation to the same
  // pathname still counts.
  useEffect(() => {
    handleRef.current?.navigate(hrefRef.current);
  }, [location.key]);

  return (
    <div
      id={`${remote}-root`}
      ref={containerRef}
      // The contents are owned by the MFE, not by this React tree: server-
      // rendered here inside a marked wrapper, then hydrated by the MFE's own
      // root on that wrapper. React does not write innerHTML during hydration,
      // so the server markup survives the client's empty value;
      // suppressHydrationWarning silences the dev-only mismatch notice for
      // that intentional difference.
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: ssrHtml ? `<div ${SSR_MARK}>${ssrHtml}</div>` : "",
      }}
    />
  );
}
