import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { routes } from "./routes";

export interface ServerEntryInput {
  url: string;
  headers?: Record<string, string>;
  /** Where the shell has mounted this MFE. The shell owns the URL space; the
   *  MFE owns everything below this path. Never hardcode it here. */
  basePath: string;
}

export interface ServerEntryResult {
  html: string;
  data: unknown;
  head: { title: string };
}

/**
 * Renders this MFE to an HTML fragment. Called over HTTP by the shell's server
 * (see server.ts) — plain React Router in library mode, no MFE-owned
 * application server and no server routes.
 */
export async function serverEntry({
  url,
  headers = {},
  basePath,
}: ServerEntryInput): Promise<ServerEntryResult> {
  const handler = createStaticHandler(routes, { basename: basePath });

  // Origin is irrelevant — only the path is used for matching. Headers are
  // forwarded so loaders can pass auth/cookies on to the API/BFF.
  const request = new Request(new URL(url, "http://mfe1.internal").href, {
    headers,
  });

  const context = await handler.query(request);
  if (context instanceof Response) {
    throw new Error(`MFE1 returned a ${context.status} instead of rendering`);
  }

  const router = createStaticRouter(handler.dataRoutes, context);

  // hydrate={false} suppresses React Router's own
  // `window.__staticRouterHydrationData` script — the shell carries loader
  // data back to `clientEntry` as plain data instead, so nothing depends on
  // a document-level global.
  const html = renderToString(
    <StaticRouterProvider router={router} context={context} hydrate={false} />,
  );

  return {
    html,
    data: context.loaderData,
    head: { title: "MFE1" },
  };
}
