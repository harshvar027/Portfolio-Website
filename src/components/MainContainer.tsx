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
import SocialIcons from "./SocialIcons";
import TechStack, { TechStackSpacer } from "./TechStack";
import WhatIDo from "./WhatIDo";
import MusicNotch from "./Music/MusicNotch";
import MusicInviteModal from "./MusicInvite/MusicInviteModal";
import Soundscape from "./Soundscape";
import SiteGradient from "./SiteGradient";
import Work from "./Work";
import setSplitText from "./utils/splitText";
import { enableScroll, refreshScrollSmoother } from "./utils/scrollSmoother";
import { initSiteAnimations } from "./utils/siteAnimations";
import { useMusicReactive } from "../context/MusicReactiveContext";

const MainContainer = ({ children }: PropsWithChildren) => {
  const [isDesktopView, setIsDesktopView] = useState<boolean>(
    window.innerWidth > 1024
  );
  const [siteReady, setSiteReady] = useState(false);
  const { openInviteAfterLoad } = useMusicReactive();

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const resizeHandler = () => {
      setIsDesktopView(window.innerWidth > 1024);
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => refreshScrollSmoother(), 150);
    };
    setSplitText();
    window.addEventListener("resize", resizeHandler);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  useEffect(() => {
    const check = () => {
      if (document.querySelector("main.main-active")) {
        setSiteReady(true);
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  }, []);

  useEffect(() => {
    if (!siteReady) return;
    enableScroll();
    openInviteAfterLoad();
    // Opt-in premium micro-interactions (magnetic / squish / scramble).
    const disposeSiteAnimations = initSiteAnimations();
    return () => disposeSiteAnimations();
  }, [siteReady, openInviteAfterLoad]);

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
              <ParticleMorphSpacer />
              <NameReveal />
            </div>
            <Contact />
            <Comments />
          </div>
        </div>
      </div>
      {siteReady && <TechStack />}
      {siteReady && <ParticleMorphLayer />}
    </div>
  );
};

export default MainContainer;
