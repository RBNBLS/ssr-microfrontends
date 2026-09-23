import { createRoot, hydrateRoot } from "react-dom/client";
import {
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider,
} from "react-router";
import { routes } from "./routes";

export interface ClientEntryInput {
  /** Loader data from `serverEntry`, handed over by the shell as plain data.
   *  Absent when SSR failed and the shell fell back to client rendering. */
  data?: Record<string, unknown>;
  /** Must match the `basePath` the shell sent to the fragment server. */
  basePath: string;
  /**
   * Present when mounted inside a host. The host then owns `window.history`
   * outright: this MFE routes in memory and asks the host to change the URL.
   * Absent when standalone, where this MFE is the only router on the page.
   */
  host?: {
    /** The address bar right now — `pathname + search`, basePath included. */
    href: string;
    /** This MFE navigated; the host should make the URL `href`. */
    onNavigate(href: string): void;
  };
}

/** What the host gets back — the MFE's lifecycle, owned by whoever mounted it. */
export interface ClientEntryHandle {
  /** The host changed the URL (its own link, back/forward); follow it.
   *  `href` is `pathname + search` with basePath. No-op if already there. */
  navigate(href: string): void;
  /** Unmount the React root and release the router. */
  unmount(): void;
}

/**
 * Federated client entry — called by the shell's browser code after the shell
 * hydrates. Creates MFE1's own router (own basename), hydrating if `container`
 * already holds server-rendered markup and mounting fresh otherwise.
 *
 * Hosted, the router is a memory router: exactly one thing on the page writes
 * to `window.history`, so two independent browser routers never disagree about
 * the URL. Navigation flows both ways through plain function calls —
 * `host.onNavigate` up, `handle.navigate` down — each side ignoring what it
 * already knows, so the loop terminates.
 */
export function clientEntry(
  container: Element,
  input: ClientEntryInput,
): ClientEntryHandle {
  const { basePath, host } = input;
  const hydrationData = input.data ? { loaderData: input.data } : undefined;

  // Router paths exclude the basename; the address bar includes it.
  const within = (href: string) =>
    href.startsWith(basePath) ? href.slice(basePath.length) || "/" : href;
  const currentHref = () =>
    router.state.location.pathname + router.state.location.search;

  const router = host
    ? createMemoryRouter(routes, {
        basename: basePath,
        hydrationData,
        initialEntries: [host.href],
      })
    : createBrowserRouter(routes, { basename: basePath, hydrationData });

  // The last URL the host told us about. Navigations that land there were
  // the host's idea — don't report them back.
  let hostHref = host?.href ?? currentHref();

  const unsubscribe = host
    ? router.subscribe((state) => {
        // `subscribe` fires on every state change (loading, submitting…);
        // only a settled location change is a navigation worth reporting.
        const href = state.location.pathname + state.location.search;
        if (href === hostHref) return;
        hostHref = href;
        host.onNavigate(href);
      })
    : () => {};

  const element = <RouterProvider router={router} />;
  let root: ReturnType<typeof createRoot>;

  if (container.hasChildNodes()) {
    root = hydrateRoot(container, element);
  } else {
    root = createRoot(container);
    root.render(element);
  }

  return {
    navigate(href) {
      hostHref = href;
      if (currentHref() === href) return;
      void router.navigate(within(href), { replace: true });
    },
    unmount() {
      unsubscribe();
      root.unmount();
      router.dispose();
    },
  };
}
