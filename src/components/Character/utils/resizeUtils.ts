import * as THREE from "three";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initScrollTimelines, scheduleScrollLayoutRefresh } from "../../utils/GsapScroll";
import { smoother } from "../../utils/scrollSmoother";

export default function handleResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  canvasDiv: React.RefObject<HTMLDivElement>,
  character: THREE.Object3D
) {
  if (!canvasDiv.current) return;
  let canvas3d = canvasDiv.current.getBoundingClientRect();
  const width = canvas3d.width;
  const height = canvas3d.height;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const workTrigger = ScrollTrigger.getById("work");
  const preservedIds = new Set([
    "work",
    "particle-morph",
    "career-tl",
    "career-parallax",
  ]);
  ScrollTrigger.getAll().forEach((trigger) => {
    const id = trigger.vars.id as string | undefined;
    if (trigger !== workTrigger && !preservedIds.has(id ?? "")) {
      trigger.kill();
    }
  });
  initScrollTimelines(character, camera);
  scheduleScrollLayoutRefresh(() => {
    smoother?.refresh(false);
  });
}
