"use client";

import { useEffect, useRef } from "react";

const GOLD = "206, 174, 127";

/** خلفية دخول متوافقة مع تجربة WASHA AI */
export function CyberAuthBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationId: number;
        let width = 0;
        let height = 0;
        let particles: { x: number; y: number; vx: number; vy: number; phase: number }[] = [];
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            particles = [];
            const count = Math.min(54, Math.max(28, Math.floor((width * height) / 22000)));
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.18,
                    vy: (Math.random() - 0.5) * 0.18,
                    phase: Math.random() * Math.PI * 2,
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, width, height);
            const now = performance.now() / 1000;

            const gridSize = 64;
            ctx.strokeStyle = `rgba(${GOLD}, 0.035)`;
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            for (const p of particles) {
                if (!reduceMotion) {
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < 0 || p.x > width) p.vx *= -1;
                    if (p.y < 0 || p.y > height) p.vy *= -1;
                }
            }

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i];
                    const b = particles[j];
                    const dist = Math.hypot(a.x - b.x, a.y - b.y);
                    if (dist < 148) {
                        ctx.strokeStyle = `rgba(${GOLD}, ${(1 - dist / 148) * 0.13})`;
                        ctx.lineWidth = 0.7;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            for (const p of particles) {
                const pulse = 0.48 + 0.3 * Math.sin(now + p.phase);
                ctx.fillStyle = `rgba(${GOLD}, ${Math.max(0.22, pulse)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.15, 0, Math.PI * 2);
                ctx.fill();
            }

            if (!reduceMotion) {
                animationId = requestAnimationFrame(draw);
            }
        };

        resize();
        window.addEventListener("resize", resize);
        draw();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <>
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse at 50% 40%, rgba(20,17,13,0.92) 0%, rgba(12,10,8,0.88) 44%, rgba(6,5,4,1) 100%)",
                }}
            />
            <div
                className="absolute inset-0 opacity-80"
                style={{
                    background:
                        `linear-gradient(180deg, rgba(6,5,4,0.82) 0%, rgba(6,5,4,0.16) 42%, rgba(6,5,4,0.92) 100%), radial-gradient(ellipse at 50% 34%, rgba(${GOLD}, 0.09) 0%, transparent 48%)`,
                }}
            />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full opacity-75"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                }}
            />
        </>
    );
}
