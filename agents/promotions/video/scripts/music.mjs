// Synthesises an original chiptune background track for the promo, timed to the scenes in index.html.
//   node scripts/music.mjs           → assets/music.wav           (Bookings video: C – G – Am – F)
//   node scripts/music.mjs dashboard → assets/music-dashboard.wav (Dashboard video: C – Am – F – G, new melodies)
//   node scripts/music.mjs flow      → assets/music-flow.wav      (Booking-flow video: F – G – C – Am, new melodies)
//   node scripts/music.mjs update    → assets/music-update.wav    (Update-booking video: Am – F – C – G, new melodies)
//   node scripts/music.mjs package   → assets/music-package.wav   (Package-library video: C – F – Am – G, new melodies)
//
// Brief: 118 BPM · fast chiptune beat with crisp snare clicks · catchy 8-bit square-wave lead ·
// short arpeggiated figures · punchy bouncing bass · light console percussion · dry, bright mix ·
// playful opening motif. Console-style voices: pulse lead (25%), pulse arps (12.5%), triangle bass
// and kick, sample-and-hold noise for snare and hats. Progression C – G – Am – F, one bar each.
//
// Bar grid (2.034 s per bar) against the edit:
//   bars 0–1   0–4.1s    intro: opening motif + sparse arps, up-run into the window reveal
//   bars 2–9   4.1–20.3  full beat, melody A
//   bars 10–17 20.3–36.6 melody B (16th hats, extra kick bounce) — new booking flow
//   bars 18–21 36.6–44.7 melody A again, snare fill in bar 21
//   bars 22–23 44.7–48.5 close: drums out, opening motif returns
//   48.5s               end-card jingle: up-arp + final C chord, fade to 50.5s
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? +argv[argv.indexOf(k) + 1] : d);
const SR = 44100, DUR = opt('--dur', 50.5), N = Math.round(SR * DUR);
const CLOSE_BAR = opt('--close', 22), JINGLE = opt('--jingle', 48.5); // drums out at CLOSE_BAR, jingle on the end card
const BPM = 118, BEAT = 60 / BPM, BAR = BEAT * 4, E8 = BEAT / 2, S16 = BEAT / 4;
const L = new Float32Array(N), R = new Float32Array(N);
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;
let seed = 99991;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function put(i, v, pan) {
  if (i < 0 || i >= N) return;
  L[i] += v * Math.cos((pan + 1) * Math.PI / 4);
  R[i] += v * Math.sin((pan + 1) * Math.PI / 4);
}

// Pulse note with a console-style volume envelope (instant attack, short decay to sustain, quick release)
function pulse(t, dur, midi, { duty = .25, gain = .1, pan = 0, vib = 0, slide = 0, decayTo = .7 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), f0 = mtof(midi);
  let ph = 0;
  for (let j = 0; j < len + 220; j++) {
    const tt = j / SR;
    const vibr = vib && tt > .12 ? Math.sin(TAU * 5.5 * (tt - .12)) * vib : 0;
    const f = f0 * Math.pow(2, (vibr + slide * Math.max(0, .03 - tt) / .03) / 12);
    ph = (ph + f / SR) % 1;
    const sq = (ph < duty ? 1 : -1) - (2 * duty - 1);
    const env = Math.min(1, j / 60) * (decayTo + (1 - decayTo) * Math.exp(-tt * 18)) * (j > len ? Math.max(0, 1 - (j - len) / 220) : 1);
    put(i0 + j, sq * env * gain, pan);
  }
}
function tri(t, dur, midi, gain = .2) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), f = mtof(midi);
  let ph = 0;
  for (let j = 0; j < len + 150; j++) {
    ph = (ph + f / SR) % 1;
    // 4-bit stepped triangle, like a console's triangle channel
    const s = Math.round((ph < .5 ? 4 * ph - 1 : 3 - 4 * ph) * 7.5) / 7.5;
    const env = Math.min(1, j / 40) * (j > len ? Math.max(0, 1 - (j - len) / 150) : 1);
    put(i0 + j, s * env * gain, 0);
  }
}
// Sample-and-hold noise (hold = pitch), short and dry
function noise(t, decay, gain, hold, pan = 0, hp = 0) {
  const i0 = Math.round(t * SR), len = Math.round(decay * 7 * SR);
  let v = 0, prev = 0;
  for (let j = 0; j < len; j++) {
    if (j % hold === 0) v = rnd() > 0 ? 1 : -1;
    const out = hp ? v - prev * hp : v; prev = v;
    put(i0 + j, out * Math.exp(-j / SR / decay) * gain, pan);
  }
}
function kick(t, gain = .42) {
  const i0 = Math.round(t * SR); let ph = 0;
  for (let j = 0; j < SR * .16; j++) {
    const tt = j / SR, f = 45 + 190 * Math.exp(-tt * 45);
    ph = (ph + f / SR) % 1;
    const s = Math.round((ph < .5 ? 4 * ph - 1 : 3 - 4 * ph) * 7.5) / 7.5;
    put(i0 + j, s * Math.exp(-tt * 22) * gain, 0);
  }
}
function snare(t, gain = 1) {
  noise(t, .045, .2 * gain, 2, -.05);                              // crisp noise burst
  pulse(t, .018, 57, { duty: .5, gain: .1 * gain, decayTo: .2 }); // the "click"
}
const hat = (t, g = 1) => noise(t, .012, .07 * g, 1, .3, .9);

