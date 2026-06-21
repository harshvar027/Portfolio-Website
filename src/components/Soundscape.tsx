import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTilt } from "../hooks/useTilt";
import { useMusicReactive } from "../context/MusicReactiveContext";
import MusicPicker from "./Music/MusicPicker";
import "./styles/Soundscape.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Soundscape = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const vinylRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const { isPlaying, activeTrack, metrics } = useMusicReactive();

  const { ref: cardRef, innerRef, glareRef, shadowRef, onEnter, onMove, onLeave } =
    useTilt({
      maxTilt: 7,
      scale: 1.008,
      depth: 14,
      tiltMultiplier: 1.15,
    });

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
          Search any Spotify song — connect, pick a track, and watch the
          portfolio react to every beat.
        </p>
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
          ref={cardRef}
          className="soundscape-card"
          onMouseEnter={onEnter}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <div ref={shadowRef} className="tilt-card-shadow soundscape-box-shadow" aria-hidden="true" />
          <div ref={innerRef} className="soundscape-card-inner">
            <div className="soundscape-box">
              <div className="soundscape-box-face soundscape-box-top" aria-hidden="true" />
              <div className="soundscape-box-face soundscape-box-bottom" aria-hidden="true" />
              <div className="soundscape-box-face soundscape-box-left" aria-hidden="true" />
              <div className="soundscape-box-face soundscape-box-right" aria-hidden="true" />
              <div className="soundscape-box-face soundscape-box-back" aria-hidden="true" />
              <div className="soundscape-box-face soundscape-box-front">
                <div ref={glareRef} className="tilt-card-glare" aria-hidden="true" />
                <MusicPicker layout="card" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Soundscape;
