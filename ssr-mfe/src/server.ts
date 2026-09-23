// MFE1's fragment server.
//
// This is a transport, not a framework. Its only job is to expose the existing
// `serverEntry` function over HTTP so the shell can render this MFE without
// loading its code into the shell's process.
//
// Contract:
//   POST /__fragment  { url, headers, basePath } -> { html, status, data, head }

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { serverEntry, type ServerEntryInput } from "./serverEntry";

const PORT = Number(process.env.PORT ?? 3002);

function json(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<ServerEntryInput> {
  const chunks: Array<Buffer> = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** Where the browser build is served (`rsbuild dev`). */
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3001";
const PREVIEW_BASE = "/preview";

/** The browser build's script and stylesheet tags, taken from its own
 *  index.html so hashed chunk names never need restating here. Empty when the
 *  dev server is down — the preview then shows the server markup only. */
async function clientAssetTags(): Promise<string> {
  try {
    const page = await (await fetch(`${CLIENT_ORIGIN}/`)).text();
    const head = page.slice(0, page.indexOf("</head>"));
    return (head.match(/<script\b[^>]*><\/script>|<link\b[^>]*>/g) ?? []).join(
      "\n    ",
    );
  } catch {
    return "";
  }
}

/**
 * Dev-only: SSR then hydrate, the way the shell does it, without the shell.
 * `index.tsx` finds `#mfe-preview` and hands its data to `clientEntry`, which
 * hydrates because `#root` already holds markup.
 */
function previewPage(html: string, data: unknown, title: string, assets: string) {
  // `<` escaped so loader data can't close the script element early.
  const payload = JSON.stringify({ data, basePath: PREVIEW_BASE }).replace(
    /</g,
    "\\u003c",
  );
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title} — SSR preview</title>
    ${assets}
  </head>
  <body>
    <p style="font:14px system-ui;color:#666">
      SSR preview: server-rendered here, hydrated by the :3001 bundle — the
      path the shell takes.${assets ? "" : " <strong>:3001 is down, so no hydration.</strong>"}
    </p>
    <hr />
    <div id="root">${html}</div>
    <script type="application/json" id="mfe-preview">${payload}</script>
  </body>
</html>`;
}

const server = createServer(async (req, res) => {
  // The shell renders from a different origin in dev.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/health") {
    json(res, 200, { ok: true, mfe: "mfe1" });
    return;
  }

  if (url.pathname === "/__fragment" && req.method === "POST") {
    try {
      const input = await readJson(req);
      json(res, 200, await serverEntry(input));
    } catch (error) {
      // The shell treats any non-200 as "render this fragment client-side".
      console.error("[mfe1] fragment render failed:", error);
      json(res, 500, { error: String(error) });
    }
    return;
  }

  // Mounted at /preview like the shell mounts it at /mfe1, so the MFE's links
  // stay inside the preview and a reload on any of them server-renders again.
  const inPreview =
    url.pathname === PREVIEW_BASE ||
    url.pathname.startsWith(`${PREVIEW_BASE}/`);
  if (inPreview && req.method === "GET") {
    try {
      const [result, assets] = await Promise.all([
        serverEntry({
          url: url.pathname + url.search,
          basePath: PREVIEW_BASE,
        }),
        clientAssetTags(),
      ]);
      res.writeHead(result.status, {
        "Content-Type": "text/html; charset=utf-8",
      });
      res.end(previewPage(result.html, result.data, result.head.title, assets));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(String(error));
    }
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`[mfe1] fragment server on http://localhost:${PORT}`);
  console.log("[mfe1]   POST /__fragment      contract endpoint");
  console.log("[mfe1]   GET  /preview/about   SSR + hydrate preview");
});
