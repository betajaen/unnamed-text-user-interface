import { watch, readFileSync } from "fs";

const devClients = new Set<{ send: (msg: string) => void }>();

const server = Bun.serve({
  hostname: '0.0.0.0',
  port: 8000,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      const html = readFileSync("./index.html", "utf-8");
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/demo.js") {
      const content = readFileSync("./demo.js", "utf-8");
      return new Response(content + "console.log('"+ new Date().toISOString() +"')", {
        headers: {
          "Content-Type": "application/javascript",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/__dev") {
      if (server.upgrade(req)) {
        return;
      }
      console.error("WebSocket upgrade failed");
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      ws.id = Math.floor(Math.random() * 10000);
      console.log("open", ws.id, ws.remoteAddress);
      ws.sendText("Hello-" + ws.id.toString());
      devClients.add(ws);
    },
    message(ws, message) {
      console.log("message", ws.id, ws.remoteAddress, message);
    },
    close(ws) {
      console.log("closed", ws.id, ws.remoteAddress);
      devClients.delete(ws);
    },
  },
});

// Watch for demo.js changes and notify dev clients
// Debounce to avoid race condition with build
let reloadTimeout: Timer | null = null;
watch(".", (event, filename) => {
  if (filename === "demo.js") {
    if (reloadTimeout) clearTimeout(reloadTimeout);
    reloadTimeout = setTimeout(() => {
      console.log("RELOAD!!!!");
      for (const client of devClients) {
        console.log(client);
        client.send("reload");
      }
    }, 250);
  }
});

console.log(`Server running at http://${server.hostname}:${server.port}`);
