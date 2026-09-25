import { redirect } from "react-router";
import { readCookie } from "../cookies";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "../locale";
import type { Route } from "./+types/locale-redirect";

// A bare "/" has no locale in it: send it to the one the picker last chose.
export function loader({ request }: Route.LoaderArgs) {
  const chosen = readCookie(request, LOCALE_COOKIE);
  return redirect(`/${isLocale(chosen) ? chosen : DEFAULT_LOCALE}`);
}
