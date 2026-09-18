import { type RouteConfig, index, route } from '@react-router/dev/routes'
import { MFE1_SEGMENT } from './mfeConfig'

export default [
  index('routes/home.tsx'),
  // Splat: everything under the MFE's mount path is delegated to its own router.
  route(`${MFE1_SEGMENT}/*`, 'routes/mfe1.tsx'),
  // Catch-all. Without it an unmatched URL is an unhandled 404 ErrorResponse,
  // which the framework's default handleError logs on every hit — and Chrome
  // DevTools probes /.well-known/appspecific/com.chrome.devtools.json on every
  // page load. Ranked below the routes above, so it never shadows them.
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig
