import "./styles/Work.css";
import WorkImage from "./WorkImage";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const projects = [
  {
    title: "DevPortfolio",
    category: "Personal Website",
    tools: "React, TypeScript, Three.js, GSAP",
    alt: "DevPortfolio — interactive personal portfolio with 3D character",
  },
  {
    title: "TaskFlow",
    category: "Productivity App",
    tools: "Next.js, Node.js, MongoDB, REST APIs",
    alt: "TaskFlow — full-stack task management application",
  },
  {
    title: "WeatherScope",
    category: "Weather Dashboard",
    tools: "JavaScript, OpenWeather API, Chart.js",
    alt: "WeatherScope — real-time weather data visualization",
  },
  {
    title: "ShopHub",
    category: "E-Commerce Platform",
    tools: "React, Express.js, MySQL, Stripe",
    alt: "ShopHub — online store with cart and checkout flow",
  },
  {
    title: "LearnHub",
    category: "Ed-Tech Platform",
    tools: "MERN Stack, JWT Auth, Video Streaming",
    alt: "LearnHub — course platform with user progress tracking",
  },
  {
    title: "PixelForge",
    category: "3D Web Experience",
    tools: "Three.js, Blender, React Three Fiber",
    alt: "PixelForge — immersive 3D scene built for the browser",
  },
];

const Work = () => {
  useGSAP(() => {
  let translateX: number = 0;

  function setTranslateX() {
    const box = document.getElementsByClassName("work-box");
    if (!box.length || !document.querySelector(".work-container")) return;
    const rectLeft = document
      .querySelector(".work-container")!
      .getBoundingClientRect().left;
    const rect = box[0].getBoundingClientRect();
    const parentWidth = box[0].parentElement!.getBoundingClientRect().width;
    let padding: number =
      parseInt(window.getComputedStyle(box[0]).padding) / 2;
    translateX = rect.width * box.length - (rectLeft + parentWidth) + padding;
  }

  setTranslateX();
  if (translateX <= 0) return;

  let timeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".work-section",
      start: "top top",
      end: `+=${translateX}`, // Use actual scroll width
      scrub: true,
      pin: true,
      id: "work",
    },
  });

  timeline.to(".work-flex", {
    x: -translateX,
    ease: "none",
  });

  // Clean up (optional, good practice)
  return () => {
    timeline.kill();
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
          A selection of projects where I combined development, design, and
          problem-solving to build real-world digital experiences.
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
              <WorkImage image="/images/placeholder.webp" alt={project.alt} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Work;
