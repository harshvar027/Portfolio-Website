import { useEffect, useRef, useState } from "react";
import "./styles/Loading.css";
import { useLoading } from "../context/LoadingProvider";
import { revealSite, runLandingTextFX } from "./utils/initialFX";

const PHRASES = [
  "WEB DEV",
  "FULL-STACK DEV",
  "WEB ARCHITECTURE",
  "UI ENGINEERING",
  "CREATIVE DEV",
  "3D / MOTION",
];

const REEL = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

const FallReel = ({ value, active }: { value: number; active: boolean }) => (
  <span className={`loading-reel ${active ? "" : "loading-reel-idle"}`}>
    <span
      className="loading-reel-track"
      style={{ transform: `translateY(${-(9 - value)}em)` }}
    >
      {REEL.map((n) => (
        <span className="loading-reel-digit" key={n}>
          {n}
        </span>
      ))}
    </span>
  </span>
);

const Loading = ({ percent }: { percent: number }) => {
  const { setIsLoading } = useLoading();
  const [display, setDisplay] = useState(0);
  const [exiting, setExiting] = useState(false);

  const targetRef = useRef(0);
  const displayRef = useRef(0);
  const rafRef = useRef<number>(0);
  const completedRef = useRef(false);

  useEffect(() => {
    targetRef.current = Math.min(100, Math.max(0, percent));
  }, [percent]);

  useEffect(() => {
    let lastUiUpdate = 0;

    const tick = () => {
      const target = targetRef.current;
      const prev = displayRef.current;
      const next = prev + (target - prev) * 0.08;
      const settled = target - next < 0.05;
      displayRef.current = settled ? target : next;

      const now = performance.now();
      if (settled || now - lastUiUpdate > 90) {
        lastUiUpdate = now;
        setDisplay(Math.round(displayRef.current));
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (percent >= 100 && !completedRef.current) {
      completedRef.current = true;
      document.body.classList.add("site-revealing");
      const t = setTimeout(() => setExiting(true), 120);
      return () => clearTimeout(t);
    }
  }, [percent]);

  useEffect(() => {
    if (!exiting) return;

    let cancelled = false;
    let textTimer: ReturnType<typeof setTimeout>;
    let revealTimer: ReturnType<typeof setTimeout>;

    window.dispatchEvent(new CustomEvent("site-reveal"));
    revealSite();

    requestAnimationFrame(() => {
      if (cancelled) return;
      setIsLoading(false);
    });

    textTimer = setTimeout(() => {
      if (cancelled) return;
      runLandingTextFX();
    }, 120);

    revealTimer = setTimeout(() => {
      if (cancelled) return;
      document.body.classList.remove("site-revealing");
    }, 650);

    return () => {
      cancelled = true;
      clearTimeout(textTimer);
      clearTimeout(revealTimer);
      document.body.classList.remove("site-revealing");
    };
  }, [exiting, setIsLoading]);

  const rounded = Math.round(display);
  const hundreds = Math.floor(rounded / 100) % 10;
  const tens = Math.floor(rounded / 10) % 10;
  const units = rounded % 10;

  return (
    <div className={`loading-screen ${exiting ? "loading-exit" : ""}`}>
      <div className="loading-curtain" aria-hidden="true"></div>
      <div className="loading-grid"></div>

      <div className="loading-header">
        <a href="/#" className="loader-title" data-cursor="disable">
          <img
            src="/images/logo.png"
            alt="Harshvardhan — Designer, Developer, Creator"
            className="loader-logo"
          />
        </a>
        <span className="loading-tag">Portfolio · 2026</span>
      </div>

      <div className="loading-stage">
        <div className="loading-dominos">
          {[...Array(5)].map((_, i) => (
            <div
              className="loading-window"
              style={{ animationDelay: `${i * 0.16}s` }}
              key={i}
            >
              <span className="window-bar">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span className="window-body">
                <b></b>
                <b></b>
                <b></b>
              </span>
            </div>
          ))}
          <span className="loading-floor"></span>
        </div>
      </div>

      <div className="loading-foot">
        <div className="loading-foot-left">
          <span className="loading-label">Loading</span>
          <div className="loading-counter" aria-label={`${rounded} percent`}>
            <FallReel value={hundreds} active={rounded >= 100} />
            <FallReel value={tens} active={rounded >= 10} />
            <FallReel value={units} active={true} />
            <span className="loading-percent">%</span>
          </div>
        </div>

        <div className="loading-ticker">
          <div className="loading-ticker-track">
            {[...PHRASES, ...PHRASES].map((p, i) => (
              <span className="loading-ticker-item" key={i}>
                <em></em>
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="loading-bar">
        <div
          className="loading-bar-fill"
          style={{ transform: `scaleX(${display / 100})` }}
        >
          <span className="loading-bar-glow"></span>
        </div>
      </div>
    </div>
  );
};

export default Loading;

export type ProgressHandle = {
  setMilestone: (value: number) => void;
  loaded: () => Promise<number>;
  clear: () => void;
};

export const setProgress = (
  setLoading: (value: number) => void
): ProgressHandle => {
  let displayed = 0;
  let target = 8;
  let finishing = false;
  let interval: ReturnType<typeof setInterval>;

  interval = setInterval(() => {
    if (finishing || displayed >= target) return;

    const gap = target - displayed;
    const step = Math.max(1, Math.ceil(gap * (displayed < 50 ? 0.25 : 0.2)));
    displayed = Math.min(target, displayed + step);
    setLoading(displayed);
  }, 100);

  function setMilestone(value: number) {
    target = Math.max(target, Math.min(100, value));
    if (target > displayed && !finishing) {
      const gap = target - displayed;
      const step = Math.max(1, Math.ceil(gap * 0.35));
      displayed = Math.min(target, displayed + step);
      setLoading(displayed);
    }
  }

  function clear() {
    finishing = true;
    clearInterval(interval);
    setLoading(100);
  }

  function loaded() {
    if (finishing) {
      return Promise.resolve(100);
    }
    finishing = true;
    clearInterval(interval);
    displayed = 100;
    target = 100;
    setLoading(100);
    return Promise.resolve(100);
  }

  return { setMilestone, loaded, clear };
};
