import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { smoother } from "./utils/scrollSmoother";
import { scheduleScrollLayoutRefresh } from "./utils/GsapScroll";
import "./styles/Career.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Career = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      let timeline: gsap.core.Timeline | null = null;
      let parallaxTween: gsap.core.Tween | null = null;

      const build = () => {
        ScrollTrigger.getById("career-tl")?.kill();
        ScrollTrigger.getById("career-parallax")?.kill();
        timeline?.kill();
        parallaxTween?.kill();
        timeline = null;
        parallaxTween = null;

        const section = document.querySelector(".career-section");
        const info = document.querySelector(".career-info");
        if (!section || !info) return;

        const timelineEl = document.querySelector(
          ".career-timeline"
        ) as HTMLElement | null;
        if (!timelineEl) return;

        const centered = window.innerWidth > 900;
        gsap.set(timelineEl, {
          left: centered ? "50%" : "0%",
          xPercent: centered ? -50 : 0,
          scaleY: 0,
          opacity: 0,
          transformOrigin: "top center",
        });
        gsap.set(".career-info-box", { opacity: 0 });

        timeline = gsap.timeline({
          scrollTrigger: {
            id: "career-tl",
            trigger: info,
            start: "top 35%",
            end: "bottom 55%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        timeline
          .to(
            timelineEl,
            { scaleY: 1, opacity: 1, duration: 0.55, ease: "none" },
            0
          )
          .to(
            ".career-info-box",
            { opacity: 1, stagger: 0.12, duration: 0.5, ease: "none" },
            0
          )
          .to(
            ".career-dot",
            { animationIterationCount: 1, duration: 0.1 },
            0.3
          );

        if (window.innerWidth > 1024) {
          parallaxTween = gsap.to(section, {
            y: "20%",
            ease: "none",
            scrollTrigger: {
              id: "career-parallax",
              trigger: info,
              start: "top 35%",
              end: "bottom 55%",
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
        }

        ScrollTrigger.refresh(false);
        scheduleScrollLayoutRefresh(() => {
          smoother?.refresh(false);
        });
      };

      let rafId = 0;
      const waitForReady = () => {
        if (
          document.querySelector("main.main-active") &&
          document.querySelector(".career-info")
        ) {
          build();
          return;
        }
        rafId = requestAnimationFrame(waitForReady);
      };
      waitForReady();

      const refresh = () => {
        if (document.querySelector("main.main-active")) build();
      };
      window.addEventListener("load", refresh);
      window.addEventListener("resize", refresh);
      document.fonts?.ready?.then(refresh);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("load", refresh);
        window.removeEventListener("resize", refresh);
        timeline?.kill();
        parallaxTween?.kill();
        ScrollTrigger.getById("career-tl")?.kill();
        ScrollTrigger.getById("career-parallax")?.kill();
        gsap.set(".career-timeline", {
          clearProps: "scaleY,opacity,transformOrigin,left,xPercent",
        });
        gsap.set(".career-section", { clearProps: "y" });
        gsap.set(".career-info-box", { clearProps: "opacity" });
      };
    },
    { scope: sectionRef }
  );

  return (
    <div className="career-section section-container" ref={sectionRef}>
      <div className="career-container">
        <h2>
          My journey <span>&</span>
          <br /> learning path
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Class 8 Complete</h4>
                <h5>CS & Full Stack Foundations</h5>
              </div>
              <h3>2022</h3>
            </div>
            <p>
              Completed Class 8 and started learning about computer science and
              full stack development architecture — exploring React, Java, and
              the fundamentals of modern web development.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Class 10 Passed</h4>
                <h5>Frontend Mastery</h5>
              </div>
              <h3>2024</h3>
            </div>
            <p>
              Passed Class 10 and became proficient in frontend development,
              working confidently with Node.js and popular frontend languages
              and frameworks.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Backend & Systems</h4>
                <h5>Python, C++ & Full Stack</h5>
              </div>
              <h3>2026</h3>
            </div>
            <p>
              Learned Python and C++ in depth, and started building backend
              systems as a full stack web developer — combining frontend skills
              with server-side architecture.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>College Begins</h4>
                <h5>Next Chapter</h5>
              </div>
              <h3>Aug 2026</h3>
            </div>
            <p>
              Starting college in August 2026 — ready to dive deeper into
              computer science and learn many more technologies along the way.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