// ── Harmony
const VARIANT = ['dashboard', 'flow', 'update', 'package'].find(v => argv.includes(v)) || 'bookings';
const C = { root: 36, tones: [72, 76, 79] }, G = { root: 43, tones: [71, 74, 79] };
const Am = { root: 45, tones: [72, 76, 81] }, F = { root: 41, tones: [72, 77, 81] };
const CH = { dashboard: [C, Am, F, G], flow: [F, G, C, Am], update: [Am, F, C, G], package: [C, F, Am, G] }[VARIANT] || [C, G, Am, F];
const barT = b => b * BAR;
const chord = b => CH[((b % 4) + 4) % 4];

// ── Melodies on an 8th-note grid (null = rest → clean spacing)
let OPEN = [[84, null, 79, null, 84, 88, null, null], [86, null, 83, null, 79, 81, 83, null]];
let A = [
  [76, 79, 84, null, 79, null, 76, 79], [74, null, 71, 74, 79, null, 77, 76],
  [72, 76, 81, null, 76, null, 72, 76], [77, null, 81, null, 84, null, 81, 79],
  [76, 79, 84, null, 79, null, 76, 79], [74, null, 71, 74, 79, 81, 83, null],
  [84, null, 83, 81, 76, null, 81, null], [77, 81, 84, 86, 88, null, 86, null],
];
let B = [
  [79, 79, null, 76, null, 79, 84, null], [83, null, 79, null, 86, null, 83, null],
  [81, 81, null, 76, null, 81, 84, null], [84, null, 81, null, 77, 79, 81, null],
  [88, null, 86, 84, null, 79, null, 76], [86, null, 83, 79, null, 74, 79, 83],
  [84, 83, 81, 76, 84, 83, 81, 76], [77, null, 81, null, 84, null, null, null],
];
if (VARIANT === 'dashboard') {
  OPEN = [[79, null, 84, null, 88, null, 84, 86], [88, null, null, 86, 84, null, 79, null]];
  A = [
    [72, 76, 79, 84, null, 79, 76, null], [81, null, 76, null, 72, 76, 81, null],
    [77, 81, 84, null, 81, null, 77, 79], [83, null, 79, null, 74, 79, 83, 86],
    [88, null, 84, null, 79, null, 84, 88], [84, null, 81, 76, null, 81, 84, null],
    [81, null, 84, 86, 84, null, 81, 77], [79, 83, 86, null, 83, null, 79, null],
  ];
  B = [
    [84, 84, null, 79, null, 76, 79, null], [76, null, 81, null, 84, null, 81, null],
    [77, 77, null, 81, null, 84, 86, null], [86, null, 83, null, 79, null, 83, 86],
    [88, 86, 84, 79, 88, 86, 84, 79], [84, 83, 81, 76, 84, 83, 81, 76],
    [77, 79, 81, 84, 86, null, 84, null], [86, null, 83, null, 79, null, null, null],
  ];
}
if (VARIANT === 'package') {
  OPEN = [[79, null, 84, null, 79, 76, null, null], [77, null, 81, null, 84, null, 81, 77]];
  A = [
    [72, 76, 79, null, 76, null, 79, 84], [81, null, 77, null, 72, 77, 81, null],
    [76, null, 81, 84, null, 81, 76, null], [79, 83, 86, null, 83, null, 79, 83],
    [84, null, 79, null, 76, 79, 84, 86], [84, null, 81, 77, null, 81, 84, null],
    [81, 84, 88, null, 84, null, 81, null], [83, null, 86, null, 83, 79, null, null],
  ];
  B = [
    [84, 84, null, 88, null, 84, 79, null], [77, 77, null, 81, null, 84, 86, null],
    [88, null, 84, null, 81, null, 76, null], [79, 81, 83, 86, null, 86, 83, null],
    [76, 79, 84, 88, null, 88, 84, null], [77, 81, 84, 89, null, 89, 84, null],
    [84, 83, 81, 76, 84, 83, 81, 76], [79, null, 83, null, 86, null, null, null],
  ];
}
if (VARIANT === 'update') {
  OPEN = [[81, null, 76, null, 81, 84, null, null], [84, null, 81, null, 77, 79, 81, null]];
  A = [
    [76, 81, 84, null, 81, null, 76, 81], [77, null, 81, 84, null, 81, 77, null],
    [79, 84, 88, null, 84, null, 79, 84], [86, null, 83, null, 79, null, 83, 86],
    [88, null, 84, 81, null, 84, 88, null], [89, null, 84, 81, 77, null, 81, 84],
    [88, 86, 84, 79, 84, null, 88, null], [86, 83, 79, null, 83, null, null, null],
  ];
  B = [
    [81, 81, null, 84, null, 81, 76, null], [77, 77, null, 81, null, 84, 86, null],
    [84, null, 88, null, 91, null, 88, null], [86, null, 83, null, 79, 81, 83, null],
    [76, 79, 81, 84, null, 84, 81, null], [77, 81, 84, 86, null, 86, 84, null],
    [84, 83, 84, 88, 84, 83, 79, 76], [79, null, 83, null, 86, null, null, null],
  ];
}
if (VARIANT === 'flow') {
  OPEN = [[77, null, 81, null, 84, null, 81, null], [83, null, 86, null, 79, 81, 83, null]];
  A = [
    [77, 81, 84, null, 81, null, 77, 81], [79, null, 74, 79, 83, null, 81, 79],
    [76, 79, 84, null, 79, null, 76, 79], [81, null, 76, null, 72, 76, 81, 84],
    [84, null, 81, null, 77, 81, 84, 86], [86, null, 83, 79, null, 83, 86, null],
    [88, null, 84, 79, 84, null, 88, null], [86, 84, 81, 76, 81, null, null, null],
  ];
  B = [
    [81, 81, null, 77, null, 81, 84, null], [83, 83, null, 79, null, 83, 86, null],
    [84, null, 88, null, 84, 79, 76, null], [76, null, 81, null, 84, null, 81, null],
    [77, 79, 81, 84, null, 84, 81, null], [79, 81, 83, 86, null, 86, 83, null],
    [84, 83, 84, 88, 84, 83, 79, 76], [81, null, 84, null, 88, null, null, null],
  ];
}
function lead(bar, notes, gain = .085) {
  notes.forEach((m, k) => {
    if (m == null) return;
    // chip-style gate: 80% of an 8th, a little longer when a rest follows
    const len = notes[k + 1] === null ? E8 * 1.5 : E8 * .8;
    pulse(barT(bar) + k * E8, len, m, { duty: .25, gain, pan: -.05, vib: .18, slide: k === 0 ? -1 : 0 });
  });
}
// Short arpeggiated figures: three 16ths then a rest on each beat
function arps(bar, beats = [0, 1, 2, 3], gain = .035, c = chord(bar)) {
  beats.forEach(bt => [0, 1, 2].forEach(n => {
    const m = c.tones[(n + bt) % 3] + 12;
    pulse(barT(bar) + bt * BEAT + n * S16, S16 * .7, m, { duty: .125, gain, pan: n % 2 ? .3 : -.3, decayTo: .4 });
  }));
}
// Bouncing bass: root / octave 8ths, approach note into the next chord
function bass(bar) {
  const c = chord(bar), next = chord(bar + 1);
  for (let k = 0; k < 8; k++) {
    let m = k % 2 ? c.root + 12 : c.root;
    if (k === 7) m = next.root + (next.root > c.root ? -1 : 1) + 12;
    tri(barT(bar) + k * E8, E8 * .62, m, .26);
  }
}
function beat(bar, { hats16 = false, bounce = false, fill = false } = {}) {
  const t0 = barT(bar);
  kick(t0); kick(t0 + 2 * BEAT);
  if (bounce) kick(t0 + 2.5 * BEAT, .3);
  snare(t0 + BEAT); snare(t0 + 3 * BEAT);
  if (hats16) for (let k = 0; k < 16; k++) { if (k % 4 !== 0) hat(t0 + k * S16, k % 2 ? .6 : 1); }
  else for (let k = 0; k < 4; k++) hat(t0 + k * BEAT + E8);
  if (fill) [3.25, 3.5, 3.75].forEach(b => snare(t0 + b * BEAT, .8));
}

