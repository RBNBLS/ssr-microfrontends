import {
  Links,
  Meta,
  Outlet,
  Scripts,
  Link,
  useLoaderData,
  useParams,
} from "react-router";
import { FormattedMessage } from "react-intl";
import { LocalePicker } from "./components/LocalePicker";
import { ShellIntl } from "./i18n";
import { localeFromParams } from "./locale";
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
  const locale = localeFromParams(useParams());
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ShellIntl locale={locale}>
          <div style={{ display: "flex", gap: 12, padding: 8, fontSize: 18 }}>
            <Link to={`/${locale}`}>
              <FormattedMessage id="nav.home" />
            </Link>
            <Link to={`/${locale}/mfe1`}>
              <FormattedMessage id="nav.mfe1" />
            </Link>
            <LocalePicker locale={locale} />
          </div>
          <hr />
          {children}
          <Scripts />
        </ShellIntl>
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
