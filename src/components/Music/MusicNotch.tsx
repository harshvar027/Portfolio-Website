import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMusicReactive } from "../../context/MusicReactiveContext";
import "./MusicNotch.css";

const COMPACT_BARS = 5;
const EXPANDED_BARS = 12;
const LERP = 0.08;

const MusicNotch = () => {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const {
    isPlaying,
    activeTrack,
    metrics,
    openMusicSearch,
    stop,
  } = useMusicReactive();

  const compactBarRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const expandedBarRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const metricsRef = useRef(metrics);
  const heightsRef = useRef<number[]>(
    Array.from({ length: EXPANDED_BARS }, () => 0.32)
  );

  metricsRef.current = metrics;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const { bass, mid, treble, energy, beat } = metricsRef.current;
      const t = (now - start) / 1000;

      for (let i = 0; i < EXPANDED_BARS; i++) {
        const phase = t * 1.15 + i * 0.42;
        const wave =
          0.48 +
          Math.sin(phase) * 0.22 +
          Math.sin(phase * 0.47 + 1.2) * 0.1;
        const band = i < 4 ? bass : i < 8 ? mid : treble;
        const beatBoost = beat ? 0.12 : 0;
        const target = Math.min(
          1,
          Math.max(0.18, 0.22 + band * 0.5 + energy * 0.22 + wave * 0.28 + beatBoost)
        );
        heightsRef.current[i] +=
          (target - heightsRef.current[i]) * LERP;
      }

      compactBarRefs.current.forEach((el, i) => {
        if (!el) return;
        const h = heightsRef.current[i] ?? 0.3;
        el.style.transform = `scaleY(${h})`;
        el.style.opacity = String(0.55 + h * 0.45);
      });

      expandedBarRefs.current.forEach((el, i) => {
        if (!el) return;
        const h = heightsRef.current[i] ?? 0.3;
        el.style.transform = `scaleY(${h})`;
        el.style.opacity = String(0.5 + h * 0.5);
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  if (!mounted || !isPlaying || !activeTrack) return null;

  const notchClass = [
    "music-notch",
    hovered && !expanded ? "music-notch-hovered" : "",
    expanded ? "music-notch-expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      className={notchClass}
      role="region"
      aria-label={`Now playing: ${activeTrack.name} by ${activeTrack.artists}`}
    >
      <button
        type="button"
        className="music-notch-shell"
        data-cursor="disable"
        onClick={() => setExpanded((v) => !v)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        aria-expanded={expanded}
      >
        <div className="music-notch-shadow" aria-hidden="true" />
        <div className="music-notch-compact">
          <div className="music-notch-border-ring" aria-hidden="true" />
          <div className="music-notch-row">
              {activeTrack.albumArt ? (
                <img
                  className="music-notch-art"
                  src={activeTrack.albumArt}
                  alt=""
                />
              ) : (
                <span className="music-notch-art-fallback">♪</span>
              )}

              <div className="music-notch-wave" aria-hidden="true">
                {Array.from({ length: COMPACT_BARS }).map((_, i) => (
                  <span
                    key={i}
                    ref={(el) => {
                      compactBarRefs.current[i] = el;
                    }}
                    className="music-notch-bar"
                  />
                ))}
              </div>

              <div className="music-notch-marquee">
                <span className="music-notch-marquee-track">
                  {activeTrack.name} — {activeTrack.artists}
                </span>
              </div>

              <div className="music-notch-hover-meta">
                <strong>{activeTrack.name}</strong>
                <span>{activeTrack.artists}</span>
              </div>
            </div>

            <div className="music-notch-expanded-panel">
              <div className="music-notch-expanded-top">
                {activeTrack.albumArt && (
                  <img
                    className="music-notch-expanded-art"
                    src={activeTrack.albumArt}
                    alt=""
                  />
                )}
                <div className="music-notch-expanded-meta">
                  <strong>{activeTrack.name}</strong>
                  <span>{activeTrack.artists}</span>
                </div>
              </div>

              <div className="music-notch-expanded-wave" aria-hidden="true">
                {Array.from({ length: EXPANDED_BARS }).map((_, i) => (
                  <span
                    key={i}
                    ref={(el) => {
                      expandedBarRefs.current[i] = el;
                    }}
                    className="music-notch-bar music-notch-bar-lg"
                  />
                ))}
              </div>

              <div className="music-notch-expanded-actions">
                <button
                  type="button"
                  className="music-notch-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMusicSearch();
                  }}
                >
                  Change
                </button>
                <button
                  type="button"
                  className="music-notch-action music-notch-action-stop"
                  onClick={(e) => {
                    e.stopPropagation();
                    void stop();
                    setExpanded(false);
                  }}
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
      </button>
    </div>,
    document.body
  );
};

export default MusicNotch;
