import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollSmoother } from "gsap/ScrollSmoother"
import { SplitText } from "gsap/SplitText"

interface ParaElement extends HTMLElement {
  anim?: gsap.core.Animation
  split?: SplitText
}

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText)

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export default function setSplitText() {
  ScrollTrigger.config({ ignoreMobileResize: true })

  const isPhone = window.innerWidth <= 767
  const isTablet = window.innerWidth <= 1024

  const TriggerStart = isPhone
    ? "top 85%"
    : isTablet
      ? "top 60%"
      : "20% 60%"
  const ToggleAction = "play pause resume reverse"
  const yOffset = isPhone ? 30 : 80
  const paraDuration = isPhone ? 0.6 : 1
  const titleDuration = isPhone ? 0.5 : 0.8
  const stagger = isPhone ? 0.04 : 0.02

  const paras: NodeListOf<ParaElement> = document.querySelectorAll(".para")
  const titles: NodeListOf<ParaElement> = document.querySelectorAll(".title")

  paras.forEach((para: ParaElement) => {
    if (para.closest(".about-section")) return

    para.classList.add("visible")
    if (para.anim) {
      para.anim.progress(1).kill()
      para.split?.revert()
    }

    const paraSplit = new SplitText(para, {
      type: isPhone ? "lines" : "lines,words",
      linesClass: "split-line",
    })
    para.split = paraSplit

    const targets = isPhone ? paraSplit.lines : paraSplit.words

    para.anim = gsap.fromTo(
      targets,
      { autoAlpha: 0, y: yOffset },
      {
        autoAlpha: 1,
        scrollTrigger: {
          trigger: para.parentElement?.parentElement,
          toggleActions: ToggleAction,
          start: TriggerStart,
        },
        duration: prefersReducedMotion() ? 0 : paraDuration,
        ease: "power3.out",
        y: 0,
        stagger: isPhone ? 0.08 : stagger,
      }
    )
  })

  titles.forEach((title: ParaElement) => {
    if (title.closest(".about-section")) return

    if (title.anim) {
      title.anim.progress(1).kill()
      title.split?.revert()
    }

    const titleSplit = new SplitText(title, {
      type: isPhone ? "lines" : "chars,lines",
      linesClass: "split-line",
    })
    title.split = titleSplit

    const targets = isPhone ? titleSplit.lines : titleSplit.chars

    title.anim = gsap.fromTo(
      targets,
      {
        autoAlpha: 0,
        y: yOffset,
        rotate: isPhone ? 0 : 10,
      },
      {
        autoAlpha: 1,
        scrollTrigger: {
          trigger: title.parentElement?.parentElement,
          toggleActions: ToggleAction,
          start: TriggerStart,
        },
        duration: prefersReducedMotion() ? 0 : titleDuration,
        ease: "power2.inOut",
        y: 0,
        rotate: 0,
        stagger: isPhone ? 0.06 : 0.03,
      }
    )
  })
}
