import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Scroll-driven backdrop: royale black at the top → royal purple at the bottom. */
export default function SiteGradient() {
  useEffect(() => {
    const content = document.querySelector("#smooth-content");
    if (!content) return;

    const setMorph = (progress: number) => {
      document.documentElement.style.setProperty(
        "--bg-morph",
        progress.toFixed(4)
      );
    };

    let trigger: ScrollTrigger | null = null;

    const init = () => {
      trigger?.kill();
      trigger = ScrollTrigger.create({
        trigger: content,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => setMorph(self.progress),
      });
      setMorph(trigger.progress);
      ScrollTrigger.refresh(false);
    };

    const waitForContent = () => {
      if (!document.querySelector("#smooth-content .container-main")) {
        requestAnimationFrame(waitForContent);
        return;
      }
      init();
    };

    waitForContent();

    return () => {
      trigger?.kill();
      document.documentElement.style.removeProperty("--bg-morph");
    };
  }, []);

  return (
    <div className="site-gradient" aria-hidden="true">
      <div className="site-gradient-base" />
      <div className="site-gradient-morph" />
    </div>
  );
}
