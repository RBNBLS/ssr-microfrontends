import { redirect } from "react-router";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "../locale";
import type { Route } from "./+types/locale-redirect";

// A bare "/" has no locale in it: send it to the one the picker last chose.
export function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("cookie") ?? "";
  const chosen = cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`))?.[1];
  return redirect(`/${isLocale(chosen) ? chosen : DEFAULT_LOCALE}`);
}
