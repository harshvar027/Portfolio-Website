import { PropsWithChildren, useEffect, useState } from "react";
import About from "./About";
import Career from "./Career";
import Comments from "./Comments";
import Contact from "./Contact";
import Cursor from "./Cursor";
import Landing from "./Landing";
import NameReveal from "./NameReveal";
import Navbar from "./Navbar";
import ParticleMorphLayer, { ParticleMorphSpacer } from "./ParticleMorph";
import { prefetchParticlePortrait } from "./ParticleMorph/particleMorphUtils";
import SocialIcons from "./SocialIcons";
import TechStack, { TechStackSpacer } from "./TechStack";
import WhatIDo from "./WhatIDo";
import MusicNotch from "./Music/MusicNotch";
import MusicInviteModal from "./MusicInvite/MusicInviteModal";
import Soundscape from "./Soundscape";
import SoundscapeLyricsNote from "./Music/SoundscapeLyricsNote";
import SiteGradient from "./SiteGradient";
import Work from "./Work";
import setSplitText from "./utils/splitText";
import { prepareScrollSmoother, refreshScrollSmoother } from "./utils/scrollSmoother";
import { initSiteAnimations } from "./utils/siteAnimations";
import { enqueueHeavyTask } from "../utils/heavyTaskQueue";
import { refreshScrollLayout } from "./utils/GsapScroll";

const TECHSTACK_ANCHOR_ID = "techstack-anchor";
const PARTICLE_ANCHOR_ID = "particle-morph-section";

const MainContainer = ({ children }: PropsWithChildren) => {
  const [isDesktopView, setIsDesktopView] = useState<boolean>(
    window.innerWidth > 1024
  );
  const [siteReady, setSiteReady] = useState(false);
  const [webglReady, setWebglReady] = useState({
    tech: false,
    particle: false,
  });

  useEffect(() => {
    prepareScrollSmoother();
  }, []);

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const resizeHandler = () => {
      setIsDesktopView(window.innerWidth > 1024);
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => refreshScrollSmoother(), 150);
    };
    window.addEventListener("resize", resizeHandler);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  useEffect(() => {
    if (document.querySelector("main.main-active")) {
      setSiteReady(true);
      return;
    }

    const onReveal = () => {
      setSiteReady(true);
    };
    window.addEventListener("site-reveal", onReveal);
    return () => window.removeEventListener("site-reveal", onReveal);
  }, []);

  useEffect(() => {
    if (!siteReady) return;

    const observers: IntersectionObserver[] = [];

    const observe = (
      id: string,
      key: "tech" | "particle",
      rootMargin: string
    ) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          setWebglReady((prev) => ({ ...prev, [key]: true }));
          observer.disconnect();
        },
        { rootMargin }
      );

      observer.observe(el);
      observers.push(observer);
    };

    observe(TECHSTACK_ANCHOR_ID, "tech", "400px");
    observe(PARTICLE_ANCHOR_ID, "particle", "80px");

    return () => observers.forEach((observer) => observer.disconnect());
  }, [siteReady]);

  useEffect(() => {
    if (!siteReady) return;
    requestAnimationFrame(() => refreshScrollLayout());
    enqueueHeavyTask(
      "particle-prefetch",
      () => {
        void prefetchParticlePortrait();
      },
      500
    );
  }, [siteReady]);

  useEffect(() => {
    if (!siteReady) return;

    let disposeAnimations: (() => void) | null = null;

    enqueueHeavyTask(
      "split-text",
      () => {
        setSplitText();
      },
      15000
    );

    enqueueHeavyTask(
      "site-animations",
      () => {
        disposeAnimations = initSiteAnimations();
      },
      16000
    );

    return () => {
      disposeAnimations?.();
    };
  }, [siteReady]);

  return (
    <div className="container-main">
      <div className="ambient-bg" aria-hidden="true" />
      <div className="ambient-vignette" aria-hidden="true" />
      <div className="grain-overlay" aria-hidden="true" />
      <MusicNotch />
      <MusicInviteModal />
      <Cursor />
      <Navbar />
      <SocialIcons />
      {isDesktopView && children}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="container-main">
            <SiteGradient />
            <Landing>{!isDesktopView && children}</Landing>
            <About />
            <WhatIDo />
            <Career />
            <div className="purple-atmosphere-zone">
              <TechStackSpacer />
              <Work />
              <Soundscape />
              <SoundscapeLyricsNote />
              <ParticleMorphSpacer />
              <NameReveal />
            </div>
            <Contact />
            <Comments />
          </div>
        </div>
      </div>
      {webglReady.tech && <TechStack />}
      {webglReady.particle && <ParticleMorphLayer />}
    </div>
  );
};

export default MainContainer;
