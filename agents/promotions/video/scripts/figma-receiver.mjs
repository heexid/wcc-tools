// Receives PNG exports from Figma (figma_execute → fetch POST) and writes them to video/assets/figma/.
// Port 9232 is allowed by the figma-console Desktop Bridge manifest.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/figma');
fs.mkdirSync(outDir, { recursive: true });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

http
  .createServer((req, res) => {
    if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
    const url = new URL(req.url, 'http://localhost');
    const name = (url.searchParams.get('name') || '').replace(/[^a-z0-9._-]/gi, '');
    if (req.method !== 'POST' || url.pathname !== '/save' || !name) return res.writeHead(400, cors).end('bad request');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(path.join(outDir, name), buf);
      console.log(`saved ${name} (${buf.length} bytes)`);
      res.writeHead(200, cors).end('ok');
    });
  })
  .listen(9232, () => console.log(`receiver on :9232 → ${outDir}`));
