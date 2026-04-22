"use client";

import { useEffect, useRef, useState } from "react";

type WushaShaderBackgroundProps = {
  onReady?: () => void;
};

type ClickWave = {
  x: number;
  y: number;
  startedAt: number;
};

type Rgb = readonly [number, number, number];

type ShaderPalette = {
  base: Rgb;
  accent: Rgb;
  highlight: Rgb;
  warm: Rgb;
};

const MAX_CLICKS = 6;
const CLICK_LIFETIME_MS = 3500;
const DEFAULT_PALETTE: ShaderPalette = {
  base: [0.102, 0.173, 0.251],
  accent: [0.706, 0.216, 0.145],
  highlight: [0.98, 0.953, 0.902],
  warm: [0.85, 0.38, 0.28],
};

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const PLASMA_NEBULA_SHADER_SOURCE = `
precision highp float;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform float u_time;
uniform vec3 u_clicks[6];
uniform vec3 u_base_color;
uniform vec3 u_accent_color;
uniform vec3 u_highlight_color;
uniform vec3 u_warm_color;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0 - 2.0*f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 m = u_mouse / u_res;
  m.y = 1.0 - m.y;
  uv.y = 1.0 - uv.y;

  vec2 d = m - uv;
  float dist = length(d);
  vec2 warp = d * 0.18 / (dist * dist + 0.06);

  for (int i = 0; i < 6; i++) {
    if (u_clicks[i].z < 0.0) continue;
    vec2 cp = vec2(u_clicks[i].x / u_res.x, 1.0 - u_clicks[i].y / u_res.y);
    float age = u_clicks[i].z;
    float r = age * 1.4;
    float cd = length(uv - cp);
    float ring = exp(-pow(cd - r, 2.0) * 50.0) * (1.0 - age);
    warp += normalize(uv - cp + 0.0001) * ring * 0.1;
  }

  vec2 p = uv * 3.5 + vec2(u_time * 0.07, u_time * 0.04);
  p += warp;
  float f1 = fbm(p + 1.8 * fbm(p + 0.9 * fbm(p)));
  float f2 = fbm(p * 0.7 - vec2(u_time * 0.05));

  vec3 c0 = u_base_color;
  vec3 c1 = u_accent_color;
  vec3 c2 = u_highlight_color;
  vec3 c3 = u_warm_color;

  vec3 col = mix(c0, c1, f1);
  col = mix(col, c2, clamp(f1 * f2 * 1.6, 0.0, 1.0));
  col = mix(col, c3, smoothstep(0.58, 1.0, f2) * 0.55);
  col += u_highlight_color * 0.05 / (dist + 0.025);
  col = pow(max(col, vec3(0.0)), vec3(0.88));
  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("WUSHA shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, PLASMA_NEBULA_SHADER_SOURCE);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("WUSHA shader link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest("a, button, input, textarea, select, [role='button'], [data-shader-ignore]"))
    : false;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function mixColor(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = clamp01(amount);
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function shadeColor(color: Rgb, amount: number): Rgb {
  return [
    clamp01(color[0] * amount),
    clamp01(color[1] * amount),
    clamp01(color[2] * amount),
  ];
}

function luminance(color: Rgb) {
  return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
}

function resolveCssColor(
  probe: HTMLSpanElement,
  value: string,
  fallback: Rgb,
): Rgb {
  if (!value) return fallback;

  probe.style.color = "";
  probe.style.color = value;

  const resolved = getComputedStyle(probe).color;
  const values = resolved.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!values || values.length < 3 || values.some((entry) => Number.isNaN(entry))) {
    return fallback;
  }

  const divisor = values.some((entry) => entry > 1) ? 255 : 1;
  return [
    clamp01(values[0] / divisor),
    clamp01(values[1] / divisor),
    clamp01(values[2] / divisor),
  ];
}

function readThemePalette(probe: HTMLSpanElement): ShaderPalette {
  const rootStyle = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: Rgb) =>
    resolveCssColor(probe, rootStyle.getPropertyValue(name).trim(), fallback);

  const bg = read("--wusha-bg", DEFAULT_PALETTE.base);
  const surface = read("--wusha-surface", DEFAULT_PALETTE.highlight);
  const earth = read("--wusha-earth", [0.353, 0.243, 0.169]);
  const gold = read("--wusha-gold", [0.604, 0.482, 0.239]);
  const goldLight = read("--wusha-gold-light", [0.722, 0.588, 0.31]);
  const lightMode = luminance(bg) > 0.55;

  return {
    base: lightMode
      ? mixColor(shadeColor(earth, 0.34), shadeColor(bg, 0.18), 0.24)
      : mixColor(bg, shadeColor(earth, 0.36), 0.28),
    accent: lightMode
      ? mixColor(earth, gold, 0.34)
      : mixColor(gold, earth, 0.45),
    highlight: lightMode
      ? mixColor(surface, goldLight, 0.36)
      : mixColor(goldLight, surface, 0.18),
    warm: lightMode
      ? mixColor(goldLight, gold, 0.48)
      : mixColor(goldLight, gold, 0.35),
  };
}

function setUniformColor(
  gl: WebGLRenderingContext,
  location: WebGLUniformLocation | null,
  color: Rgb,
) {
  if (!location) return;
  gl.uniform3f(location, color[0], color[1], color[2]);
}

export function WushaShaderBackground({ onReady }: WushaShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasReportedReady = useRef(false);
  const [canRenderShader, setCanRenderShader] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reportReady = () => {
      if (hasReportedReady.current) return;
      hasReportedReady.current = true;
      onReady?.();
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      setCanRenderShader(false);
      reportReady();
      return undefined;
    }

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      stencil: false,
    });

    if (!gl) {
      setCanRenderShader(false);
      reportReady();
      return undefined;
    }

    const program = createProgram(gl);
    const quad = gl.createBuffer();
    if (!program || !quad) {
      if (program) gl.deleteProgram(program);
      setCanRenderShader(false);
      reportReady();
      return undefined;
    }

    const positionLocation = gl.getAttribLocation(program, "a_pos");
    const resolutionLocation = gl.getUniformLocation(program, "u_res");
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const clicksLocation = gl.getUniformLocation(program, "u_clicks[0]");
    const baseColorLocation = gl.getUniformLocation(program, "u_base_color");
    const accentColorLocation = gl.getUniformLocation(program, "u_accent_color");
    const highlightColorLocation = gl.getUniformLocation(program, "u_highlight_color");
    const warmColorLocation = gl.getUniformLocation(program, "u_warm_color");

    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;
    let clickWaves: ClickWave[] = [];
    const startedAt = performance.now();
    const mouse = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.45,
    };
    const colorProbe = document.createElement("span");
    colorProbe.setAttribute("aria-hidden", "true");
    colorProbe.style.display = "none";
    document.body.appendChild(colorProbe);

    let palette = readThemePalette(colorProbe);
    const refreshPalette = () => {
      palette = readThemePalette(colorProbe);
    };
    const themeObserver = new MutationObserver(refreshPalette);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(window.innerWidth * dpr));
      height = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, width, height);
    };

    const handlePointerMove = (event: PointerEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (isInteractiveElement(event.target)) return;
      clickWaves.push({
        x: event.clientX,
        y: event.clientY,
        startedAt: performance.now(),
      });
      if (clickWaves.length > MAX_CLICKS) {
        clickWaves = clickWaves.slice(clickWaves.length - MAX_CLICKS);
      }
    };

    const render = (now: number) => {
      const elapsedSeconds = (now - startedAt) / 1000;
      clickWaves = clickWaves.filter((wave) => now - wave.startedAt < CLICK_LIFETIME_MS);

      gl.useProgram(program);

      if (positionLocation >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      }

      if (resolutionLocation) gl.uniform2f(resolutionLocation, width, height);
      if (mouseLocation) gl.uniform2f(mouseLocation, mouse.x * dpr, mouse.y * dpr);
      if (timeLocation) gl.uniform1f(timeLocation, elapsedSeconds);
      setUniformColor(gl, baseColorLocation, palette.base);
      setUniformColor(gl, accentColorLocation, palette.accent);
      setUniformColor(gl, highlightColorLocation, palette.highlight);
      setUniformColor(gl, warmColorLocation, palette.warm);

      if (clicksLocation) {
        const clickData: number[] = [];
        for (let i = 0; i < MAX_CLICKS; i++) {
          const wave = clickWaves[i];
          if (wave) {
            const age = Math.min((now - wave.startedAt) / CLICK_LIFETIME_MS, 1);
            clickData.push(wave.x * dpr, wave.y * dpr, age);
          } else {
            clickData.push(0, 0, -1);
          }
        }
        gl.uniform3fv(clicksLocation, new Float32Array(clickData));
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      reportReady();
      frameId = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      themeObserver.disconnect();
      colorProbe.remove();
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
    };
  }, [onReady]);

  return (
    <div className="shader-wallpaper-bg" aria-hidden="true">
      <div className="shader-wallpaper-fallback" />
      <canvas
        ref={canvasRef}
        className={canRenderShader ? "shader-wallpaper-canvas" : "hidden"}
      />
    </div>
  );
}