// ── Arrangement
// Intro (bars 0–1): opening motif, sparse arps, up-run into bar 2
lead(0, OPEN[0]); lead(1, OPEN[1]);
arps(0, [0, 2]); arps(1, [0, 2]);
hat(barT(1) + 1.5 * BEAT, .7); hat(barT(1) + 2.5 * BEAT, .7);
[72, 76, 79, 84].forEach((m, k) => pulse(barT(1) + 3 * BEAT + k * S16, S16 * .8, m + 12, { duty: .125, gain: .045, pan: .2 }));

// Body: 8-bar sections alternating A / B, fill on each section's last bar and before the close
for (let b = 2; b < CLOSE_BAR; b++) {
  const idx = b - 2, sec = Math.floor(idx / 8) % 2 ? 'B' : 'A';
  bass(b);
  arps(b);
  beat(b, { hats16: sec === 'B', bounce: sec === 'B' && b % 2 === 1, fill: idx % 8 === 7 || b === CLOSE_BAR - 1 });
  lead(b, (sec === 'A' ? A : B)[idx % 8]);
  if (idx % 8 === 0) noise(barT(b), .25, b === 2 ? .12 : .1, 3, 0); // small crash on each section downbeat
}

// Close: drums out, the opening motif returns over the intro chords
const K = CLOSE_BAR;
lead(K, OPEN[0], .08); lead(K + 1, OPEN[1].map((x, k) => k < 5 ? x : null), .08);
arps(K, [0, 1, 2, 3], .03, CH[0]); arps(K + 1, [0, 1, 2], .03, CH[1]);
tri(barT(K), BAR * .9, CH[0].root, .13); tri(barT(K + 1), BAR * .7, CH[1].root, .13);

