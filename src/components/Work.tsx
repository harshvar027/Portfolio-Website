import "./styles/Work.css";
import "./showcases/showcases.css";
import { Carousel3D, Structure3D, NeuralAI, EcommerceUI } from "./showcases";
import TiltCard from "./TiltCard";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { smoother } from "./utils/scrollSmoother";
import { scheduleScrollLayoutRefresh } from "./utils/GsapScroll";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Showcase = "carousel" | "structure" | "ai" | "ecommerce";

const projects: {
  title: string;
  category: string;
  tools: string;
  showcase: Showcase;
}[] = [
  {
    title: "Aurora",
    category: "Immersive Carousel UI",
    tools: "React, CSS 3D Transforms, GSAP, Motion Design",
    showcase: "carousel",
  },
  {
    title: "Helios",
    category: "Generative 3D Engine",
    tools: "Three.js, GLSL Shaders, WebGL, Procedural Geometry",
    showcase: "structure",
  },
  {
    title: "Synapse",
    category: "AI Platform",
    tools: "LLMs, Computer Vision, Canvas, Real-time Inference",
    showcase: "ai",
  },
  {
    title: "Lumina",
    category: "E-Commerce Experience",
    tools: "React, Stripe, Animated 3D Backgrounds, UX Design",
    showcase: "ecommerce",
  },
];

const renderShowcase = (type: Showcase) => {
  switch (type) {
    case "carousel":
      return <Carousel3D />;
    case "structure":
      return <Structure3D />;
    case "ai":
      return <NeuralAI />;
    case "ecommerce":
      return <EcommerceUI />;
  }
};

const Work = () => {
  useGSAP(() => {
    let timeline: gsap.core.Timeline | null = null;

    const stage = document.querySelector(
      ".work-cards-stage"
    ) as HTMLElement | null;
    const flex = document.querySelector(".work-flex") as HTMLElement | null;

    function getCards() {
      if (!flex) return [];
      return [...flex.querySelectorAll(".work-box-tilt")] as HTMLElement[];
    }

    /** Pan the full row — all cards stay in view; only shifts when row overflows. */
    function measurePanRange() {
      if (!stage || !flex) return { startX: 0, endX: 0 };

      gsap.set(flex, { x: 0 });

      const stageWidth = stage.clientWidth;
      const flexWidth = flex.scrollWidth;
      const overflow = Math.max(0, flexWidth - stageWidth);

      if (overflow === 0) {
        const centered = (stageWidth - flexWidth) / 2;
        return { startX: centered, endX: centered };
      }

      return { startX: 0, endX: -overflow };
    }

    function getScrollLength(cardCount: number) {
      if (cardCount <= 1) return 0;
      return (cardCount - 1) * window.innerHeight * 0.38 + window.innerHeight * 0.2;
    }

    function setFocusedCard(index: number) {
      getCards().forEach((card, i) => {
        card.classList.toggle("is-focused", i === index);
      });
    }

    const build = () => {
      if (window.innerWidth <= 1024) {
        getCards().forEach((card) => card.classList.remove("is-focused"));
        return;
      }
      if (!flex || !stage) return;

      const cards = getCards();
      if (cards.length < 2) return;

      const { startX, endX } = measurePanRange();
      const overflow = Math.max(0, flex.scrollWidth - stage.clientWidth);

      if (overflow === 0) {
        timeline?.kill();
        ScrollTrigger.getById("work")?.kill();
        timeline = null;
        gsap.set(flex, { x: startX });
        getCards().forEach((card) => card.classList.remove("is-focused"));
        return;
      }

      const scrollLength = getScrollLength(cards.length);
      if (scrollLength <= 0) return;

      timeline?.kill();
      ScrollTrigger.getById("work")?.kill();
      timeline = null;

      gsap.set(flex, { x: startX });
      setFocusedCard(0);

      timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".work-section",
          start: "top top",
          end: () => `+=${scrollLength}`,
          scrub: 1,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          id: "work",
          onLeaveBack: () => {
            gsap.set(flex, { x: startX });
            setFocusedCard(0);
          },
          onUpdate: (self) => {
            const idx = Math.round(self.progress * (cards.length - 1));
            setFocusedCard(idx);
          },
        },
      });

      timeline.fromTo(flex, { x: startX }, { x: endX, duration: 1 });

      ScrollTrigger.refresh(false);
      scheduleScrollLayoutRefresh(() => {
        smoother?.refresh(false);
      });
    };

    let rafId = 0;
    const waitForSmoother = () => {
      if (
        document.querySelector("main.main-active") &&
        document.querySelector(".work-cards-stage")
      ) {
        build();
        return;
      }
      rafId = requestAnimationFrame(waitForSmoother);
    };
    waitForSmoother();

    const refresh = () => {
      if (document.querySelector("main.main-active")) {
        build();
      }
    };
    window.addEventListener("load", refresh);
    if (document.fonts?.ready) {
      document.fonts.ready.then(refresh);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("load", refresh);
      timeline?.kill();
      ScrollTrigger.getById("work")?.kill();
      gsap.set(".work-flex", { clearProps: "x" });
      getCards().forEach((card) => card.classList.remove("is-focused"));
    };
  }, []);

  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <div className="work-header">
          <h2>
            My <span>Work</span>
          </h2>
          <p className="work-intro">
            Interactive, design-led builds — from immersive 3D experiences and
            AI-powered platforms to polished e-commerce. Tap or hover any preview
            to play with it.
          </p>
        </div>
        <div className="work-cards-stage">
          <div className="work-flex">
            {projects.map((project, index) => (
              <TiltCard
                key={index}
                className="work-box-tilt"
                maxTilt={14}
                depth={32}
                hoverScale={1.03}
              >
                <div className="work-box">
                  <div className="work-info">
                    <div className="work-title">
                      <h3>0{index + 1}</h3>
                      <div>
                        <h4>{project.title}</h4>
                        <p>{project.category}</p>
                      </div>
                    </div>
                    <h4>Tools & Features</h4>
                    <p>{project.tools}</p>
                  </div>
                  <div className="work-showcase">
                    {renderShowcase(project.showcase)}
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Work;
