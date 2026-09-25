import {
  Links,
  Meta,
  Outlet,
  Scripts,
  Link,
  useLoaderData,
  useParams,
  useRouteLoaderData,
} from "react-router";
import "@platform/mfe-contract/theme.css";
import "./app.css";
import { FormattedMessage } from "react-intl";
import { LocalePicker } from "./components/LocalePicker";
import { ThemePicker } from "./components/ThemePicker";
import { readCookie } from "./cookies";
import { ShellIntl } from "./i18n";
import { localeFromParams } from "./locale";
import { DEFAULT_THEME, isTheme, THEME_COOKIE } from "./theme";
import { buildMfeRegistry } from "./mfeConfig.server";
import { registerMfeRemotes } from "./mfeRegistry";
import { ErrorBoundary } from "react-error-boundary";
import type { Route } from "./+types/root";

// Server-only: reads env, so it never reaches the browser bundle. React Router
// serialises the return value into the document as ordinary loader data, which
// is how the registry reaches the client — no bespoke global needed. The theme
// comes from its cookie so <html data-theme> is right in the server's HTML.
export function loader({ request }: Route.LoaderArgs) {
  const theme = readCookie(request, THEME_COOKIE);
  return {
    mfeRegistry: buildMfeRegistry(),
    theme: isTheme(theme) ? theme : DEFAULT_THEME,
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const locale = localeFromParams(useParams());
  // Absent only if the root loader itself failed.
  const theme =
    useRouteLoaderData<typeof loader>("root")?.theme ?? DEFAULT_THEME;
  return (
    <html lang={locale} data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-surface text-content">
        <ShellIntl locale={locale}>
          <div className="flex gap-3 p-2 text-lg">
            <Link to={`/${locale}`}>
              <FormattedMessage id="nav.home" />
            </Link>
            <Link to={`/${locale}/mfe1`}>
              <FormattedMessage id="nav.mfe1" />
            </Link>
            <LocalePicker locale={locale} />
            <ThemePicker theme={theme} />
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
