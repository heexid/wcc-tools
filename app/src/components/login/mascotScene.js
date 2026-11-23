// CIR mascot — a glossy pink bubble with two pill eyes (Figma: CIR · Design System › Assets › Asset/mascot-large).
// Framework-free three.js module: createMascot(container) → { setState, lookAtClient, keystroke, react, destroy }.
// Used by Mascot.tsx on the login page and by the standalone preview in /mascot (repo root). Types: mascotScene.d.ts.
// Colours here are WebGL shader inputs, not UI styling (same reasoning as liquidParams.ts for G1).
// The page decides the state (idle / typing / password / peek / happy / success / error / loading / sleepy);
// the mascot only animates toward it. Everything eases through springs, so states can change at any moment.

import * as THREE from "three";

export const STATES = ["idle", "typing", "password", "peek", "happy", "success", "error", "loading", "sleepy"];

// sRGB 0–255, written straight to the shader (no colour-space conversion).
const PALETTE = {
  top: [255, 138, 196], // warm pink, upper-left
  bottom: [206, 162, 255], // lavender, lower-right
  core: [255, 112, 184], // saturated centre
  tint: [255, 92, 112], // error flush
  accent: [178, 184, 255], // lilac wash that wanders over the body
};

const eye = (o = {}) => ({ open: 1, happy: 0, closed: 0, rot: 0, ...o });

// follow: "pointer" tracks the cursor · "manual" uses lookAtClient() · "fixed" uses look · "orbit" circles.
const PRESETS = {
  idle: { eyes: [eye(), eye()], follow: "pointer", blink: [2.2, 5.5], float: 1 },
  typing: { eyes: [eye(), eye()], follow: "manual", look: [0, -0.55], blink: [1.4, 3.2], float: 0.5 },
  password: { eyes: [eye({ closed: 1 }), eye({ closed: 1 })], follow: "fixed", look: [0, -0.15], sneak: true, float: 0.6 },
  peek: { eyes: [eye({ closed: 1 }), eye({ open: 0.5 })], follow: "fixed", look: [0.32, -0.55], tilt: -0.12, float: 0.4 },
  happy: { eyes: [eye({ happy: 1 }), eye({ happy: 1 })], follow: "pointer", glow: 1.6, float: 1.2 },
  success: { eyes: [eye({ happy: 1 }), eye({ happy: 1 })], follow: "fixed", look: [0, 0.1], glow: 1.8, float: 1.2 },
  error: {
    eyes: [eye({ open: 0.62, rot: -0.38 }), eye({ open: 0.62, rot: 0.38 })],
    follow: "fixed",
    look: [0, -0.12],
    blink: [3, 6],
    tint: 1,
    glow: 0.5,
    float: 0.4,
  },
  loading: { eyes: [eye(), eye()], follow: "orbit", blink: [1.6, 3.4], float: 0.8 },
  sleepy: { eyes: [eye({ open: 0.14 }), eye({ open: 0.14 })], follow: "fixed", look: [0, -0.32], float: 0.5, slow: true },
};

