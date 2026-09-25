import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { MFE1_SEGMENT, MFE2_SEGMENT } from "./mfeConfig";

export default [
  index("routes/locale-redirect.tsx"),
  // Every page sits under its locale (/en/..., /fr/...) — see app/locale.ts.
  route(":locale", "routes/locale.tsx", [
    index("routes/home.tsx"),
    // Splat: everything under the MFE's mount path is delegated to its own router.
    route(`${MFE1_SEGMENT}/*`, "routes/mfe1.tsx"),
    route(`${MFE2_SEGMENT}/*`, "routes/mfe2.tsx"),
  ]),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
