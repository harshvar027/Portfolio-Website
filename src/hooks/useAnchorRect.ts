import { useEffect, useRef, useState, type RefObject } from "react";

export type AnchorState = {
  width: number;
  height: number;
  visible: boolean;
};

const OFFSCREEN_POLL_MS = 300;

/**
 * Keeps a fixed-position host element aligned with a DOM anchor (works with
 * GSAP ScrollSmoother). Position is written imperatively every frame to avoid
 * React re-renders; React state only updates when size/visibility changes.
 */
export function useAnchorSync(
  anchorId: string,
  hostRef: RefObject<HTMLElement>
): AnchorState {
  const [state, setState] = useState<AnchorState>({
    width: 0,
    height: 0,
    visible: false,
  });
  const last = useRef({ width: -1, height: -1, visible: false });
  const timerRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let active = true;

    const update = () => {
      if (!active) return;

      const el = document.getElementById(anchorId);
      const host = hostRef.current;
      if (!el || !host) {
        timerRef.current = window.setTimeout(update, OFFSCREEN_POLL_MS);
        return;
      }

      const r = el.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight;

      if (visible) {
        host.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
        host.style.visibility = "visible";

        const prev = last.current;
        if (
          Math.abs(r.width - prev.width) > 0.5 ||
          Math.abs(r.height - prev.height) > 0.5 ||
          visible !== prev.visible
        ) {
          last.current = { width: r.width, height: r.height, visible };
          host.style.width = `${r.width}px`;
          host.style.height = `${r.height}px`;
          setState({ width: r.width, height: r.height, visible });
        }

        raf = requestAnimationFrame(update);
        return;
      }

      host.style.visibility = "hidden";
      if (last.current.visible) {
        last.current = { ...last.current, visible: false };
        setState((s) => ({ ...s, visible: false }));
      }

      timerRef.current = window.setTimeout(update, OFFSCREEN_POLL_MS);
    };

    raf = requestAnimationFrame(update);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timerRef.current);
    };
  }, [anchorId, hostRef]);

  return state;
}

export const anchorHostBaseStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  zIndex: 1,
  pointerEvents: "none" as const,
  visibility: "hidden" as const,
  overflow: "hidden" as const,
};
