import * as THREE from "three";
import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import {
  BallCollider,
  Physics,
  RigidBody,
  CylinderCollider,
  RapierRigidBody,
} from "@react-three/rapier";

const textureLoader = new THREE.TextureLoader();

type TechItem =
  | { type: "image"; url: string }
  | { type: "label"; name: string; color: string };

const techItems: TechItem[] = [
  { type: "image", url: "/images/react2.webp" },
  { type: "image", url: "/images/next2.webp" },
  { type: "image", url: "/images/node2.webp" },
  { type: "image", url: "/images/express.webp" },
  { type: "image", url: "/images/mongo.webp" },
  { type: "image", url: "/images/mysql.webp" },
  { type: "image", url: "/images/typescript.webp" },
  { type: "image", url: "/images/javascript.webp" },
  { type: "image", url: "/images/react.webp" },
  { type: "image", url: "/images/node.webp" },
  { type: "image", url: "/images/next.webp" },
  { type: "label", name: "Python", color: "#3776AB" },
  { type: "label", name: "Java", color: "#E76F00" },
  { type: "label", name: "C++", color: "#00599C" },
  { type: "label", name: "PHP", color: "#777BB4" },
  { type: "label", name: "HTML", color: "#E34F26" },
  { type: "label", name: "CSS", color: "#1572B6" },
  { type: "label", name: "Git", color: "#F05032" },
  { type: "label", name: "Three", color: "#0B0B0B" },
  { type: "label", name: "GSAP", color: "#88CE02" },
  { type: "label", name: "Blender", color: "#E87D0D" },
];

function createLabelTexture(label: string, bgColor: string) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${label.length > 5 ? 64 : label.length > 3 ? 80 : 96}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTechMaterial(texture: THREE.Texture) {
  return new THREE.MeshPhysicalMaterial({
    map: texture,
    emissive: "#ffffff",
    emissiveMap: texture,
    emissiveIntensity: 0.3,
    metalness: 0.5,
    roughness: 1,
    clearcoat: 0.1,
  });
}

const SPHERE_COUNT = techItems.length * 3;

const spheres = [...Array(SPHERE_COUNT)].map(() => ({
  scale: [0.7, 1, 0.8, 1, 1][Math.floor(Math.random() * 5)],
}));

const sphereGeometry = new THREE.SphereGeometry(1, 28, 28);

type SphereProps = {
  vec?: THREE.Vector3;
  scale: number;
  r?: typeof THREE.MathUtils.randFloatSpread;
  material: THREE.MeshPhysicalMaterial;
  isActive: boolean;
};

function SphereGeo({
  vec = new THREE.Vector3(),
  scale,
  r = THREE.MathUtils.randFloatSpread,
  material,
  isActive,
}: SphereProps) {
  const api = useRef<RapierRigidBody | null>(null);

  useFrame((_state, delta) => {
    if (!isActive) return;
    delta = Math.min(0.1, delta);
    const impulse = vec
      .copy(api.current!.translation())
      .normalize()
      .multiply(
        new THREE.Vector3(
          -50 * delta * scale,
          -150 * delta * scale,
          -50 * delta * scale
        )
      );

    api.current?.applyImpulse(impulse, true);
  });

  return (
    <RigidBody
      linearDamping={0.75}
      angularDamping={0.15}
      friction={0.2}
      position={[r(20), r(20) - 25, r(20) - 10]}
      ref={api}
      colliders={false}
    >
      <BallCollider args={[scale]} />
      <CylinderCollider
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 1.2 * scale]}
        args={[0.15 * scale, 0.275 * scale]}
      />
      <mesh
        castShadow
        receiveShadow
        scale={scale}
        geometry={sphereGeometry}
        material={material}
        rotation={[0.3, 1, 1]}
      />
    </RigidBody>
  );
}

type PointerProps = {
  vec?: THREE.Vector3;
  isActive: boolean;
};

function Pointer({ vec = new THREE.Vector3(), isActive }: PointerProps) {
  const ref = useRef<RapierRigidBody>(null);

  useFrame(({ pointer, viewport }) => {
    if (!isActive) return;
    const targetVec = vec.lerp(
      new THREE.Vector3(
        (pointer.x * viewport.width) / 2,
        (pointer.y * viewport.height) / 2,
        0
      ),
      0.2
    );
    ref.current?.setNextKinematicTranslation(targetVec);
  });

  return (
    <RigidBody
      position={[100, 100, 100]}
      type="kinematicPosition"
      colliders={false}
      ref={ref}
    >
      <BallCollider args={[2]} />
    </RigidBody>
  );
}

const TechStack = () => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const techstackEl = document.querySelector(".techstack");
      if (!techstackEl) return;
      const rect = techstackEl.getBoundingClientRect();
      setIsActive(rect.top < window.innerHeight && rect.bottom > 0);
    };
    document.querySelectorAll(".header a").forEach((elem) => {
      const element = elem as HTMLAnchorElement;
      element.addEventListener("click", () => {
        const interval = setInterval(() => {
          handleScroll();
        }, 10);
        setTimeout(() => {
          clearInterval(interval);
        }, 1000);
      });
    });
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const materials = useMemo(() => {
    return techItems.map((item) => {
      const texture =
        item.type === "image"
          ? textureLoader.load(item.url)
          : createLabelTexture(item.name, item.color);
      return createTechMaterial(texture);
    });
  }, []);

  const sphereMaterials = useMemo(
    () =>
      spheres.map((_, i) => materials[i % materials.length]),
    [materials]
  );

  return (
    <div className="techstack">
      <Canvas
        shadows
        frameloop={isActive ? "always" : "demand"}
        gl={{ alpha: true, stencil: false, depth: true, antialias: false }}
        camera={{ position: [0, 0, 20], fov: 32.5, near: 1, far: 100 }}
        onCreated={(state) => (state.gl.toneMappingExposure = 1.5)}
        className="tech-canvas"
      >
        <ambientLight intensity={1} />
        <spotLight
          position={[20, 20, 25]}
          penumbra={1}
          angle={0.2}
          color="white"
          castShadow
          shadow-mapSize={[512, 512]}
        />
        <directionalLight position={[0, 5, -4]} intensity={2} />
        <Physics gravity={[0, 0, 0]}>
          <Pointer isActive={isActive} />
          {spheres.map((props, i) => (
            <SphereGeo
              key={i}
              {...props}
              material={sphereMaterials[i]}
              isActive={isActive}
            />
          ))}
        </Physics>
        <Environment
          files="/models/char_enviorment.hdr"
          environmentIntensity={0.5}
          environmentRotation={[0, 4, 2]}
        />
        <EffectComposer enableNormalPass={false}>
          <N8AO color="#0f002c" aoRadius={2} intensity={1.15} />
        </EffectComposer>
      </Canvas>
      <h2> My Techstack</h2>
    </div>
  );
};

export default TechStack;
