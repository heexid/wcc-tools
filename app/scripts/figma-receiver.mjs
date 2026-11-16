// Local receiver for Figma frame exports (dev only).
// The figma-console Desktop Bridge plugin may call http://localhost:9223-9232, so a
// figma_execute snippet can do:
//   const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
//   await fetch("http://localhost:9232/save?name=bookings-01.png", { method: "POST", body: bytes });
// Files land in public/__figma__/ (reference PNGs for the G3 gate and /dev/overlay),
// or public/__figma__/specs/ for *.json node specs (G2 gate).
import { createServer } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.FIGMA_RECEIVER_PORT ?? 9232);
const root = join(dirname(fileURLToPath(import.meta.url)), "../public/__figma__");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "*" };

createServer((req, res) => {
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const name = url.searchParams.get("name") ?? "";
  if (req.method !== "POST" || url.pathname !== "/save" || !/^[a-z0-9][a-z0-9@._-]*\.(png|json)$/i.test(name)) {
    return res.writeHead(400, cors).end("bad request");
  }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const dir = name.endsWith(".json") ? join(root, "specs") : root;
    mkdirSync(dir, { recursive: true });
    const buf = Buffer.concat(chunks);
    writeFileSync(join(dir, name), buf);
    console.log(`saved ${name} (${buf.length} bytes)`);
    res.writeHead(200, cors).end("ok");
  });
}).listen(PORT, "127.0.0.1", () => console.log(`figma receiver on http://localhost:${PORT}`));
