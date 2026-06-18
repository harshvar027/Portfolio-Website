import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Vibrant, mouse-reactive 3D structure rendered with raw three.js.
 * Rendering is gated by an IntersectionObserver so it never burns frames
 * while the card is scrolled off-screen.
 */
const Structure3D = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const uniforms = {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#ff2e88") },
      uColorB: { value: new THREE.Color("#7b2ff7") },
      uColorC: { value: new THREE.Color("#00e0ff") },
    };

    const geometry = new THREE.IcosahedronGeometry(1.7, 24);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vNormal;
        varying float vDisp;

        // classic simplex-ish noise via sines (cheap + smooth)
        float wave(vec3 p) {
          return sin(p.x * 2.0 + uTime) * 0.5
               + sin(p.y * 2.4 + uTime * 1.3) * 0.5
               + sin(p.z * 2.1 + uTime * 0.9) * 0.5;
        }

        void main() {
          vNormal = normal;
          float d = wave(position * 1.4 + uTime * 0.2);
          vDisp = d;
          vec3 displaced = position + normal * d * 0.28;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        varying vec3 vNormal;
        varying float vDisp;

        void main() {
          float t = clamp(vDisp * 0.5 + 0.5, 0.0, 1.0);
          vec3 base = mix(uColorA, uColorB, t);
          float rim = pow(1.0 - abs(vNormal.z), 2.0);
          vec3 color = mix(base, uColorC, rim * 0.8);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const wireGeo = new THREE.IcosahedronGeometry(1.95, 2);
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(wireGeo),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18,
      })
    );
    scene.add(wire);

    // orbiting glow particles
    const PCOUNT = 120;
    const positions = new Float32Array(PCOUNT * 3);
    for (let i = 0; i < PCOUNT; i++) {
      const r = 2.6 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: 0x9ad8ff,
        size: 0.045,
        transparent: true,
        opacity: 0.9,
      })
    );
    scene.add(particles);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    mount.addEventListener("pointermove", onPointerMove);

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => (visible = entry.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(mount);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;

      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      mesh.rotation.y = t * 0.25 + pointer.x * 0.6;
      mesh.rotation.x = pointer.y * 0.5;
      wire.rotation.copy(mesh.rotation);
      particles.rotation.y = -t * 0.08;
      particles.rotation.x = t * 0.04;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mount.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      wireGeo.dispose();
      wire.geometry.dispose();
      (wire.material as THREE.Material).dispose();
      pGeo.dispose();
      (particles.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="sc sc-structure" ref={mountRef} data-cursor="disable" />;
};

export default Structure3D;
