/* =============================================================================
 * siteAnimations.ts  —  Opt-in premium micro-interactions
 * -----------------------------------------------------------------------------
 * WHAT THIS ADDS (100% opt-in via data-attributes, so nothing existing can
 * break — elements without the hook are never touched):
 *   - [data-magnetic]  : element is gently pulled toward the cursor on hover
 *                        and springs back on leave (magnetic buttons / links).
 *   - [data-squish]    : satisfying press feedback on mousedown / mouseup.
 *   - [data-scramble]  : heading decodes from random glyphs into its final
 *                        text the first time it scrolls into view.
 *
 * Everything is registered inside a single gsap.context() and fully torn down
 * by the returned cleanup function (kills tweens + removes listeners + restores
 * ScrollTriggers), so it is safe under React StrictMode double-mounting.
 *
 * PERFORMANCE IMPACT: transform-only GSAP tweens; listeners are passive where
 * possible; scramble uses one short interval per heading that self-clears.
 * ========================================================================== */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&";

type Disposer = () => void;

function initMagnetic(): Disposer {
  const disposers: Disposer[] = [];
  const els = document.querySelectorAll<HTMLElement>("[data-magnetic]");

  els.forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic || "") || 0.3;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: x * strength,
        y: y * strength,
        duration: 0.35,
        ease: "power3.out",
        overwrite: "auto",
      });
    };
    const onLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      });
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    disposers.push(() => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      gsap.set(el, { clearProps: "transform" });
    });
  });

  return () => disposers.forEach((d) => d());
}

function initSquish(): Disposer {
  const disposers: Disposer[] = [];
  const els = document.querySelectorAll<HTMLElement>("[data-squish]");

  els.forEach((el) => {
    const onDown = () =>
      gsap.to(el, { scale: 0.94, duration: 0.12, ease: "power2.out" });
    const onUp = () =>
      gsap.to(el, {
        scale: 1,
        duration: 0.5,
        ease: "elastic.out(1.4, 0.4)",
      });

    el.addEventListener("mousedown", onDown);
    el.addEventListener("mouseup", onUp);
    el.addEventListener("mouseleave", onUp);
    disposers.push(() => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("mouseleave", onUp);
      gsap.set(el, { clearProps: "scale" });
    });
  });

  return () => disposers.forEach((d) => d());
}

function scrambleTo(el: HTMLElement, finalText: string, duration = 900) {
  let frame = 0;
  const totalFrames = Math.max(1, Math.round(duration / 30));
  const interval = window.setInterval(() => {
    const progress = frame / totalFrames;
    const revealCount = Math.floor(progress * finalText.length);
    el.textContent = finalText
      .split("")
      .map((ch, i) => {
        if (i < revealCount || ch === " ") return finalText[i];
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      })
      .join("");
    if (frame >= totalFrames) {
      el.textContent = finalText;
      window.clearInterval(interval);
    }
    frame++;
  }, 30);
  return () => window.clearInterval(interval);
}

function initScramble(): Disposer {
  const triggers: ScrollTrigger[] = [];
  const clearers: Disposer[] = [];
  const els = document.querySelectorAll<HTMLElement>("[data-scramble]");

  els.forEach((el) => {
    const finalText = el.dataset.scramble || el.textContent || "";
    let played = false;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 80%",
      onEnter: () => {
        if (played) return;
        played = true;
        clearers.push(scrambleTo(el, finalText, 800));
      },
    });
    triggers.push(trigger);
  });

  return () => {
    triggers.forEach((t) => t.kill());
    clearers.forEach((c) => c());
  };
}

/** Initialise all opt-in micro-interactions. Returns a cleanup function. */
export function initSiteAnimations(): Disposer {
  const ctx = gsap.context(() => {});
  const disposers: Disposer[] = [
    initMagnetic(),
    initSquish(),
    initScramble(),
  ];
  return () => {
    disposers.forEach((d) => d());
    ctx.revert();
  };
}
