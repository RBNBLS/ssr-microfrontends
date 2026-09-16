// Serves this MFE's Node (SSR) Module Federation build as plain static files
// (manifest + JS chunks) so the shell's Start server can fetch `serverEntry`
// over HTTP during dev. This is a static file server, not an MFE-owned
// application/API server — it never executes MFE code, matching Rule 1 of
// the architecture doc. In production the equivalent is a CDN/object-store
// origin serving the same `node/` build output.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../node', import.meta.url));
const port = Number(process.env.MFE_NODE_PORT ?? 3002);

const contentTypes = {
  '.json': 'application/json',
  '.js': 'text/javascript',
};

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const filePath = join(root, requestPath);

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404).end('Not found');
    return;
  }

  res.setHeader('Content-Type', contentTypes[extname(filePath)] ?? 'application/octet-stream');
  createReadStream(filePath).pipe(res);
}).listen(port, () => {
  console.log(`[ssr-mfe] serving node/ (SSR federation build) at http://localhost:${port}`);
});
