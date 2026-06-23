import { useEffect, useRef, useState, type RefObject } from "react";
import { smoother } from "../components/utils/scrollSmoother";

export type AnchorState = {
  width: number;
  height: number;
  visible: boolean;
};

const VISIBILITY_MARGIN = 160;

const getScrollPos = () => smoother?.scrollTop() ?? window.scrollY;

/**
 * Keeps a fixed-position host element aligned with a DOM anchor (works with
 * GSAP ScrollSmoother). Skips layout reads when scroll position is unchanged.
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
  const lastScroll = useRef(-1);

  useEffect(() => {
    let raf = 0;
    let active = true;
    let forceNext = true;

    const sync = () => {
      if (!active) return;

      const scroll = getScrollPos();
      if (!forceNext && scroll === lastScroll.current) return;
      forceNext = false;
      lastScroll.current = scroll;

      const el = document.getElementById(anchorId);
      const host = hostRef.current;
      if (!el || !host) return;

      const r = el.getBoundingClientRect();
      const visible =
        r.bottom > -VISIBILITY_MARGIN &&
        r.top < window.innerHeight + VISIBILITY_MARGIN;

      host.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
      host.style.visibility = visible ? "visible" : "hidden";

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
    };

    const loop = () => {
      if (!active) return;
      sync();
      raf = requestAnimationFrame(loop);
    };

    const markDirty = () => {
      forceNext = true;
    };

    const anchorEl = document.getElementById(anchorId);
    const resizeObserver =
      anchorEl && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(markDirty)
        : null;
    resizeObserver?.observe(anchorEl!);

    window.addEventListener("resize", markDirty, { passive: true });
    raf = requestAnimationFrame(loop);
    sync();

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", markDirty);
      resizeObserver?.disconnect();
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
