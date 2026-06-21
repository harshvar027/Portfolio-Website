import { useEffect, useRef, useState } from "react";

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  r: number;
};

const PROMPTS = [
  "Generate a hero illustration…",
  "Summarize this 40-page report…",
  "Refactor my React component…",
  "Compose an ambient soundtrack…",
];

const NeuralAI = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typed, setTyped] = useState("");

  // typewriter prompt loop
  useEffect(() => {
    let promptIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer: number;

    const loop = () => {
      const full = PROMPTS[promptIdx];
      if (!deleting) {
        charIdx++;
        setTyped(full.slice(0, charIdx));
        if (charIdx >= full.length) {
          deleting = true;
          timer = window.setTimeout(loop, 1400);
          return;
        }
        timer = window.setTimeout(loop, 55);
      } else {
        charIdx--;
        setTyped(full.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          promptIdx = (promptIdx + 1) % PROMPTS.length;
          timer = window.setTimeout(loop, 350);
          return;
        }
        timer = window.setTimeout(loop, 25);
      }
    };
    timer = window.setTimeout(loop, 500);
    return () => window.clearTimeout(timer);
  }, []);

  // neural network canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let nodes: Node[] = [];
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio, 2);

    const build = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(26, Math.floor((w * h) / 9000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        hue: 200 + Math.random() * 120,
        r: 1.2 + Math.random() * 2.2,
      }));
    };
    build();

    const ro = new ResizeObserver(build);
    ro.observe(canvas);

    let visible = true;
    const io = new IntersectionObserver(
      ([e]) => (visible = e.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(canvas);

    let raf = 0;
    let t = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      t += 0.01;
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      // connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.5;
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 90%, 65%, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // travelling signal pulse
            const p = (Math.sin(t * 2 + i * 0.7) + 1) / 2;
            const px = a.x + (b.x - a.x) * p;
            const py = a.y + (b.y - a.y) * p;
            ctx.fillStyle = `hsla(${a.hue}, 100%, 75%, ${alpha + 0.2})`;
            ctx.beginPath();
            ctx.arc(px, py, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
        glow.addColorStop(0, `hsla(${n.hue}, 100%, 70%, 0.9)`);
        glow.addColorStop(1, `hsla(${n.hue}, 100%, 70%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsl(${n.hue}, 100%, 85%)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div className="sc sc-ai" data-cursor="disable">
      <canvas ref={canvasRef} className="sc-ai-canvas" />
      <div className="sc-ai-ui">
        <div className="sc-ai-header">
          <div className="sc-ai-badge">
            <span className="sc-ai-pulse" /> AI Engine · online
          </div>
          <div className="sc-ai-chips">
            <span>Vision</span>
            <span>LLM</span>
            <span>Audio</span>
          </div>
        </div>
        <div className="sc-ai-prompt">
          <span className="sc-ai-spark">✦</span>
          <span className="sc-ai-text">
            {typed}
            <span className="sc-ai-caret" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default NeuralAI;
