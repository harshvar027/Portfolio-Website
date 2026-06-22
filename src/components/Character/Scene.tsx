import { useEffect, useRef } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import {
  handleMouseMove,
  handleTouchEnd,
  handleHeadRotation,
  handleTouchMove,
} from "./utils/mouseUtils";
import setAnimations from "./utils/animationUtils";
import { setProgress } from "../Loading";

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverDivRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(new THREE.Scene());
  const { setLoading } = useLoading();

  useEffect(() => {
    const container = canvasDiv.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let rect = container.getBoundingClientRect();
    let containerSize = { width: rect.width, height: rect.height };
    const aspect = containerSize.width / containerSize.height;
    const scene = sceneRef.current;

    const isMobile =
      window.innerWidth <= 1024 ||
      window.matchMedia("(pointer: coarse)").matches;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !isMobile,
      powerPreference: "high-performance",
    });
    renderer.setSize(containerSize.width, containerSize.height);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75)
    );
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const camera = new THREE.PerspectiveCamera(14.5, aspect, 0.1, 1000);
      camera.position.z = 10;
      camera.position.set(0, 13.1, 24.7);
      camera.zoom = 1.1;
      camera.updateProjectionMatrix();

      let headBone: THREE.Object3D | null = null;
      let screenLight: any | null = null;
      let mixer: THREE.AnimationMixer;

      const clock = new THREE.Clock();

      const light = setLighting(scene);
      const progress = setProgress((value) => setLoading(value));
      const { loadCharacter } = setCharacter(
        renderer,
        scene,
        camera,
        progress.setMilestone,
        () => {
          void progress.loaded();
        }
      );

      loadCharacter()
        .then((gltf) => {
          if (!gltf) return;

          try {
            const animations = setAnimations(gltf);
            hoverDivRef.current && animations.hover(gltf, hoverDivRef.current);
            mixer = animations.mixer;
            const character = gltf.scene;
            scene.add(character);
            headBone = character.getObjectByName("spine006") || null;
            screenLight = character.getObjectByName("screenlight") || null;
            setTimeout(() => {
              light.turnOnLights();
              animations.startIntro();
            }, 800);
            resizeHandler = () =>
              handleResize(renderer, camera, canvasDiv, character);
            window.addEventListener("resize", resizeHandler);
          } catch (err) {
            console.error("Character scene setup failed:", err);
          }
        })
        .catch((err) => {
          console.error("Character failed to load:", err);
          void progress.loaded();
        });

      let mouse = { x: 0, y: 0 },
        interpolation = { x: 0.1, y: 0.2 };

      const onMouseMove = (event: MouseEvent) => {
        handleMouseMove(event, (x, y) => (mouse = { x, y }));
      };
      let debounce: number | undefined;
      const onTouchStart = (event: TouchEvent) => {
        const element = event.target as HTMLElement;
        debounce = window.setTimeout(() => {
          element?.addEventListener("touchmove", (e: TouchEvent) =>
            handleTouchMove(e, (x, y) => (mouse = { x, y }))
          );
        }, 200);
      };

      const onTouchEnd = () => {
        handleTouchEnd((x, y, interpolationX, interpolationY) => {
          mouse = { x, y };
          interpolation = { x: interpolationX, y: interpolationY };
        });
      };

      document.addEventListener("mousemove", onMouseMove);
      const landingDiv = document.getElementById("landingDiv");
      if (landingDiv) {
        landingDiv.addEventListener("touchstart", onTouchStart);
        landingDiv.addEventListener("touchend", onTouchEnd);
      }

      let visible = true;
      const visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
        },
        { rootMargin: "150px" }
      );
      visibilityObserver.observe(container);

      let frameId = 0;
      let resizeHandler: (() => void) | null = null;

      const animate = () => {
        frameId = requestAnimationFrame(animate);
        if (!visible) return;

        if (headBone) {
          handleHeadRotation(
            headBone,
            mouse.x,
            mouse.y,
            interpolation.x,
            interpolation.y,
            THREE.MathUtils.lerp
          );
          light.setPointLight(screenLight);
        }
        const delta = clock.getDelta();
        if (mixer) {
          mixer.update(delta);
        }
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(debounce);
        visibilityObserver.disconnect();
        scene.clear();
        renderer.dispose();
        if (resizeHandler) {
          window.removeEventListener("resize", resizeHandler);
        }
        document.removeEventListener("mousemove", onMouseMove);
        if (landingDiv) {
          landingDiv.removeEventListener("touchstart", onTouchStart);
          landingDiv.removeEventListener("touchend", onTouchEnd);
        }
      };
  }, []);

  return (
    <>
      <div className="character-container">
        <div className="character-model" ref={canvasDiv}>
          <canvas ref={canvasRef} />
          <div className="character-rim"></div>
          <div className="character-hover" ref={hoverDivRef}></div>
        </div>
      </div>
    </>
  );
};

export default Scene;
