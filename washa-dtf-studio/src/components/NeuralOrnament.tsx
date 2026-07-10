// Static neural lattice — echoes the WASHA AI intro (/design/washa-ai),
// frozen in place so it costs nothing at runtime (no canvas, no animation).
// A radial mask keeps the central working area clean; the nodes only
// breathe around the edges of the workbench.

type Pt = { x: number; y: number };

// Deterministic layout (seeded) so the pattern is stable across renders.
const NODES: Pt[] = (() => {
    let s = 0x9e3779b9;
    const rnd = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pts: Pt[] = [];
    for (let i = 0; i < 34; i++) pts.push({ x: rnd() * 1000, y: rnd() * 1000 });
    return pts;
})();

const LINKS: [number, number][] = (() => {
    const out: [number, number][] = [];
    for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
            const dx = NODES[i].x - NODES[j].x;
            const dy = NODES[i].y - NODES[j].y;
            if (Math.hypot(dx, dy) < 215) out.push([i, j]);
        }
    }
    return out;
})();

const MASK =
    "radial-gradient(ellipse 62% 66% at 50% 44%, transparent 0%, transparent 34%, black 82%)";

export default function NeuralOrnament() {
    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0"
            style={{ maskImage: MASK, WebkitMaskImage: MASK }}
        >
            <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="xMidYMid slice"
            >
                <g stroke="rgba(64, 48, 40, 0.05)" strokeWidth={1}>
                    {LINKS.map(([a, b], k) => (
                        <line
                            key={k}
                            x1={NODES[a].x}
                            y1={NODES[a].y}
                            x2={NODES[b].x}
                            y2={NODES[b].y}
                        />
                    ))}
                </g>
                <g fill="rgba(143, 116, 100, 0.16)">
                    {NODES.map((n, k) => (
                        <circle key={k} cx={n.x} cy={n.y} r={2.4} />
                    ))}
                </g>
            </svg>
        </div>
    );
}
