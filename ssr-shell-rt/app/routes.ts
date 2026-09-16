import { type RouteConfig, index, route } from '@react-router/dev/routes'
import { MFE1_SEGMENT } from './mfeConfig'

export default [
  index('routes/home.tsx'),
  // Splat: everything under the MFE's mount path is delegated to its own router.
  route(`${MFE1_SEGMENT}/*`, 'routes/mfe1.tsx'),
] satisfies RouteConfig
