// F15 diagnostic: vertical offset (px, Figma minus ours) per region between the last PDF capture and Figma 11b.
import { PNG } from "pngjs";
import fs from "node:fs";
const frame = process.argv[2] || "bookings-11b";
const a = PNG.sync.read(fs.readFileSync(`test-results/visual/${frame}-actual.png`)), f = PNG.sync.read(fs.readFileSync(`test-results/visual/${frame}-figma.png`));
const W = a.width;
function prof(img, X, Y, w, h) { const p = []; for (let y = Y; y < Y + h; y++) { let t = 0; for (let x = X; x < X + w; x++) { const i = (y * W + x) * 4; t += 255 - img.data[i + 1]; } p.push(t); } return p; }
function best(X, Y, w, h) { const pa = prof(a, X, Y - 6, w, h + 12), pf = prof(f, X, Y - 6, w, h + 12); let bb = null; for (let s = -4; s <= 4; s += 0.25) { let e = 0; for (let k = 6; k < h + 6; k++) { const t = k - s; const i0 = Math.floor(t), fr = t - i0; const v = (pa[i0] ?? 0) * (1 - fr) + (pa[i0 + 1] ?? 0) * fr; e += (v - pf[k]) ** 2; } if (!bb || e < bb[0]) bb = [e, s]; } return bb[1]; }
const R = { "Caption meta": [530, 110, 90, 60], "HeadingSection brand": [96, 38, 100, 20], "Display number": [46, 138, 200, 32], "BodyStrong from": [46, 248, 100, 18], "Body row2": [80, 508, 200, 18], "Caption th": [46, 402, 700, 14], "HeadingPanel remaining": [600, 826, 145, 26], "Timestamp footer": [46, 1092, 360, 12], "Avatar": [50, 52, 30, 14] };
for (const [k, r] of Object.entries(R)) console.log(k.padEnd(24), best(...r));
function edges(img, x) { const out = []; let prev = ""; for (let y = 0; y < img.height; y++) { const i = (y * W + x) * 4; const c = img.data.slice(i, i + 3).join(","); if (c !== prev) { out.push(y); prev = c; } } return out; }
console.log("edges x=20 ours", edges(a, 20).slice(0, 6).join(","), " figma", edges(f, 20).slice(0, 6).join(","));
