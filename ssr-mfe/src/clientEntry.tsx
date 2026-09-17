import { createRoot, hydrateRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './routes'

export interface ClientEntryInput {
  /** Loader data from `serverEntry`, handed over by the shell as plain data.
   *  Absent when SSR failed and the shell fell back to client rendering. */
  data?: Record<string, unknown>
  /** Must match the `basePath` the shell sent to the fragment server. */
  basePath: string
}

/**
 * Federated client entry — called by the shell's browser code after the shell
 * hydrates. Creates MFE1's own router (own history, own basename).
 *
 * Hydrates if `container` already holds server-rendered markup; otherwise
 * mounts fresh, which is the path taken when the shell's SSR fetch failed.
 */
export function clientEntry(container: Element, input: ClientEntryInput) {
  const router = createBrowserRouter(routes, {
    basename: input.basePath,
    hydrationData: input.data ? { loaderData: input.data } : undefined,
  })

  if (container.hasChildNodes()) {
    hydrateRoot(container, <RouterProvider router={router} />)
  } else {
    createRoot(container).render(<RouterProvider router={router} />)
  }
}
