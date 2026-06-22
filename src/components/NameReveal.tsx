import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./styles/NameReveal.css";
const WORDS = ["HARSHVARDHAN", "SINGH"];

type Letter = {
  body: Matter.Body;
  char: string;
  w: number;
  h: number;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const NameReveal = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const {
      Engine,
      Runner,
      World,
      Bodies,
      Body,
      Composite,
      Mouse,
      MouseConstraint,
      Events,
    } = Matter;

    const engine = Engine.create();
    engine.gravity.y = 0; // hold the name readable, then drop it

    const runner = Runner.create();
    Runner.run(runner, engine);

    let letters: Letter[] = [];
    let walls: Matter.Body[] = [];
    let W = 0;
    let H = 0;
    let dpr = 1;
    let gravityTimer = 0;

    const buildScene = () => {
      const rect = stage.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      if (W === 0 || H === 0) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      Composite.remove(engine.world, [...walls, ...letters.map((l) => l.body)]);
      walls = [];
      letters = [];

      const longest = Math.max(...WORDS.map((w) => w.length));
      const size = Math.max(36, Math.min((W * 0.92) / longest, H / 4.5, 130));
      const boxW = size * 0.8;
      const boxH = size;
      const gap = boxW * 1.06;

      WORDS.forEach((word, line) => {
        const totalW = (word.length - 1) * gap;
        const startX = W / 2 - totalW / 2;
        const baseY =
          H / 2 - boxH * 0.6 + line * boxH * 1.18 - (WORDS.length - 1) * 4;
        word.split("").forEach((char, i) => {
          const body = Bodies.rectangle(startX + i * gap, baseY, boxW, boxH, {
            restitution: 0.5,
            friction: 0.3,
            frictionAir: 0.015,
            chamfer: { radius: Math.min(boxW, boxH) * 0.2 },
          });
          letters.push({ body, char, w: boxW, h: boxH });
        });
      });

      const t = 400;
      walls = [
        Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, { isStatic: true }),
        Bodies.rectangle(-t / 2, H / 2, t, H * 3, { isStatic: true }),
        Bodies.rectangle(W + t / 2, H / 2, t, H * 3, { isStatic: true }),
      ];

      World.add(engine.world, [...walls, ...letters.map((l) => l.body)]);

      window.clearTimeout(gravityTimer);
      engine.gravity.y = 0;
      gravityTimer = window.setTimeout(() => {
        engine.gravity.y = 1;
        letters.forEach((l) => {
          Body.setAngularVelocity(l.body, (Math.random() - 0.5) * 0.05);
          Body.applyForce(l.body, l.body.position, {
            x: (Math.random() - 0.5) * 0.004 * l.body.mass,
            y: 0,
          });
        });
      }, 1600);
    };

    buildScene();

    const enableDrag = ScrollTrigger.isTouch !== 1;
    if (enableDrag) {
      const mouse = Mouse.create(canvas);
      (mouse as unknown as { pixelRatio: number }).pixelRatio = dpr;
      const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.18, render: { visible: false } },
      });
      World.add(engine.world, mouseConstraint);

      Events.on(mouseConstraint, "startdrag", () => {
        canvas.style.cursor = "grabbing";
      });
      Events.on(mouseConstraint, "enddrag", () => {
        canvas.style.cursor = "grab";
      });
    }
    let raf = 0;
    let visible = true;
    let paused = false;

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && paused) {
          paused = false;
          Runner.run(runner, engine);
          scheduleDraw();
        } else if (!visible && !paused) {
          paused = true;
          Runner.stop(runner);
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: "100px" }
    );
    visibilityObserver.observe(stage);

    const scheduleDraw = () => {
      if (!visible) return;
      raf = requestAnimationFrame(draw);
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const { body, char, w, h } of letters) {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        const r = Math.min(w, h) * 0.2;
        roundRect(ctx, -w / 2, -h / 2, w, h, r);
        const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        grad.addColorStop(0, "#c7b1ff");
        grad.addColorStop(1, "#7a4be0");
        ctx.fillStyle = grad;
        ctx.shadowColor = "rgba(84, 0, 255, 0.35)";
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
        ctx.fill();

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.stroke();

        ctx.fillStyle = "#160a2b";
        ctx.font = `800 ${h * 0.52}px Geist, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(char, 0, h * 0.04);
        ctx.restore();
      }
      scheduleDraw();
    };
    scheduleDraw();

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(buildScene, 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(gravityTimer);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      visibilityObserver.disconnect();
      cancelAnimationFrame(raf);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);

  return (
    <div className="name-reveal-section" id="name">
      <div className="name-reveal-head">
        <span className="name-reveal-kicker">The Name</span>
        <span className="name-reveal-hint">drag · throw · play</span>
      </div>
      <div className="name-reveal-stage" ref={stageRef}>
        <canvas className="name-reveal-canvas" ref={canvasRef} />
      </div>
    </div>
  );
};

export default NameReveal;
