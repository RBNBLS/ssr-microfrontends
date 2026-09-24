import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import {
  CONTRACT_VERSION,
  type FragmentRequest,
  type FragmentResponse,
} from "@platform/mfe-contract";
import { routes } from "./routes";

/**
 * Renders this MFE to an HTML fragment. Called over HTTP by the shell's server
 * (see server.ts) — plain React Router in library mode, no MFE-owned
 * application server and no server routes.
 */
export async function serverEntry({
  url,
  headers = {},
  basePath,
}: FragmentRequest): Promise<FragmentResponse> {
  // Origin is irrelevant — only the path is used for matching. Headers are
  // forwarded so loaders can pass auth/cookies on to the API/BFF.
  const target = new URL(url, "http://mfe1.internal");

  // Outside basePath the static router renders an empty string and still
  // reports success. That is a caller bug, so fail and let the shell fall back.
  const { pathname } = target;
  if (basePath && pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
    throw new Error(`${pathname} is outside basePath ${basePath}`);
  }

  const handler = createStaticHandler(routes, { basename: basePath });
  const request = new Request(target.href, { headers });

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
    contractVersion: CONTRACT_VERSION,
    html,
    status: context.statusCode,
    data: context.loaderData,
    head: { title: "MFE1" },
  };
}
