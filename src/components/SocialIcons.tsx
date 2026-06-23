import { FaGithub, FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import "./styles/SocialIcons.css";
import { socialLinks } from "../data/socialLinks";
import { TbNotes } from "react-icons/tb";
import { useEffect } from "react";
import HoverLinks from "./HoverLinks";

type IconState = {
  link: HTMLElement;
  rect: DOMRect;
  mouseX: number;
  mouseY: number;
  currentX: number;
  currentY: number;
};

const SocialIcons = () => {
  useEffect(() => {
    const social = document.getElementById("social") as HTMLElement | null;
    if (!social) return;

    const icons: IconState[] = [];

    social.querySelectorAll("span").forEach((item) => {
      const elem = item as HTMLElement;
      const link = elem.querySelector("a") as HTMLElement | null;
      if (!link) return;

      const rect = elem.getBoundingClientRect();
      icons.push({
        link,
        rect,
        mouseX: rect.width / 2,
        mouseY: rect.height / 2,
        currentX: 0,
        currentY: 0,
      });
    });

    let frameId = 0;
    let needsUpdate = false;

    const updateAll = () => {
      let stillMoving = false;

      for (const icon of icons) {
        const prevX = icon.currentX;
        const prevY = icon.currentY;
        icon.currentX += (icon.mouseX - icon.currentX) * 0.1;
        icon.currentY += (icon.mouseY - icon.currentY) * 0.1;
        icon.link.style.setProperty("--siLeft", `${icon.currentX}px`);
        icon.link.style.setProperty("--siTop", `${icon.currentY}px`);

        if (
          Math.abs(icon.currentX - prevX) > 0.05 ||
          Math.abs(icon.currentY - prevY) > 0.05
        ) {
          stillMoving = true;
        }
      }

      if (!stillMoving && !needsUpdate) {
        frameId = 0;
        return;
      }

      needsUpdate = false;
      frameId = requestAnimationFrame(updateAll);
    };

    const handleMouseMove = (e: MouseEvent) => {
      for (const icon of icons) {
        const x = e.clientX - icon.rect.left;
        const y = e.clientY - icon.rect.top;

        if (x < 40 && x > 10 && y < 40 && y > 5) {
          icon.mouseX = x;
          icon.mouseY = y;
        } else {
          icon.mouseX = icon.rect.width / 2;
          icon.mouseY = icon.rect.height / 2;
        }
      }

      needsUpdate = true;
      if (!frameId) frameId = requestAnimationFrame(updateAll);
    };

    document.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      icons.forEach((icon, i) => {
        const span = social.querySelectorAll("span")[i] as HTMLElement | undefined;
        if (!span) return;
        icon.rect = span.getBoundingClientRect();
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="icons-section">
      <div className="social-icons" data-cursor="icons" id="social">
        <span>
          <a href={socialLinks.github} target="_blank" rel="noopener noreferrer">
            <FaGithub />
          </a>
        </span>
        <span>
          <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
            <FaLinkedinIn />
          </a>
        </span>
        <span>
          <a href={socialLinks.gunsLol} target="_blank" rel="noopener noreferrer">
            <img
              src="/icons/guns-lol.png"
              alt="guns.lol"
              className="guns-lol-icon"
              width={28}
              height={28}
              draggable={false}
            />
          </a>
        </span>
        <span>
          <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
            <FaInstagram />
          </a>
        </span>
      </div>
      <a className="resume-button" href="#">
        <HoverLinks text="RESUME" />
        <span>
          <TbNotes />
        </span>
      </a>
    </div>
  );
};

export default SocialIcons;
