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
import Work from "./Work";
import setSplitText from "./utils/splitText";

const MainContainer = ({ children }: PropsWithChildren) => {
  const [isDesktopView, setIsDesktopView] = useState<boolean>(
    window.innerWidth > 1024
  );
  const [siteReady, setSiteReady] = useState(false);

  useEffect(() => {
    const resizeHandler = () => {
      setIsDesktopView(window.innerWidth > 1024);
    };
    setSplitText();
    window.addEventListener("resize", resizeHandler);
    return () => {
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

  return (
    <div className="container-main">
      <div className="ambient-bg" aria-hidden="true" />
      <div className="ambient-vignette" aria-hidden="true" />
      <div className="grain-overlay" aria-hidden="true" />
      <Cursor />
      <Navbar />
      <SocialIcons />
      {isDesktopView && children}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="container-main">
            <Landing>{!isDesktopView && children}</Landing>
            <About />
            <WhatIDo />
            <Career />
            {isDesktopView && <TechStackSpacer />}
            <Work />
            <ParticleMorphSpacer />
            <NameReveal />
            <Contact />
            <Comments />
          </div>
        </div>
      </div>
      {isDesktopView && siteReady && <TechStack />}
      {siteReady && <ParticleMorphLayer />}
    </div>
  );
};

export default MainContainer;