class Spring {
  constructor(value, stiffness, zeta) {
    this.x = value;
    this.v = 0;
    this.t = value;
    this.k = stiffness;
    this.d = 2 * Math.sqrt(stiffness) * zeta;
  }
  step(dt) {
    this.v += (this.k * (this.t - this.x) - this.d * this.v) * dt;
    this.x += this.v * dt;
  }
}

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// Shading tuned against the Figma render, then made alive: the pink → lavender gradient drifts and swirls, a
// lilac wash wanders across the body, glossy white crescents hug the silhouette and slowly orbit (the
// "light on the corner"), the iridescent fringe cycles, and the core glows and pulses.
const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uCore;
  uniform vec3 uAccent;
  uniform vec3 uTint;
  uniform float uTintAmt;
  uniform float uTime;
  uniform float uGlow;
  uniform vec2 uLook;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    float T = uTime;

    // flowing colour
    vec3 axis = normalize(vec3(0.55 + sin(T * 0.31) * 0.28, -0.8 + cos(T * 0.27) * 0.22, 0.25));
    float swirl = sin(n.x * 2.6 + T * 0.9) * sin(n.y * 2.2 - T * 0.7) * 0.22 + sin((n.x + n.y) * 3.1 - T * 0.5) * 0.1;
    float g = smoothstep(-0.35, 1.05, dot(n, axis) + swirl);
    vec3 col = mix(uTop, uBottom, g);
    vec3 wander = normalize(vec3(sin(T * 0.45) * 0.75, cos(T * 0.37) * 0.65, 0.55));
    col = mix(col, uAccent, smoothstep(0.5, 1.0, dot(n, wander)) * 0.4);
    col = mix(col, uCore, pow(ndv, 2.5) * 0.3 * (1.0 - g));

    // milky edge + cycling iridescent fringe
    float fres = pow(1.0 - ndv, 2.4);
    col = mix(col, vec3(1.0, 0.95, 0.98), fres * 0.55);
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + n.x * 0.35 - n.y * 0.25 + ndv * 1.4 + T * 0.12));
    col += (irid - 0.5) * pow(1.0 - ndv, 3.0) * 0.45;

    col = mix(col, uTint, uTintAmt * 0.32 * (1.0 - fres));

    // glossy rim crescents on the corners of the silhouette, orbiting slowly (and shifting against the gaze)
    vec2 e = normalize(n.xy + vec2(1e-5));
    float edge = 1.0 - ndv;
    float band = smoothstep(0.3, 0.78, edge) * (1.0 - 0.35 * smoothstep(0.96, 1.0, edge));
    float th1 = 2.3 + sin(T * 0.55) * 0.4 - uLook.x * 0.5 - uLook.y * 0.3;
    float th2 = th1 + 3.1416 + sin(T * 0.8 + 1.0) * 0.35;
    float c1 = smoothstep(0.35, 1.0, dot(e, vec2(cos(th1), sin(th1))));
    float c2 = smoothstep(0.62, 1.0, dot(e, vec2(cos(th2), sin(th2))));
    col = mix(col, vec3(1.0), clamp(band * (c1 * 1.1 + c2 * 0.75), 0.0, 1.0));
    // a crisp glint riding just inside the main crescent
    float glint = smoothstep(0.86, 0.99, dot(e, vec2(cos(th1 + 0.25), sin(th1 + 0.25)))) * smoothstep(0.45, 0.6, edge) * (1.0 - smoothstep(0.72, 0.86, edge));
    col = mix(col, vec3(1.0), glint * 0.85);

    // soft sheen near the top-left, drifting
    vec3 L = normalize(vec3(-0.55 + sin(T * 0.5) * 0.12 - uLook.x * 0.2, 0.7 + cos(T * 0.4) * 0.08 - uLook.y * 0.15, 0.6));
    float nh = max(dot(n, normalize(L + v)), 0.0);
    col = mix(col, vec3(1.0), pow(nh, 9.0) * 0.26 + smoothstep(0.93, 0.995, nh) * 0.32);

    // inner glow
    col += vec3(1.0, 0.55, 0.8) * 0.07 * uGlow * pow(ndv, 1.5);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

const Z = new THREE.Vector3(0, 0, 1);
function placeOnSurface(obj, x, y, lift = 0) {
  const n = new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y)));
  obj.position.copy(n).multiplyScalar(1 + lift);
  obj.quaternion.setFromUnitVectors(Z, n);
}

