import {
  Links,
  Meta,
  Outlet,
  Scripts,
  Link,
  useLoaderData,
  useParams,
} from "react-router";
import { LocalePicker } from "./components/LocalePicker";
import { DEFAULT_LOCALE, isLocale } from "./locale";
import { buildMfeRegistry } from "./mfeConfig.server";
import { registerMfeRemotes } from "./mfeRegistry";
import { ErrorBoundary } from "react-error-boundary";

// Server-only: reads env, so it never reaches the browser bundle. React Router
// serialises the return value into the document as ordinary loader data, which
// is how the registry reaches the client — no bespoke global needed.
export function loader() {
  return { mfeRegistry: buildMfeRegistry() };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { locale: param } = useParams();
  const locale = isLocale(param) ? param : DEFAULT_LOCALE;
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div style={{ display: "flex", gap: 12, padding: 8, fontSize: 18 }}>
          <Link to={`/${locale}`}>Home</Link>
          <Link to={`/${locale}/mfe1`}>MFE1</Link>
          <LocalePicker locale={locale} />
        </div>
        <hr />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  const { mfeRegistry } = useLoaderData<typeof loader>();

  // In render, not an effect — see registerMfeRemotes. Idempotent, so React's
  // double-render in development is harmless.
  registerMfeRemotes(mfeRegistry);

  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <div>
          Oopsie something happens {`${JSON.stringify(error, null, 2)}`}{" "}
        </div>
      )}
    >
      <Outlet />
    </ErrorBoundary>
  );
}
