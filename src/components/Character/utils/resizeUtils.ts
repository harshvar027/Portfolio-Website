import * as THREE from "three";
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
  initScrollTimelines(character, camera);
  scheduleScrollLayoutRefresh(() => {
    smoother?.refresh(false);
  });
}
