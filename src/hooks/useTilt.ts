import { useCallback, useRef } from "react";

type TiltOptions = {
  maxTilt?: number;
  scale?: number;
  depth?: number;
  /** Multiplier on pointer offset (lower = subtler motion). Default 2 */
  tiltMultiplier?: number;
  glare?: boolean;
  hoverOnly?: boolean;
};

export function useTilt<T extends HTMLElement = HTMLDivElement>({
  maxTilt = 14,
  scale = 1.02,
  depth = 24,
  tiltMultiplier = 2,
  hoverOnly = false,
}: TiltOptions = {}) {
  const ref = useRef<T>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const hoveredRef = useRef(false);

  const setTransform = useCallback(
    (rotateX: number, rotateY: number, s: number, gx = 50, gy = 50) => {
      const inner = innerRef.current;
      if (!inner) return;
      const lift = s > 1 ? depth * (s - 1) * 4 : 0;
      inner.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${lift}px) scale3d(${s}, ${s}, ${s})`;
      const glare = glareRef.current;
      if (glare) {
        glare.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.22) 0%, transparent 58%)`;
        glare.style.opacity = s > 1 ? "1" : "0";
      }
      const shadow = shadowRef.current;
      if (shadow) {
        const sx = (gx - 50) * 0.12;
        const sy = (gy - 50) * 0.12 + 8;
        shadow.style.transform = `translate(${sx}px, ${sy}px)`;
        shadow.style.opacity = s > 1 ? "0.55" : hoveredRef.current ? "0.35" : "0.15";
      }
    },
    [depth]
  );

  const resetTransform = useCallback(() => {
    const inner = innerRef.current;
    if (inner) {
      inner.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)";
    }
    const glare = glareRef.current;
    if (glare) glare.style.opacity = "0";
    const shadow = shadowRef.current;
    if (shadow) {
      shadow.style.opacity = hoveredRef.current ? "0.2" : "0.1";
      shadow.style.transform = "translate(0px, 8px)";
    }
  }, []);

  const onEnter = useCallback(() => {
    hoveredRef.current = true;
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent<T>) => {
      if (hoverOnly && !hoveredRef.current) return;
      const el = ref.current;
      if (!el) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const px = x / rect.width;
        const py = y / rect.height;
        const rotateX = (py - 0.5) * -tiltMultiplier * maxTilt;
        const rotateY = (px - 0.5) * tiltMultiplier * maxTilt;
        setTransform(rotateX, rotateY, scale, px * 100, py * 100);
      });
    },
    [hoverOnly, maxTilt, scale, tiltMultiplier, setTransform]
  );

  const onLeave = useCallback(() => {
    hoveredRef.current = false;
    cancelAnimationFrame(rafRef.current);
    resetTransform();
  }, [resetTransform]);

  return { ref, innerRef, glareRef, shadowRef, onEnter, onMove, onLeave };
}
