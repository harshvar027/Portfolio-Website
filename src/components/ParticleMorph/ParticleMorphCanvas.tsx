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
  loadImageCloudSamples,
  PARTICLE_COUNT,
  PARTICLE_PROFILE_IMAGE,
  visibleSize,
  type ImageSample,
} from "./particleMorphUtils";
import { anchorHostBaseStyle, useAnchorSync } from "../../hooks/useAnchorRect";
import { smoother } from "../utils/scrollSmoother";
import { scheduleScrollLayoutRefresh } from "../utils/GsapScroll";
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
  visibleRef.current = anchor.visible;

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
    let imageSamples: ImageSample[] | null = null;

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
      const targetBuilder = imageSamples
        ? (count: number, width: number, height: number) =>
            buildImageCloud(count, width, height, imageSamples!)
        : buildHeadCloud;

      const { srcPos, dstPos, seeds, sizes } = buildParticleBuffers(
        PARTICLE_COUNT,
        vw,
        vh,
        targetBuilder
      );

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
      });

      points = new THREE.Points(geometry, material);
      scene.add(points);
    };

    const setSize = () => {
      if (!renderer) return;
      const anchor = document.getElementById(PARTICLE_ANCHOR_ID);
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const w = r.width || window.innerWidth;
      const h = r.height || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      buildParticles();
      morphTrigger?.refresh();
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
      scheduleScrollLayoutRefresh(() => {
        ScrollTrigger.refresh(false);
        smoother?.refresh(false);
      });
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

    const animate = (ts: number) => {
      rafId = requestAnimationFrame(animate);

      if (morphTrigger) {
        scrollState.raw = morphTrigger.progress;
      }
      // Keep morph progress locked to scroll (no extra lag behind scrub).
      scrollState.smooth = scrollState.raw;

      // Skip GPU work while the section is off-screen.
      if (!visibleRef.current || !material || !renderer) return;

      material.uniforms.uTime.value = ts * 0.001;
      material.uniforms.uProgress.value = scrollState.smooth;
      renderer.render(scene, camera);
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      setSize();
      requestAnimationFrame(() => {
        initScroll();
      });
      window.addEventListener("resize", setSize);
      host.addEventListener("mousemove", onMouseMove);
      host.addEventListener("mouseleave", onMouseLeave);
      animate(0);
    };

    waitForSiteReady()
      .then(() => loadImageCloudSamples(PARTICLE_PROFILE_IMAGE))
      .then((samples) => {
        if (cancelled) return;
        imageSamples = samples;
        start();
      })
      .catch(() => {
        if (cancelled) return;
        start();
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setSize);
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
