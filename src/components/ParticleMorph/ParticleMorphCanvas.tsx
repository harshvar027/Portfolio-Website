import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  particleMorphFragmentShader,
  particleMorphVertexShader,
} from "./particleMorphShaders";
import {
  buildHeadCloud,
  buildImageCloud,
  buildParticleBuffers,
  getAdaptiveParticleCount,
  loadImageCloudSamples,
  PARTICLE_PROFILE_IMAGE,
  visibleSize,
  type ProcessedPortrait,
} from "./particleMorphUtils";
import { anchorHostBaseStyle, useAnchorSync } from "../../hooks/useAnchorRect";
import { scheduleScrollLayoutRefresh } from "../utils/GsapScroll";
import { yieldToMain } from "../../utils/heavyTaskQueue";
import "./ParticleMorph.css";

gsap.registerPlugin(ScrollTrigger);

const PARTICLE_ANCHOR_ID = "particle-morph-section";

function waitForSiteReady(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (document.querySelector("main.main-active")) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

/** Scroll spacer inside smooth-content. */
export function ParticleMorphSpacer() {
  return (
    <div
      id={PARTICLE_ANCHOR_ID}
      className="particle-morph-section"
      aria-hidden="true"
    />
  );
}

/** WebGL layer portaled to body — avoids ScrollSmoother DOM conflicts. */
const ParticleMorphLayer = () => {
  const [mounted, setMounted] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const anchor = useAnchorSync(PARTICLE_ANCHOR_ID, hostRef);
  const visibleRef = useRef(false);
  const restartAnimateRef = useRef<(() => void) | null>(null);
  visibleRef.current = anchor.visible;

  useEffect(() => {
    if (anchor.visible) restartAnimateRef.current?.();
  }, [anchor.visible]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const section = document.getElementById(PARTICLE_ANCHOR_ID);
    if (!host || !section || !mounted) return;

    let cancelled = false;
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let points: THREE.Points | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let rafId = 0;
    let morphTrigger: ScrollTrigger | null = null;
    let portraitData: ProcessedPortrait | null = null;
    let lastSize = { w: 0, h: 0 };
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
    camera.position.set(0, 0, 10);

    const mouseWorld = new THREE.Vector3(999, 999, 0);
    const mouseNDC = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();
    const scrollState = { raw: 0, smooth: 0 };

    const buildParticles = () => {
      if (!renderer) return;

      const { vw, vh } = visibleSize(camera);
      const particleCount = getAdaptiveParticleCount();
      const targetBuilder = portraitData
        ? (count: number, width: number, height: number) =>
            buildImageCloud(count, width, height, portraitData!)
        : buildHeadCloud;

      const {
        srcPos,
        dstPos,
        seeds,
        sizes,
        targetColors,
        targetWeights,
        jitters,
        cellAreas,
      } = buildParticleBuffers(particleCount, vw, vh, targetBuilder);

      geometry?.dispose();
      material?.dispose();
      if (points) scene.remove(points);

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(srcPos), 3)
      );
      geometry.setAttribute("aSrc", new THREE.BufferAttribute(srcPos, 3));
      geometry.setAttribute("aDst", new THREE.BufferAttribute(dstPos, 3));
      geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute(
        "aTargetCol",
        new THREE.BufferAttribute(targetColors, 3)
      );
      geometry.setAttribute(
        "aTargetWeight",
        new THREE.BufferAttribute(targetWeights, 1)
      );
      geometry.setAttribute("aJitter", new THREE.BufferAttribute(jitters, 2));
      geometry.setAttribute(
        "aCellArea",
        new THREE.BufferAttribute(cellAreas, 1)
      );

      material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uMouse: { value: mouseWorld.clone() },
          uPxRatio: { value: renderer.getPixelRatio() },
        },
        vertexShader: particleMorphVertexShader,
        fragmentShader: particleMorphFragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      });

      points = new THREE.Points(geometry, material);
      scene.add(points);
    };

    const applySize = () => {
      if (!renderer) return;
      const anchorEl = document.getElementById(PARTICLE_ANCHOR_ID);
      if (!anchorEl) return;
      const r = anchorEl.getBoundingClientRect();
      const w = r.width || window.innerWidth;
      const h = r.height || window.innerHeight;
      if (
        Math.abs(w - lastSize.w) < 2 &&
        Math.abs(h - lastSize.h) < 2
      ) {
        return;
      }
      lastSize = { w, h };
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };

    const setSize = () => {
      applySize();
      yieldToMain(() => {
        if (cancelled) return;
        buildParticles();
        morphTrigger?.refresh();
      });
    };

    const debouncedSetSize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setSize, 150);
    };

    const initScroll = () => {
      morphTrigger?.kill();
      morphTrigger = null;
      scrollState.raw = 0;
      scrollState.smooth = 0;

      morphTrigger = ScrollTrigger.create({
        id: "particle-morph",
        trigger: section,
        // Grain field when the section enters; fully morphed at viewport center.
        start: "top bottom",
        end: "center center",
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          scrollState.raw = self.progress;
        },
      });

      scrollState.raw = morphTrigger.progress;
      scrollState.smooth = morphTrigger.progress;
      window.setTimeout(() => scheduleScrollLayoutRefresh(), 400);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!material) return;
      const anchor = document.getElementById(PARTICLE_ANCHOR_ID);
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= window.innerHeight) return;
      mouseNDC.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);
      raycaster.ray.intersectPlane(plane, mouseWorld);
      material.uniforms.uMouse.value.copy(mouseWorld);
    };

    const onMouseLeave = () => {
      material?.uniforms.uMouse.value.set(999, 999, 0);
    };

    const startAnimate = () => {
      if (rafId) return;
      const run = (time: number) => {
        if (!visibleRef.current) {
          rafId = 0;
          return;
        }
        rafId = requestAnimationFrame(run);

        if (morphTrigger) {
          scrollState.raw = morphTrigger.progress;
        }
        scrollState.smooth = scrollState.raw;

        if (!material || !renderer) return;

        material.uniforms.uTime.value = time * 0.001;
        material.uniforms.uProgress.value = scrollState.smooth;
        renderer.render(scene, camera);
      };
      rafId = requestAnimationFrame(run);
    };

    const start = () => {
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.className = "particle-morph-canvas";
      host.appendChild(canvas);

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

      applySize();
      yieldToMain(() => {
        if (cancelled) return;
        buildParticles();
        requestAnimationFrame(() => {
          if (cancelled) return;
          initScroll();
          if (visibleRef.current) startAnimate();
        });
      });
      window.addEventListener("resize", debouncedSetSize);
      host.addEventListener("mousemove", onMouseMove);
      host.addEventListener("mouseleave", onMouseLeave);
    };

    restartAnimateRef.current = () => startAnimate();

    waitForSiteReady()
      .then(() => loadImageCloudSamples(PARTICLE_PROFILE_IMAGE))
      .then((portrait) => {
        if (cancelled) return;
        portraitData = portrait;
        yieldToMain(() => {
          if (cancelled) return;
          start();
        });
      })
      .catch(() => {
        if (cancelled) return;
        yieldToMain(() => {
          if (cancelled) return;
          start();
        });
      });

    return () => {
      cancelled = true;
      restartAnimateRef.current = null;
      cancelAnimationFrame(rafId);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", debouncedSetSize);
      host.removeEventListener("mousemove", onMouseMove);
      host.removeEventListener("mouseleave", onMouseLeave);
      morphTrigger?.kill();
      ScrollTrigger.getById("particle-morph")?.kill();
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      host.replaceChildren();
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div ref={hostRef} className="particle-morph-portal" style={anchorHostBaseStyle} />,
    document.body
  );
};

export default ParticleMorphLayer;
