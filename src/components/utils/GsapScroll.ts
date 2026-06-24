import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { smoother } from "./scrollSmoother";

const CHAR_TRIGGER_IDS = ["char-landing", "char-about", "char-what", "char-mobile"];
const MOBILE_FX_IDS = ["mobile-about", "mobile-what", "mobile-work", "what-reveal-fallback"];

let registeredCharacter: THREE.Object3D | null = null;
let registeredCamera: THREE.PerspectiveCamera | null = null;

let intensityInterval: ReturnType<typeof setInterval> | null = null;
let screenLightTimeline: gsap.core.Timeline | null = null;

function killCharTriggers() {
  if (intensityInterval) {
    clearInterval(intensityInterval);
    intensityInterval = null;
  }
  screenLightTimeline?.kill();
  screenLightTimeline = null;
  CHAR_TRIGGER_IDS.forEach((id) => ScrollTrigger.getById(id)?.kill());
  MOBILE_FX_IDS.forEach((id) => ScrollTrigger.getById(id)?.kill());
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isDesktopCharacterLayout = () => window.innerWidth > 1024;

/** Desktop uses left:50% + xPercent:-50; mobile must reset GSAP transforms or the model shifts left. */
function applyCharacterModelLayout(charModel: Element) {
  if (isDesktopCharacterLayout()) {
    gsap.set(charModel, { xPercent: -50, x: 0, y: 0 });
    return;
  }
  gsap.set(charModel, { xPercent: 0, x: 0, y: 0, clearProps: "transform" });
}

function setupWhatSectionReveal() {
  const whatHeader = document.querySelector(".what-header");
  const whatCards = document.querySelector(".what-box-in");
  if (!whatHeader || !whatCards) return;

  ScrollTrigger.getById("what-reveal-fallback")?.kill();

  gsap.set(whatCards, { display: "flex" });

  const revealTl = gsap.timeline({
    scrollTrigger: {
      id: "what-reveal-fallback",
      trigger: ".whatIDO",
      start: "top 82%",
      toggleActions: "play none none reverse",
    },
  });

  revealTl
    .fromTo(
      whatHeader,
      { autoAlpha: 0, y: 28 },
      { autoAlpha: 1, y: 0, duration: 0.65, ease: "power2.out", immediateRender: false }
    )
    .fromTo(
      whatCards,
      { autoAlpha: 0, y: 24 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        immediateRender: false,
      },
      "-=0.35"
    )
    .call(() => {
      whatCards.querySelectorAll(".what-content-in").forEach((el) => {
        (el as HTMLElement).style.opacity = "1";
      });
    });
}

function setupPhoneScrollFX() {
  if (window.innerWidth > 1024) return;

  if (prefersReducedMotion()) {
    gsap.set(".what-header, .what-box-in", { autoAlpha: 1, y: 0 });
    gsap.set(".what-box-in", { display: "flex" });
    document.querySelectorAll(".what-content-in").forEach((el) => {
      (el as HTMLElement).style.opacity = "1";
    });
    return;
  }

  const about = document.querySelector(".about-section");
  if (about) {
    gsap.fromTo(
      about,
      { autoAlpha: 0, y: 24 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          id: "mobile-about",
          trigger: about,
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      }
    );
  }

  setupWhatSectionReveal();

  const workHeader = document.querySelector(".work-header");
  if (workHeader) {
    gsap.fromTo(
      workHeader,
      { autoAlpha: 0, y: 20 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          id: "mobile-work",
          trigger: workHeader,
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      }
    );
  }
}

function hasPageSections() {
  return (
    document.querySelector(".landing-section") &&
    document.querySelector(".about-section") &&
    document.querySelector(".whatIDO") &&
    document.querySelector(".career-section")
  );
}

export function setCharTimeline(
  character: THREE.Object3D<THREE.Object3DEventMap> | null,
  camera: THREE.PerspectiveCamera
) {
  if (!hasPageSections()) return;

  killCharTriggers();

  const charModel = document.querySelector(".character-model");
  if (!charModel) return;

  applyCharacterModelLayout(charModel);

  if (window.innerWidth > 1024) {
    gsap.set(".about-section", { autoAlpha: 0 });
    gsap.set(".about-me", { y: "-50%" });
  }

  let intensity: number = 0;
  if (intensityInterval) clearInterval(intensityInterval);
  intensityInterval = setInterval(() => {
    intensity = Math.random();
  }, 200);

  const tl1 = gsap.timeline({
    scrollTrigger: {
      id: "char-landing",
      trigger: ".landing-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  const tl2 = gsap.timeline({
    scrollTrigger: {
      id: "char-about",
      trigger: ".about-section",
      start: "center 55%",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  const tl3 = gsap.timeline({
    scrollTrigger: {
      id: "char-what",
      trigger: ".whatIDO",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  let screenLight: any, monitor: any;
  character?.children.forEach((object: any) => {
    if (object.name === "Plane004") {
      object.children.forEach((child: any) => {
        child.material.transparent = true;
        child.material.opacity = 0;
        if (child.material.name === "Material.027") {
          monitor = child;
          child.material.color.set("#FFFFFF");
        }
      });
    }
    if (object.name === "screenlight") {
      object.material.transparent = true;
      object.material.opacity = 0;
      object.material.emissive.set("#C8BFFF");
      screenLightTimeline = gsap
        .timeline({ repeat: -1 })
        .to(object.material, {
          emissiveIntensity: () => intensity * 8,
          duration: 0.45,
          ease: "sine.inOut",
        })
        .to(object.material, {
          emissiveIntensity: () => intensity * 2,
          duration: 0.45,
          ease: "sine.inOut",
        });
      screenLight = object;
    }
  });

  const neckBone = character?.getObjectByName("spine005");

  if (window.innerWidth > 1024) {
    if (character) {
      tl1
        .fromTo(character.rotation, { y: 0 }, { y: 0.7, duration: 1 }, 0)
        .to(camera.position, { z: 22 }, 0)
        .fromTo(
          ".character-model",
          { xPercent: -50, x: 0 },
          { xPercent: -50, x: "-25%", duration: 1 },
          0
        )
        .to(".landing-container", { opacity: 0, duration: 0.4 }, 0)
        .to(".landing-container", { y: "40%", duration: 0.8 }, 0)
        .fromTo(
          ".about-section",
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.35 },
          0.05
        )
        .fromTo(".about-me", { y: "-50%" }, { y: "0%" }, 0);

      tl2
        .to(
          camera.position,
          { z: 75, y: 8.4, duration: 6, delay: 2, ease: "power3.inOut" },
          0
        )
        .to(".about-section", { y: "30%", duration: 6 }, 0)
        .to(".about-section", { opacity: 0, delay: 3, duration: 2 }, 0)
        .fromTo(
          ".character-model",
          { xPercent: -50, pointerEvents: "inherit" },
          {
            xPercent: -50,
            pointerEvents: "none",
            x: "-12%",
            delay: 2,
            duration: 5,
          },
          0
        )
        .to(character.rotation, { y: 0.92, x: 0.12, delay: 3, duration: 3 }, 0);
      if (neckBone) {
        tl2.to(neckBone.rotation, { x: 0.6, delay: 2, duration: 3 }, 0);
      }
      if (monitor?.material) {
        tl2.to(monitor.material, { opacity: 1, duration: 0.8, delay: 3.2 }, 0);
      }
      if (screenLight?.material) {
        tl2.to(screenLight.material, { opacity: 1, duration: 0.8, delay: 4.5 }, 0);
      }
      if (monitor) {
        tl2.fromTo(
          monitor.position,
          { y: -10, z: 2 },
          { y: 0, z: 0, delay: 1.5, duration: 3 },
          0
        );
      }
      tl2.fromTo(
        ".character-rim",
        { opacity: 1, scaleX: 1.4 },
        { opacity: 0, scale: 0, y: "-70%", duration: 5, delay: 2 },
        0.3
      );

      tl3
        .fromTo(
          ".character-model",
          { xPercent: -50, y: "0%" },
          { xPercent: -50, y: "-100%", duration: 4, ease: "none", delay: 1 },
          0
        )
        .fromTo(".whatIDO", { y: 0 }, { y: "15%", duration: 2 }, 0)
        .to(character.rotation, { x: -0.04, duration: 2, delay: 1 }, 0);
    }

    tl3
      .fromTo(
        ".what-header",
        { autoAlpha: 0, y: 28 },
        { autoAlpha: 1, y: 0, duration: 0.35, immediateRender: false },
        0
      )
      .fromTo(
        ".what-box-in",
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          display: "flex",
          duration: 0.4,
          immediateRender: false,
          onStart: () => {
            gsap.set(".what-box-in", { display: "flex" });
          },
          onComplete: () => {
            document.querySelectorAll(".what-content-in").forEach((el) => {
              (el as HTMLElement).style.opacity = "1";
            });
          },
        },
        0.2
      );
  }

  setupPhoneScrollFX();
}

export function refreshAllScrollAnimations() {
  if (!registeredCharacter || !registeredCamera || !hasPageSections()) return;
  setCharTimeline(registeredCharacter, registeredCamera);
  ScrollTrigger.refresh(false);
}

export function refreshScrollLayout(onComplete?: () => void) {
  if (!document.querySelector("main.main-active")) return;
  ScrollTrigger.refresh(false);
  smoother?.refresh(false);
  onComplete?.();
}

let scrollRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced layout refresh — updates scroll height without rebuilding character timelines. */
export function scheduleScrollLayoutRefresh(onComplete?: () => void) {
  if (scrollRefreshTimer) clearTimeout(scrollRefreshTimer);
  scrollRefreshTimer = setTimeout(() => {
    scrollRefreshTimer = null;
    refreshScrollLayout(onComplete);
  }, 120);
}

let charRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced character timeline rebuild — use only on resize, not layout changes. */
export function scheduleCharacterScrollRefresh(onComplete?: () => void) {
  if (charRefreshTimer) clearTimeout(charRefreshTimer);
  charRefreshTimer = setTimeout(() => {
    charRefreshTimer = null;
    refreshAllScrollAnimations();
    onComplete?.();
  }, 120);
}

export function initScrollTimelines(
  character: THREE.Object3D,
  camera: THREE.PerspectiveCamera
) {
  registeredCharacter = character;
  registeredCamera = camera;

  const charModel = document.querySelector(".character-model");
  if (charModel) {
    applyCharacterModelLayout(charModel);
  }

  const tryInit = () => {
    if (!hasPageSections()) {
      requestAnimationFrame(tryInit);
      return;
    }
    setCharTimeline(character, camera);
    ScrollTrigger.refresh(false);
  };
  tryInit();
}
