import * as THREE from "three";
import { RGBELoader } from "three-stdlib";
import { gsap } from "gsap";

const setLighting = (
  scene: THREE.Scene,
  options: { shadows?: boolean } = {}
) => {
  const shadowSize = options.shadows === false ? 0 : 1024;
  const directionalLight = new THREE.DirectionalLight(0xd4b8ff, 0);
  directionalLight.intensity = 0;
  directionalLight.position.set(2.2, 4.5, 3.5);
  directionalLight.castShadow = shadowSize > 0;
  directionalLight.shadow.mapSize.width = shadowSize;
  directionalLight.shadow.mapSize.height = shadowSize;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0x9b7fd4, 0);
  fillLight.position.set(-3.5, 2.5, -2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xf0e4ff, 0);
  rimLight.position.set(-1.5, 6, -4);
  scene.add(rimLight);

  const pointLight = new THREE.PointLight(0xc8a8ff, 0, 100, 3);
  pointLight.position.set(3, 12, 4);
  pointLight.castShadow = shadowSize > 0;
  scene.add(pointLight);

  new RGBELoader()
    .setPath("/models/")
    .load("char_enviorment.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.environmentIntensity = 0;
      scene.environmentRotation.set(5.76, 85.85, 1);
    });

  function setPointLight(screenLight: any) {
    if (screenLight.material.opacity > 0.9) {
      pointLight.intensity = screenLight.material.emissiveIntensity * 20;
    } else {
      pointLight.intensity = 0;
    }
  }
  const duration = 0.75;
  const ease = "power2.inOut";
  function turnOnLights() {
    gsap.to(scene, {
      environmentIntensity: 0.78,
      duration: duration,
      ease: ease,
    });
    gsap.to(directionalLight, {
      intensity: 1.15,
      duration: duration,
      ease: ease,
    });
    gsap.to(fillLight, {
      intensity: 0.42,
      duration: duration,
      ease: ease,
    });
    gsap.to(rimLight, {
      intensity: 0.55,
      duration: duration,
      ease: ease,
    });
    const charRim = document.querySelector(".character-rim");
    if (charRim) {
      gsap.to(charRim, {
        y: "55%",
        opacity: 1,
        delay: 0.05,
        duration: 0.75,
      });
    }
  }

  return { setPointLight, turnOnLights };
};

export default setLighting;
