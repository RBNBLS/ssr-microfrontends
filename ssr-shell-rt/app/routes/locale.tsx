import { data, Outlet } from "react-router";
import { isLocale } from "../locale";
import NotFound from "./not-found";
import type { Route } from "./+types/locale";

// Layout for everything under /:locale. An unknown prefix (/zz) is a 404,
// returned rather than thrown — see routes/not-found.tsx.
export function loader({ params }: Route.LoaderArgs) {
  return isLocale(params.locale)
    ? { locale: params.locale }
    : data({ locale: null }, { status: 404 });
}

export default function LocaleLayout({ loaderData }: Route.ComponentProps) {
  return loaderData.locale ? (
    <Outlet />
  ) : (
    "The selected language is not supported."
  );
}
