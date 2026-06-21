import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { initScrollTimelines } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";
import { upgradeCharacterLook } from "./upgradeCharacterLook";

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  onProgress?: (percent: number) => void,
  onReady?: () => void
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const loadCharacter = () => {
    return new Promise<GLTF | null>(async (resolve, reject) => {
      try {
        onProgress?.(12);
        let modelUrl = "/models/character.glb";

        if (!import.meta.env.DEV) {
          if (!window.isSecureContext) {
            throw new Error(
              "Character model decryption requires a secure context (HTTPS or http://127.0.0.1)."
            );
          }
          const encryptedBlob = await decryptFile(
            "/models/character.enc",
            "Character3D#@"
          );
          onProgress?.(38);
          modelUrl = URL.createObjectURL(new Blob([encryptedBlob]));
        } else {
          onProgress?.(38);
        }

        let character: THREE.Object3D;
        let modelParsed = false;
        loader.load(
          modelUrl,
          (gltf) => {
            modelParsed = true;
            onProgress?.(72);
            character = gltf.scene;
            upgradeCharacterLook(character);
            character.traverse((child: any) => {
              if (child.isMesh) {
                const mesh = child as THREE.Mesh;
                child.castShadow = true;
                child.receiveShadow = true;
                mesh.frustumCulled = true;
              }
            });
            onProgress?.(90);

            void Promise.race([
              renderer.compileAsync(character, camera, scene),
              new Promise<void>((resolve) => setTimeout(resolve, 2_000)),
            ]).catch(() => undefined);

            onProgress?.(100);
            onReady?.();
            resolve(gltf);

            try {
              initScrollTimelines(character, camera);
              character.getObjectByName("footR")!.position.y = 3.36;
              character.getObjectByName("footL")!.position.y = 3.36;
            } catch (err) {
              console.error("Character post-load setup failed:", err);
            }
            dracoLoader.dispose();
          },
          (event) => {
            if (modelParsed || event.total <= 0) return;
            const ratio = Math.min(1, event.loaded / event.total);
            onProgress?.(38 + Math.round(ratio * 32));
          },
          (error) => {
            console.error("Error loading GLTF model:", error);
            reject(error);
          }
        );
      } catch (err) {
        reject(err);
        console.error(err);
      }
    });
  };

  return { loadCharacter };
};

export default setCharacter;
