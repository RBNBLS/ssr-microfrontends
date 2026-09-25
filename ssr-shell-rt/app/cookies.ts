/** A cookie's value from the request, server-side. */
export function readCookie(request: Request, name: string): string | undefined {
  return request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];
}

/** Remembered for a year, browser-side. */
export function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}