// Half-torus arc with round caps. up=true → "∩" (happy eye), up=false → "∪" (closed eye / smile).
function makeArc(radius, tube, material, up) {
  const g = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 28, Math.PI), material);
  const cap = new THREE.SphereGeometry(tube, 12, 8);
  const c1 = new THREE.Mesh(cap, material);
  const c2 = new THREE.Mesh(cap, material);
  c1.position.x = radius;
  c2.position.x = -radius;
  const inner = new THREE.Group();
  inner.add(torus, c1, c2);
  inner.position.y = -radius * 0.5;
  if (!up) {
    inner.rotation.z = Math.PI;
    inner.position.y = radius * 0.5;
  }
  g.add(inner);
  g.scale.z = 0.5;
  return g;
}

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(176, 108, 214, 0.42)");
  grd.addColorStop(0.55, "rgba(214, 140, 220, 0.16)");
  grd.addColorStop(1, "rgba(255, 180, 230, 0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(255, 150, 210, 0.9)");
  grd.addColorStop(0.62, "rgba(255, 150, 210, 0.55)");
  grd.addColorStop(0.78, "rgba(230, 160, 255, 0.2)");
  grd.addColorStop(1, "rgba(255, 190, 235, 0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * @param {HTMLElement} container  element the canvas fills (give it a size; square works best)
 * @param {{ state?: string, sleepAfter?: number, poke?: boolean, fit?: number }} [options]
 *   sleepAfter: ms of no input before idle turns sleepy (0 disables, default 20000)
 *   poke: clicking the mascot makes it giggle (default true)
 *   fit: body diameter as a fraction of the canvas height (default 0.72); the rest is room for glow and bounce
 */
export function createMascot(container, options = {}) {
  const { sleepAfter = 20000, poke = true, fit = 0.72 } = options;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.setAttribute("aria-hidden", "true");
  if (poke) canvas.style.cursor = "pointer";
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0, 1 / (fit * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));

  // root: float / bounce / shake / tilt · body: look rotation + squash. Face parts live on the body so they
  // slide over the sphere as it turns (the sphere itself looks the same from every angle).
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  scene.add(root);

  const bodyMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTop: { value: new THREE.Vector3(...PALETTE.top.map((c) => c / 255)) },
      uBottom: { value: new THREE.Vector3(...PALETTE.bottom.map((c) => c / 255)) },
      uCore: { value: new THREE.Vector3(...PALETTE.core.map((c) => c / 255)) },
      uTint: { value: new THREE.Vector3(...PALETTE.tint.map((c) => c / 255)) },
      uTintAmt: { value: 0 },
      uAccent: { value: new THREE.Vector3(...PALETTE.accent.map((c) => c / 255)) },
      uTime: { value: 0 },
      uGlow: { value: 1 },
      uLook: { value: new THREE.Vector2() },
    },
  });
  body.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), bodyMat));

  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pillGeo = new THREE.CapsuleGeometry(0.1, 0.16, 8, 20);
  const eyes = [-0.255, 0.255].map((x) => {
    const holder = new THREE.Group();
    placeOnSurface(holder, x, 0.1, 0.0);
    const spin = new THREE.Group(); // per-eye roll (worried tilt)
    const pill = new THREE.Mesh(pillGeo, white);
    pill.scale.z = 0.5;
    const pillWrap = new THREE.Group();
    pillWrap.add(pill);
    const happy = makeArc(0.105, 0.042, white, true);
    const closed = makeArc(0.1, 0.038, white, false);
    spin.add(pillWrap, happy, closed);
    holder.add(spin);
    body.add(holder);
    return { spin, pillWrap, happy, closed, cur: eye() };
  });

  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), shadowMat);
  shadow.position.set(0, -1.12, -0.6);
  scene.add(shadow);

  // soft pink halo behind the bubble; breathes and brightens with the mood
  const haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), haloMat);
  halo.position.z = -0.9;
  scene.add(halo);

  // ── animation state ────────────────────────────────────────────────────────────────────────────────
  let state = PRESETS[options.state] ? options.state : "idle";
  let shown = state; // state actually animated (idle may become sleepy)
  const lookX = new Spring(0, 90, 0.72);
  const lookY = new Spring(0, 90, 0.72);
  const bodyY = new Spring(0, 190, 0.32);
  const tilt = new Spring(0, 70, 0.6);
  const face = { tint: 0, glow: 1, float: 1 };

  let t = 0;
  let nextBlink = rand(1, 3);
  let blinkAt = -1;
  let doubleBlink = false;
  let shakeAt = -1;
  let nextSneak = rand(2.5, 4.5);
  let override = null; // { until, eyes?, look?, glow? }
  let pointer = null; // { x, y } in look space
  let manual = null;
  let lastActivity = performance.now();

  function enter(next, prev) {
    if (reduce.matches) return;
    if (next === "success") {
      bodyY.v += 3.4;
      setTimeout(() => (bodyY.v += 2), 420);
    } else if (next === "error") {
      shakeAt = t;
      bodyY.v -= 0.8;
    } else if (next === "password") {
      bodyY.v -= 0.9;
    } else if (next === "happy") {
      bodyY.v += 2;
    } else if (prev === "sleepy") {
      blinkAt = t;
      doubleBlink = true;
      bodyY.v += 2.2;
    }
    if (next === "password") nextSneak = t + rand(2.2, 4);
  }

  function setState(next) {
    if (!PRESETS[next]) throw new Error(`Unknown mascot state "${next}". Use one of: ${STATES.join(", ")}`);
    if (next === state) return;
    state = next;
    override = null;
    if (next !== "typing") manual = null;
    lastActivity = performance.now();
  }

  // Look at a point on the page (clientX/Y). Used for the cursor in idle and for the caret while typing.
  function toLook(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const reach = Math.max(window.innerWidth, window.innerHeight) * 0.38;
    return { x: Math.tanh((clientX - cx) / reach) * 1.0, y: Math.tanh(-(clientY - cy) / reach) * 1.0 };
  }
  function lookAtClient(clientX, clientY) {
    manual = toLook(clientX, clientY);
  }

  function keystroke() {
    lastActivity = performance.now();
    // a fixed nod, not an added impulse: fast typing must not pile up into a big wobble
    if (!reduce.matches) bodyY.v = Math.min(bodyY.v, -0.55);
  }

  function react(kind) {
    if (kind === "blink") blinkAt = t;
    else if (kind === "bounce" && !reduce.matches) bodyY.v += 2.6;
    else if (kind === "shake") shakeAt = reduce.matches ? -1 : t;
    else if (kind === "giggle") {
      override = { until: t + 0.9, eyes: [eye({ happy: 1 }), eye({ happy: 1 })], glow: 1.6 };
      if (!reduce.matches) bodyY.v += 2.4;
    }
  }

  const onPointerMove = (e) => {
    pointer = toLook(e.clientX, e.clientY);
    lastActivity = performance.now();
  };
  const onActivity = () => (lastActivity = performance.now());
  const onLeave = () => (pointer = null);
  const onPoke = () => react("giggle");
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("keydown", onActivity);
  window.addEventListener("pointerdown", onActivity, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  if (poke) canvas.addEventListener("click", onPoke);

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
  io.observe(container);

  let last = performance.now();
  let raf = 0;
  function frame(now = performance.now()) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    if (!visible) return;
    t += dt;
    const still = reduce.matches;

    const asleep = state === "idle" && sleepAfter > 0 && performance.now() - lastActivity > sleepAfter;
    const next = asleep ? "sleepy" : state;
    if (next !== shown) {
      enter(next, shown);
      shown = next;
    }
    const p = PRESETS[shown];
    if (override && t > override.until) override = null;

    // password: every few seconds one eye sneaks a quick look at the field
    // (reduced motion: no unprompted blinks or peeks, so a still frame stays still)
    if (p.sneak && !still && !override && t > nextSneak) {
      override = { until: t + 0.85, eyes: [eye({ closed: 1 }), eye({ open: 0.42 })], look: [0.3, -0.5] };
      nextSneak = t + rand(3.5, 7);
    }

    // look target
    let look = p.look || [0, 0];
    if (override?.look) look = override.look;
    else if (p.follow === "pointer") look = pointer ? [pointer.x, pointer.y] : [0, 0];
    else if (p.follow === "manual" && manual) look = [manual.x, manual.y];
    else if (p.follow === "orbit") look = [Math.cos(t * 2.4) * 0.45, 0.3 + Math.sin(t * 2.4) * 0.22];
    lookX.t = clamp(look[0], -1, 1);
    lookY.t = clamp(look[1], -1, 1);
    tilt.t = p.tilt || 0;

    // blinks
    if (p.blink && !still && t > nextBlink) {
      blinkAt = t;
      doubleBlink = Math.random() < 0.2;
      nextBlink = t + rand(p.blink[0], p.blink[1]);
    }
    const BLINK = 0.15;
    let blink = 0;
    if (blinkAt >= 0) {
      const bt = t - blinkAt;
      if (bt < BLINK) blink = Math.sin((Math.PI * bt) / BLINK);
      else if (doubleBlink && bt > BLINK + 0.08 && bt < 2 * BLINK + 0.08) blink = Math.sin((Math.PI * (bt - BLINK - 0.08)) / BLINK);
      else if (bt > 2 * BLINK + 0.1) blinkAt = -1;
    }

    // springs (substep for stability on slow frames)
    const steps = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < steps; i++) {
      const h = dt / steps;
      lookX.step(h);
      lookY.step(h);
      bodyY.step(h);
      tilt.step(h);
    }

    const k = 1 - Math.exp(-dt * 16);
    const kSlow = 1 - Math.exp(-dt * 6);
    const eyeTargets = override?.eyes || p.eyes;
    eyes.forEach((e, i) => {
      const target = eyeTargets[i];
      for (const key of ["open", "happy", "closed", "rot"]) e.cur[key] += (target[key] - e.cur[key]) * k;
      const pillScale = (1 - e.cur.happy) * (1 - e.cur.closed);
      const open = e.cur.open * (1 - blink);
      e.pillWrap.scale.set(pillScale, pillScale * (0.12 + 0.88 * open), pillScale);
      e.pillWrap.visible = pillScale > 0.01;
      e.happy.scale.setScalar(e.cur.happy).z *= 0.5;
      e.happy.visible = e.cur.happy > 0.01;
      e.closed.scale.setScalar(e.cur.closed * (1 - e.cur.happy)).z *= 0.5;
      e.closed.visible = e.closed.scale.x > 0.01;
      e.spin.rotation.z = e.cur.rot;
    });
    face.glow += ((override?.glow ?? p.glow ?? 1) - face.glow) * kSlow;
    face.tint += ((p.tint || 0) - face.tint) * kSlow;
    face.float += ((p.float ?? 1) - face.float) * kSlow;
    const u = bodyMat.uniforms;
    u.uTintAmt.value = face.tint;
    u.uTime.value += dt * (still ? 0 : p.slow ? 0.4 : 1);
    u.uGlow.value = face.glow * (still ? 1 : 1 + Math.sin(t * 1.3) * 0.25);
    u.uLook.value.set(lookX.x, lookY.x);
    haloMat.opacity = clamp(0.55 * face.glow * (still ? 1 : 1 + Math.sin(t * 1.3) * 0.18), 0, 1);
    halo.position.set(root.position.x, root.position.y, -0.9);

    // body
    const speed = p.slow ? 0.9 : 1.7;
    const floatY = still ? 0 : Math.sin(t * speed) * 0.035 * face.float;
    const breathe = still ? 0 : Math.sin(t * speed + 0.6) * 0.012 * face.float;
    let shakeX = 0;
    if (shakeAt >= 0) {
      const st = t - shakeAt;
      shakeX = Math.sin(st * 38) * 0.09 * Math.exp(-st * 5.5);
      if (st > 1) shakeAt = -1;
    }
    body.rotation.y = lookX.x * 0.42;
    body.rotation.x = -lookY.x * 0.36;
    root.rotation.z = tilt.x - lookX.x * 0.05 + shakeX * 0.6;
    root.position.set(shakeX, floatY + bodyY.x, 0);
    const sq = clamp(bodyY.v * 0.04, -0.1, 0.1) + breathe;
    root.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);

    const lift = Math.max(0, root.position.y);
    const s = 1 - lift * 0.45;
    shadow.scale.set(s, s, 1);
    shadowMat.opacity = clamp(1 - lift * 0.8, 0.3, 1);

    renderer.render(scene, camera);
  }
  frame();

  function destroy() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("keydown", onActivity);
    window.removeEventListener("pointerdown", onActivity);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("click", onPoke);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    [bodyMat, white, shadowMat, haloMat].forEach((m) => m.dispose());
    shadowMat.map?.dispose();
    haloMat.map?.dispose();
    renderer.dispose();
    canvas.remove();
  }

  return {
    setState,
    getState: () => state,
    lookAtClient,
    keystroke,
    react,
    destroy,
  };
}
