import { createRoot, hydrateRoot } from "react-dom/client";
import {
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider,
} from "react-router";
import {
  CONTRACT_VERSION,
  type ClientEntryHandle,
  type ClientEntryInput,
  type ClientEntryModule,
} from "@platform/mfe-contract";
import { I18nProvider } from "./i18n";
import { routes } from "./routes";
// Loaded with this module under the shell (Module Federation fetches the
// expose's CSS) and standalone. For server-rendered markup the fragment
// response also names it in `head.styles`, so it arrives before paint.
import "./styles.css";

// Exposed as `./clientEntry`; hosts check this before calling `clientEntry`.
export const contractVersion = CONTRACT_VERSION;

/**
 * Federated client entry — called by the shell's browser code after the shell
 * hydrates. Creates MFE2's own router (own basename), hydrating if `container`
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
  const { basePath, host, context } = input;
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
        // While a loader runs, `state.location` is still the *previous* one:
        // reporting it would send the host back there — after a back button
        // to a route with a loader, an endless push loop.
        if (state.navigation.state !== "idle") return;
        const href = state.location.pathname + state.location.search;
        if (href === hostHref) return;
        hostHref = href;
        host.onNavigate(href);
      })
    : () => {};

  // Same locale the fragment server rendered with, so hydration matches.
  const element = (
    <I18nProvider locale={context.locale}>
      <RouterProvider router={router} />
    </I18nProvider>
  );
  let root: ReturnType<typeof createRoot>;

  if (container.hasChildNodes()) {
    console.log("loulz");
    root = hydrateRoot(container, element);
  } else {
    console.log("lol");
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

// Compile-time: this module is what hosts get from `loadRemote`.
({ clientEntry, contractVersion }) satisfies ClientEntryModule;
