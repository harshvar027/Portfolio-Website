import { useEffect, useState } from "react";
import HoverLinks from "./HoverLinks";
import { useMusicReactive } from "../context/MusicReactiveContext";
import { smoother, scrollEnabled } from "./utils/scrollSmoother";
import "./styles/Navbar.css";

const Navbar = () => {
  const { isPlaying, activeTrack, openMusicSearch } = useMusicReactive();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 767) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const links = document.querySelectorAll(".header ul a");
    const clickHandlers: Array<{ el: Element; handler: (e: Event) => void }> =
      [];

    links.forEach((elem) => {
      const handler = (e: Event) => {
        if (window.innerWidth <= 1024) return;

        const anchor = e.currentTarget as HTMLAnchorElement;
        const section = anchor.getAttribute("data-href");
        if (!section) return;

        e.preventDefault();

        if (smoother && scrollEnabled()) {
          smoother.scrollTo(section, true, "top top");
          return;
        }

        const target = document.querySelector(section);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };
      elem.addEventListener("click", handler);
      clickHandlers.push({ el: elem, handler });
    });

    return () => {
      clickHandlers.forEach(({ el, handler }) =>
        el.removeEventListener("click", handler)
      );
    };
  }, []);
  return (
    <>
      <div className={`header${menuOpen ? " nav-open" : ""}`}>
        <div className="navbar-left">
          <a href="/#" className="navbar-title" data-cursor="disable">
            <img
              src="/images/logo.png"
              alt="Harshvardhan — Designer, Developer, Creator"
              className="navbar-logo"
            />
          </a>
          <a
            href="mailto:harshvar027@gmail.com"
            className="navbar-connect"
            data-cursor="disable"
          >
            harshvar027@gmail.com
          </a>
          <button
            type="button"
            className={`navbar-music-btn${isPlaying ? " navbar-music-btn-playing" : ""}`}
            onClick={openMusicSearch}
            data-cursor="disable"
            data-magnetic="0.25"
            data-squish
            title={
              isPlaying && activeTrack
                ? `Now playing: ${activeTrack.name} — tap to change`
                : "Pick a song"
            }
            aria-label={
              isPlaying && activeTrack
                ? `Now playing ${activeTrack.name}. Change song`
                : "Pick a song"
            }
          >
            <span className="navbar-music-icon" aria-hidden="true">
              ♪
            </span>
            <span className="navbar-music-label">
              {isPlaying ? "Now playing" : "Pick song"}
            </span>
          </button>
        </div>
        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
          data-cursor="disable"
        >
          <span className="nav-toggle-bar" aria-hidden="true"></span>
          <span className="nav-toggle-bar" aria-hidden="true"></span>
          <span className="nav-toggle-bar" aria-hidden="true"></span>
        </button>
        <ul id="primary-nav" onClick={() => setMenuOpen(false)}>
          <li>
            <a data-href="#about" href="#about">
              <HoverLinks text="ABOUT" />
            </a>
          </li>
          <li>
            <a data-href="#work" href="#work">
              <HoverLinks text="WORK" />
            </a>
          </li>
          <li>
            <a data-href="#soundscape" href="#soundscape">
              <HoverLinks text="MUSIC" />
            </a>
          </li>
          <li>
            <a data-href="#contact" href="#contact">
              <HoverLinks text="CONTACT" />
            </a>
          </li>
        </ul>
      </div>

      <div
        className={`nav-backdrop${menuOpen ? " is-visible" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      ></div>

      <div className="landing-circle1"></div>
      <div className="landing-circle2"></div>
      <div className="nav-fade"></div>
    </>
  );
};

export default Navbar;
