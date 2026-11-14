"use client";

import { useEffect, useRef } from "react";
import { LIQUID_FRAGMENT, LIQUID_VERTEX } from "./liquidShader";

// WebGL liquid gradient behind the login card (exported from the pipeline shader tool, flow type 10) plus a fine
// overlay-blended grain tile. Decorative only — hidden from assistive tech, never takes pointer events.
// Reduced motion → draws one still frame. If WebGL is unavailable the pale base colour stays.

const COLORS = ["#fbf2fe", "#fdb5df"];
const ZOOM = 15 * 0.028 + 0.2;
const FLOW_SPEED = 8 * 0.02;
const LIQUID_STR = 100 * 0.02;
const MORPH = (22 / 100) * 3;
const ROTATION = 51 * (Math.PI / 180);
const PAN: [number, number] = [-0.08134334031751497, -0.44491228885592343];
const FLOW_TYPE = 10;
const GRAIN_TILE = 256;

function hexToRgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const noiseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = noiseRef.current;
    if (!el) return;
    const c = document.createElement("canvas");
    c.width = c.height = GRAIN_TILE;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(GRAIN_TILE, GRAIN_TILE);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.random() * 255;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    el.style.backgroundImage = `url(${c.toDataURL("image/png")})`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false });
    if (!canvas || !gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, LIQUID_VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, LIQUID_FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(pos);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

    const loc = (n: string) => gl.getUniformLocation(program, n);
    const colors = new Float32Array(8 * 3);
    COLORS.forEach((hex, i) => colors.set(hexToRgb(hex), i * 3));

    // Static uniforms, set once.
    gl.uniform1i(loc("u_colorCount"), COLORS.length);
    gl.uniform3fv(loc("u_colors"), colors);
    gl.uniform1f(loc("u_flow_type"), FLOW_TYPE);
    gl.uniform1f(loc("u_zoom"), ZOOM);
    gl.uniform2f(loc("u_pan"), PAN[0], PAN[1]);
    gl.uniform1f(loc("u_flow_speed"), FLOW_SPEED);
    gl.uniform1f(loc("u_liquid_str"), LIQUID_STR);
    gl.uniform1f(loc("u_morph"), MORPH);
    gl.uniform1f(loc("u_rotation"), ROTATION);
    gl.uniform1i(loc("u_enable_art"), 0);
    gl.uniform1f(loc("u_art_type"), 3);
    gl.uniform1f(loc("u_art_size"), 1.5);
    gl.uniform1f(loc("u_art_shape"), 1);
    gl.uniform1f(loc("u_art_contrast"), 0);
    gl.uniform1i(loc("u_bg_texture"), 0);
    gl.uniform1i(loc("u_has_bg_texture"), 0);
    gl.uniform1i(loc("u_color_mode"), 1);
    gl.uniform1f(loc("u_blend_bias"), 0.5);
    gl.uniform1f(loc("u_blend_sharp"), 0);

    // The shader scales by the first-seen height, so the pattern keeps its size when the window is resized.
    let refHeight = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      if (!refHeight) refHeight = canvas.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(loc("u_resolution"), canvas.width, canvas.height);
      gl.uniform1f(loc("u_ref_height"), refHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const draw = (ms: number) => {
      gl.uniform1f(loc("u_time"), ms * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reduced.matches) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-surface-accent">
      <canvas ref={canvasRef} className="block size-full" />
      <div ref={noiseRef} className="absolute inset-0 bg-repeat opacity-[0.258] mix-blend-overlay" style={{ backgroundSize: "128px 128px" }} />
    </div>
  );
}
