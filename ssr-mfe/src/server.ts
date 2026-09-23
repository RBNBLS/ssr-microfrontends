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

/** Dev-only: lets an MFE developer see their own SSR output without the shell. */
function previewPage(html: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title} — SSR preview</title>
  </head>
  <body>
    <p style="font:14px system-ui;color:#666">
      Server-render preview. This is exactly the markup the shell embeds —
      no hydration. For the interactive app, use the dev server on :3001.
    </p>
    <hr />
    ${html}
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

  if (url.pathname === "/preview" && req.method === "GET") {
    try {
      const result = await serverEntry({
        url: url.searchParams.get("path") ?? "/",
        basePath: "",
      });
      res.writeHead(result.status, {
        "Content-Type": "text/html; charset=utf-8",
      });
      res.end(previewPage(result.html, result.head.title));
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
  console.log("[mfe1]   POST /__fragment   contract endpoint");
  console.log("[mfe1]   GET  /preview?path=/about SSR preview");
});
