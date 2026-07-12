"use client";

import { memo, useEffect, useRef } from "react";

type NeuralNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
};

const MIN_NODE_COUNT = 88;
const MAX_NODE_COUNT = 190;
const LINK_DISTANCE = 158;
const MAX_DPR = 2;

function readCssNumber(element: HTMLElement, name: string, fallback: number) {
  const raw = getComputedStyle(element).getPropertyValue(name).trim();
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readCssValue(element: HTMLElement, name: string, fallback: string) {
  return getComputedStyle(element).getPropertyValue(name).trim() || fallback;
}

export const HomeNeuralField = memo(function HomeNeuralField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes: NeuralNode[] = [];
    let raf = 0;
    let width = 0;
    let height = 0;
    let linkColor = "154, 123, 61";
    let nodeColor = "75, 52, 52";
    let linkOpacity = 0.2;
    let nodeOpacity = 0.5;

    const readPalette = () => {
      linkColor = readCssValue(canvas, "--home-neural-link-rgb", "154, 123, 61");
      nodeColor = readCssValue(canvas, "--home-neural-node-rgb", "75, 52, 52");
      linkOpacity = readCssNumber(canvas, "--home-neural-link-opacity", 0.2);
      nodeOpacity = readCssNumber(canvas, "--home-neural-node-opacity", 0.5);
    };

    const seedNodes = () => {
      nodes.length = 0;
      const densityCount = Math.round((width * height) / 18000);
      const nodeCount = Math.max(MIN_NODE_COUNT, Math.min(MAX_NODE_COUNT, densityCount));

      for (let i = 0; i < nodeCount; i += 1) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      const shouldSeed = Math.abs(nextWidth - width) > 80 || Math.abs(nextHeight - height) > 120 || nodes.length === 0;

      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readPalette();
      if (shouldSeed) seedNodes();
    };

    const draw = (animated: boolean) => {
      ctx.clearRect(0, 0, width, height);
      const now = performance.now() / 1000;

      for (const node of nodes) {
        if (animated) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < -12 || node.x > width + 12) node.vx *= -1;
          if (node.y < -12 || node.y > height + 12) node.vy *= -1;
        }
      }

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < LINK_DISTANCE) {
            const opacity = (1 - distance / LINK_DISTANCE) * linkOpacity;
            ctx.strokeStyle = `rgba(${linkColor}, ${opacity})`;
            ctx.lineWidth = 0.62;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        const pulse = nodeOpacity * (0.52 + 0.38 * (0.5 + 0.5 * Math.sin(now * 1.15 + node.phase)));
        ctx.fillStyle = `rgba(${nodeColor}, ${pulse})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.28, 0, Math.PI * 2);
        ctx.fill();
      }

      if (animated) raf = requestAnimationFrame(() => draw(true));
    };

    const refreshPalette = () => {
      readPalette();
      if (reduceMotion) draw(false);
    };

    resize();
    draw(!reduceMotion);

    const observer = new ResizeObserver(resize);
    const themeObserver = new MutationObserver(refreshPalette);
    observer.observe(canvas);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="home-flow-neural-field" aria-hidden="true" />;
});