// End-card jingle at 48.5s: quick up-arp, then a held C chord
const J = JINGLE;
[72, 76, 79, 84, 88].forEach((m, k) => pulse(J + k * .055, .05, m, { duty: .25, gain: .07, pan: k % 2 ? .2 : -.2 }));
[84, 88, 91].forEach((m, k) => pulse(J + .3, 1.5, m, { duty: k === 0 ? .25 : .125, gain: [.07, .04, .04][k], vib: .12, decayTo: .55, pan: [0, -.3, .3][k] }));
tri(J + .3, 1.5, 36, .24);
kick(J + .3, .4);
noise(J + .3, .3, .1, 3, 0);

// ── Master: dry, bright; soft-clip, gentle top-end smoothing, fade, normalise
let peak = 0, lpL = 0, lpR = 0;
const a = 1 - Math.exp(-TAU * 13000 / SR);
for (let i = 0; i < N; i++) {
  const t = i / SR, fade = t > DUR - 1.2 ? Math.max(0, (DUR - t) / 1.2) : 1;
  lpL += a * (L[i] - lpL); lpR += a * (R[i] - lpR);
  L[i] = Math.tanh(lpL * 1.2) * fade; R[i] = Math.tanh(lpR * 1.2) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = .89 / peak;
const clamp = v => Math.max(-1, Math.min(1, v));
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(clamp(L[i] * norm) * 32767), i * 4);
  data.writeInt16LE(Math.round(clamp(R[i] * norm) * 32767), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8);
hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
const out = path.join(root, 'assets', VARIANT === 'bookings' ? 'music.wav' : `music-${VARIANT}.wav`);
fs.writeFileSync(out, Buffer.concat([hdr, data]));
console.log('wrote', out);
