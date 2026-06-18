import { useEffect, useRef, useState } from "react";
import "./styles/Loading.css";
import { useLoading } from "../context/LoadingProvider";

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
  const rafRef = useRef<number>(0);
  const completedRef = useRef(false);

  useEffect(() => {
    targetRef.current = Math.min(100, Math.max(0, percent));
  }, [percent]);

  useEffect(() => {
    const tick = () => {
      setDisplay((prev) => {
        const target = targetRef.current;
        const next = prev + (target - prev) * 0.08;
        return target - next < 0.05 ? target : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (percent >= 100 && !completedRef.current) {
      completedRef.current = true;
      const t = setTimeout(() => setExiting(true), 1000);
      return () => clearTimeout(t);
    }
  }, [percent]);

  useEffect(() => {
    if (!exiting) return;
    let revealTimer: ReturnType<typeof setTimeout>;
    let doneTimer: ReturnType<typeof setTimeout>;
    import("./utils/initialFX").then((module) => {
      revealTimer = setTimeout(() => module.initialFX?.(), 250);
      doneTimer = setTimeout(() => setIsLoading(false), 1300);
    });
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
    };
  }, [exiting]);

  const rounded = Math.round(display);
  const hundreds = Math.floor(rounded / 100) % 10;
  const tens = Math.floor(rounded / 10) % 10;
  const units = rounded % 10;

  return (
    <div className={`loading-screen ${exiting ? "loading-exit" : ""}`}>
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

export const setProgress = (setLoading: (value: number) => void) => {
  let percent: number = 0;

  let interval = setInterval(() => {
    if (percent <= 50) {
      let rand = Math.round(Math.random() * 5);
      percent = percent + rand;
      setLoading(percent);
    } else {
      clearInterval(interval);
      interval = setInterval(() => {
        percent = percent + Math.round(Math.random());
        setLoading(percent);
        if (percent > 91) {
          clearInterval(interval);
        }
      }, 2000);
    }
  }, 100);

  function clear() {
    clearInterval(interval);
    setLoading(100);
  }

  function loaded() {
    return new Promise<number>((resolve) => {
      clearInterval(interval);
      interval = setInterval(() => {
        if (percent < 100) {
          percent++;
          setLoading(percent);
        } else {
          resolve(percent);
          clearInterval(interval);
        }
      }, 2);
    });
  }
  return { loaded, percent, clear };
};
