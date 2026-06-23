import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTilt } from "../hooks/useTilt";
import { useMusicReactive } from "../context/MusicReactiveContext";
import LyricsStage from "./Music/LyricsStage";
import MusicSearchBar from "./Music/MusicSearchBar";
import "./styles/Soundscape.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Soundscape = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const vinylRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const { isPlaying, activeTrack, metrics } = useMusicReactive();

  const { ref: lyricsWrapRef, innerRef, glareRef, onEnter, onMove, onLeave } =
    useTilt({
      maxTilt: 4,
      scale: 1.004,
      depth: 8,
      tiltMultiplier: 0.85,
    });

  const handleStageMove = (e: React.MouseEvent<HTMLDivElement>) => {
    onMove(e);
    const el = lyricsWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: px, y: py });
  };

  const handleStageLeave = () => {
    onLeave();
    setParallax({ x: 0, y: 0 });
  };

  useGSAP(
    () => {
      if (!stageRef.current) return;
      gsap.from(".soundscape-kicker, .soundscape-title", {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".soundscape-section",
          start: "top 75%",
        },
      });

      gsap.to(".soundscape-portal-ring", {
        rotationY: 360,
        rotationX: 15,
        duration: 18,
        repeat: -1,
        ease: "none",
        transformOrigin: "center center",
      });
    },
    { scope: stageRef }
  );

  useEffect(() => {
    const vinyl = vinylRef.current;
    if (!vinyl) return;
    if (isPlaying) {
      gsap.to(vinyl, {
        rotation: 360,
        duration: 4 / (metrics.bpm / 90),
        repeat: -1,
        ease: "none",
      });
    } else {
      gsap.killTweensOf(vinyl);
      gsap.set(vinyl, { rotation: 0 });
    }
  }, [isPlaying, metrics.bpm]);

  return (
    <section className="soundscape-section section-container" id="soundscape">
      <div className="soundscape-head">
        <span className="soundscape-kicker">Soundscape</span>
        <h2 className="soundscape-title">
          Inside the <span>Music</span>
        </h2>
        <p className="soundscape-lead">
          Search any Spotify song — live synced lyrics pulse inside the NYC
          skyline box as the portfolio reacts to every beat.
        </p>
        <MusicSearchBar />
      </div>

      <div className="soundscape-stage" ref={stageRef}>
        <div className="soundscape-portal" ref={portalRef} aria-hidden="true">
          <div className="soundscape-portal-ring soundscape-portal-ring-1" />
          <div className="soundscape-portal-ring soundscape-portal-ring-2" />
          <div className="soundscape-portal-ring soundscape-portal-ring-3" />
          <div className="soundscape-portal-core" />
        </div>

        <div className="soundscape-orbit soundscape-orbit-1" aria-hidden="true" />
        <div className="soundscape-orbit soundscape-orbit-2" aria-hidden="true" />
        <div className="soundscape-orbit soundscape-orbit-3" aria-hidden="true" />

        <div className="soundscape-vinyl-wrap" aria-hidden="true">
          <div className="soundscape-vinyl" ref={vinylRef}>
            <div className="soundscape-vinyl-grooves" />
            <div className="soundscape-vinyl-label">
              {activeTrack?.albumArt ? (
                <img src={activeTrack.albumArt} alt="" />
              ) : (
                "♪"
              )}
            </div>
          </div>
        </div>

        <div
          ref={lyricsWrapRef}
          className="soundscape-lyrics-wrap"
          onMouseEnter={onEnter}
          onMouseMove={handleStageMove}
          onMouseLeave={handleStageLeave}
        >
          <div ref={innerRef} className="soundscape-lyrics-inner">
            <div ref={glareRef} className="tilt-card-glare" aria-hidden="true" />
            <LyricsStage parallaxX={parallax.x} parallaxY={parallax.y} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Soundscape;
