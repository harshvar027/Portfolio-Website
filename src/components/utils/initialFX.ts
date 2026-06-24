import { SplitText } from "gsap/SplitText"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { scheduleScrollLayoutRefresh } from "./GsapScroll"
import { enableScroll } from "./scrollSmoother"

gsap.registerPlugin(ScrollTrigger, SplitText)

const roleLoopIds = ["landing-role-loop-a", "landing-role-loop-b", "landing-role-loop-mobile"]
let roleLoopTimelines: gsap.core.Timeline[] = []

/** Fast path — unlock scroll and show the page immediately after loading. */
export function revealSite() {
  document.body.classList.add("site-revealed")

  const main = document.querySelector("main.main-body")
  main?.classList.add("main-active")

  if (window.innerWidth > 1024) {
    gsap.set(".about-section", { autoAlpha: 0 })
    gsap.set(".about-me", { y: "-50%" })
  }

  gsap.set([".header", ".icons-section", ".nav-fade"], {
    opacity: 1,
    pointerEvents: "auto",
  })
  gsap.set(".landing-intro h1, .landing-intro h2, .landing-info h3", {
    opacity: 1,
  })

  const wrapper = document.getElementById("smooth-wrapper")
  wrapper?.style.removeProperty("pointer-events")
  document.body.classList.remove("music-invite-open")

  enableScroll()

  gsap.to("body", {
    backgroundColor: "#0b080c",
    duration: 0.45,
    delay: 0.1,
  })
}

const killRoleLoops = () => {
  roleLoopTimelines.forEach((tl) => tl.kill())
  roleLoopTimelines = []
  roleLoopIds.forEach((id) => ScrollTrigger.getById(id)?.kill())
}

const bindRoleLoopScroll = (tl: gsap.core.Timeline, id: string) => {
  ScrollTrigger.create({
    id,
    trigger: ".landing-section",
    start: "top top",
    end: "bottom top",
    onLeave: () => tl.pause(),
    onEnterBack: () => tl.play(),
  })
}

/** Original dual-line char slide loop (purple line + white line). */
const loopText = (text1: SplitText, text2: SplitText, scrollId: string) => {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 })
  const delay = 4
  const delay2 = delay * 2 + 1

  tl.fromTo(
    text2.chars,
    { opacity: 0, y: 80 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power3.inOut",
      y: 0,
      stagger: 0.1,
      delay,
    },
    0
  )
    .fromTo(
      text1.chars,
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
      text1.chars,
      { y: 0 },
      {
        y: -80,
        duration: 1.2,
        ease: "power3.inOut",
        stagger: 0.1,
        delay,
      },
      0
    )
    .to(
      text2.chars,
      {
        y: -80,
        duration: 1.2,
        ease: "power3.inOut",
        stagger: 0.1,
        delay: delay2,
      },
      1
    )

  roleLoopTimelines.push(tl)
  bindRoleLoopScroll(tl, scrollId)
}

/** Mobile — single purple line swap only. */
const loopMobileRole = () => {
  gsap.set(".landing-h2-1", { visibility: "visible", opacity: 1 })
  gsap.set(".landing-h2-2", { visibility: "visible", opacity: 0 })

  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
  const hold = 2.2
  const fade = 0.55

  tl.to(".landing-h2-1", { opacity: 0, duration: fade, ease: "power2.inOut" }, hold)
    .to(".landing-h2-2", { opacity: 1, duration: fade, ease: "power2.inOut" }, hold + fade)
    .to(".landing-h2-2", { opacity: 0, duration: fade, ease: "power2.inOut" }, hold + fade + hold + fade)
    .to(".landing-h2-1", { opacity: 1, duration: fade, ease: "power2.inOut" }, hold + fade + hold + fade + fade)

  roleLoopTimelines.push(tl)
  bindRoleLoopScroll(tl, "landing-role-loop-mobile")
}

/** Lightweight reveal — intro text only. */
export function runLandingTextFX() {
  const isPhone = window.innerWidth <= 767

  gsap.set([".landing-h2-2", ".landing-h2-info-1"], { visibility: "visible" })
  if (isPhone) {
    gsap.set(".landing-h2-1", { opacity: 1 })
    gsap.set(".landing-h2-2", { opacity: 0 })
  }

  gsap.fromTo(
    isPhone
      ? [".landing-intro h1", ".landing-intro h2", ".landing-info h3", ".landing-h2-1"]
      : [
          ".landing-intro h1",
          ".landing-intro h2",
          ".landing-info h3",
          ".landing-h2-info",
          ".landing-info-h2",
        ],
    { opacity: 0, y: 24 },
    {
      opacity: 1,
      y: 0,
      duration: 0.65,
      ease: "power2.out",
      stagger: 0.06,
      onComplete: () => {
        if (isPhone && roleLoopTimelines.length === 0) loopMobileRole()
      },
    }
  )
}

/** Full SplitText — original two-line Designer/Developer animation. */
export function runLandingTextFXHeavy() {
  killRoleLoops()

  const isPhone = window.innerWidth <= 767
  const textProps = { type: "chars,lines", linesClass: "split-h2" }

  const landingText = new SplitText(
    [".landing-info h3", ".landing-intro h2", ".landing-intro h1"],
    {
      type: "chars,lines",
      linesClass: "split-line",
    }
  )

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
  )

  if (isPhone) {
    gsap.fromTo(
      ".landing-info-h2",
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: 0.2 }
    )

    const designerText = new SplitText(".landing-h2-1", textProps)
    const developerText = new SplitText(".landing-h2-2", textProps)
    gsap.set(developerText.chars, { opacity: 0, y: 80 })
    loopText(designerText, developerText, "landing-role-loop-mobile")
    requestAnimationFrame(() => scheduleScrollLayoutRefresh())
    return
  }

  const whiteLineText = new SplitText(".landing-h2-info", textProps)
  gsap.fromTo(
    whiteLineText.chars,
    { opacity: 0, y: 50 },
    {
      opacity: 1,
      duration: 0.75,
      ease: "power3.out",
      y: 0,
      stagger: 0.018,
      delay: 0.05,
    }
  )

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
  )

  const whiteLineAlt = new SplitText(".landing-h2-info-1", textProps)
  const purpleLineText = new SplitText(".landing-h2-1", textProps)
  const purpleLineAlt = new SplitText(".landing-h2-2", textProps)

  gsap.set([".landing-h2-2", ".landing-h2-info-1"], { visibility: "visible" })
  gsap.set(whiteLineAlt.chars, { opacity: 0, y: 80 })
  gsap.set(purpleLineAlt.chars, { opacity: 0, y: 80 })

  loopText(whiteLineText, whiteLineAlt, "landing-role-loop-a")
  loopText(purpleLineText, purpleLineAlt, "landing-role-loop-b")

  requestAnimationFrame(() => {
    scheduleScrollLayoutRefresh()
  })
}

/** @deprecated use revealSite + runLandingTextFX */
export function initialFX() {
  revealSite()
  runLandingTextFX()
}
