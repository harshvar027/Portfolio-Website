import "./styles/Work.css";
import "./showcases/showcases.css";
import { Carousel3D, Structure3D, NeuralAI, EcommerceUI } from "./showcases";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

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
  // Recomputed on every ScrollTrigger refresh so measurements stay correct
  // even when fonts / the smooth-scroller / the 3D showcases settle late.
  function getTranslateX() {
    const box = document.getElementsByClassName("work-box");
    if (!box.length || !document.querySelector(".work-container")) return 0;
    const rectLeft = document
      .querySelector(".work-container")!
      .getBoundingClientRect().left;
    const rect = box[0].getBoundingClientRect();
    const parentWidth = box[0].parentElement!.getBoundingClientRect().width;
    const padding = parseInt(window.getComputedStyle(box[0]).padding) / 2;
    return rect.width * box.length - (rectLeft + parentWidth) + padding;
  }

  let timeline: gsap.core.Timeline | null = null;

  // Build the pin/horizontal-scroll trigger. This MUST run *after*
  // ScrollSmoother has been created, otherwise the trigger binds to the wrong
  // scroller and the section never scrolls. useGSAP runs as a layout effect
  // (before Navbar's ScrollSmoother.create in a passive effect), so we wait for
  // the smoother to be live — signalled by `main.main-active` — before building.
  const build = () => {
    if (timeline) return;
    if (getTranslateX() <= 0) return;

    timeline = gsap.timeline({
      scrollTrigger: {
        trigger: ".work-section",
        start: "top top",
        end: () => `+=${getTranslateX()}`,
        scrub: true,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        id: "work",
      },
    });

    timeline.to(".work-flex", {
      x: () => -getTranslateX(),
      ease: "none",
    });

    ScrollTrigger.refresh();
  };

  let rafId = 0;
  const waitForSmoother = () => {
    if (
      document.querySelector("main.main-active") &&
      document.getElementsByClassName("work-box").length
    ) {
      build();
      return;
    }
    rafId = requestAnimationFrame(waitForSmoother);
  };
  waitForSmoother();

  // Re-measure once everything (fonts + heavy canvas/WebGL showcases) has
  // settled, so the section pins centred before the horizontal scroll begins.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refresh);
  }

  // Clean up (optional, good practice)
  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("load", refresh);
    timeline?.kill();
    ScrollTrigger.getById("work")?.kill();
  };
}, []);
  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <h2>
          My <span>Work</span>
        </h2>
        <p className="work-intro">
          Interactive, design-led builds — from immersive 3D experiences and
          AI-powered platforms to polished e-commerce. Hover any preview to
          play with it.
        </p>
        <div className="work-flex">
          {projects.map((project, index) => (
            <div className="work-box" key={index}>
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
              <div className="work-showcase">{renderShowcase(project.showcase)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Work;
