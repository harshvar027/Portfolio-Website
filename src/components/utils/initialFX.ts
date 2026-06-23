import { SplitText } from "gsap/SplitText";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scheduleScrollLayoutRefresh } from "./GsapScroll";
import { enableScroll } from "./scrollSmoother";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Fast path — unlock scroll and show the page immediately after loading. */
export function revealSite() {
  document.body.classList.add("site-revealed");

  const main = document.querySelector("main.main-body");
  main?.classList.add("main-active");

  if (window.innerWidth > 1024) {
    gsap.set(".about-section", { autoAlpha: 0 });
    gsap.set(".about-me", { y: "-50%" });
  }

  gsap.set([".header", ".icons-section", ".nav-fade"], {
    opacity: 1,
    pointerEvents: "auto",
  });
  gsap.set(".landing-intro h1, .landing-intro h2, .landing-info h3", {
    opacity: 1,
  });

  const wrapper = document.getElementById("smooth-wrapper");
  wrapper?.style.removeProperty("pointer-events");
  document.body.classList.remove("music-invite-open");

  enableScroll();

  gsap.to("body", {
    backgroundColor: "#0b080c",
    duration: 0.45,
    delay: 0.1,
  });
}

/** Heavy text splitting — deferred so the main thread stays responsive. */
export function runLandingTextFX() {
  const TextProps = { type: "chars,lines", linesClass: "split-h2" };

  const landingText = new SplitText(
    [".landing-info h3", ".landing-intro h2", ".landing-intro h1"],
    {
      type: "chars,lines",
      linesClass: "split-line",
    }
  );
  gsap.fromTo(
    landingText.chars,
    { opacity: 0, y: 50 },
    {
      opacity: 1,
      duration: 0.75,
      ease: "power3.out",
      y: 0,
      stagger: 0.018,
      delay: 0.05,
    }
  );

  const landingText2 = new SplitText(".landing-h2-info", TextProps);
  gsap.fromTo(
    landingText2.chars,
    { opacity: 0, y: 50 },
    {
      opacity: 1,
      duration: 0.75,
      ease: "power3.out",
      y: 0,
      stagger: 0.018,
      delay: 0.05,
    }
  );

  gsap.fromTo(
    ".landing-info-h2",
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      duration: 0.7,
      ease: "power2.out",
      y: 0,
      delay: 0.2,
    }
  );

  const landingText3 = new SplitText(".landing-h2-info-1", TextProps);
  const landingText4 = new SplitText(".landing-h2-1", TextProps);
  const landingText5 = new SplitText(".landing-h2-2", TextProps);

  gsap.set([".landing-h2-2", ".landing-h2-info-1"], { visibility: "visible" });
  gsap.set(landingText3.chars, { opacity: 0, y: 80 });
  gsap.set(landingText5.chars, { opacity: 0, y: 80 });

  loopText(landingText2, landingText3);
  loopText(landingText4, landingText5);

  requestAnimationFrame(() => {
    scheduleScrollLayoutRefresh();
  });
}

/** @deprecated use revealSite + runLandingTextFX */
export function initialFX() {
  revealSite();
  runLandingTextFX();
}

function loopText(Text1: SplitText, Text2: SplitText) {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
  const delay = 4;
  const delay2 = delay * 2 + 1;

  tl.fromTo(
    Text2.chars,
    { opacity: 0, y: 80 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power3.inOut",
      y: 0,
      stagger: 0.1,
      delay: delay,
    },
    0
  )
    .fromTo(
      Text1.chars,
      { y: 80 },
      {
        duration: 1.2,
        ease: "power3.inOut",
        y: 0,
        stagger: 0.1,
        delay: delay2,
      },
      1
    )
    .fromTo(
      Text1.chars,
      { y: 0 },
      {
        y: -80,
        duration: 1.2,
        ease: "power3.inOut",
        stagger: 0.1,
        delay: delay,
      },
      0
    )
    .to(
      Text2.chars,
      {
        y: -80,
        duration: 1.2,
        ease: "power3.inOut",
        stagger: 0.1,
        delay: delay2,
      },
      1
    );

  ScrollTrigger.create({
    trigger: ".landing-section",
    start: "top top",
    end: "bottom top",
    onLeave: () => tl.pause(),
    onEnterBack: () => tl.play(),
  });
}
