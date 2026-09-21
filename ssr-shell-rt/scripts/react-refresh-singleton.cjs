// Dev only. One react-refresh runtime per page, not one per entry runtime.
//
// The React Router plugin makes every route module its own entry, and the
// Module Federation plugin removes `runtimeChunk: 'single'` (its runtime must
// stay with each entry). So `entry.client`, `root` and every route each get a
// private webpack runtime — and a private copy of `react-refresh/runtime`.
// react-dom registers its renderer through the DevTools hook once, and the
// refresh entry guards that hook with a global flag, so exactly one copy ever
// learns about the renderer (`root`'s). Components in route modules register
// with their own copy, whose `performReactRefresh` then has no renderer to
// refresh: saving a route file downloads the hot update and repaints nothing.
//
// Wired in by `NormalModuleReplacementPlugin` in rsbuild.config.ts, replacing
// `react-refresh/runtime.js` wherever it is requested — by name from
// `@rspack/plugin-react-refresh`, by absolute path from the RR plugin's HMR
// runtime. Requiring the cjs build directly keeps this out of its own match.
module.exports = globalThis.__reactRefreshRuntime ??= require("react-refresh/cjs/react-refresh-runtime.development.js");
