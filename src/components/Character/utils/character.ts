import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { yieldToMain } from "../../../utils/heavyTaskQueue";
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
  dracoLoader.setWorkerLimit(2);
  dracoLoader.preload();
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

        let modelParsed = false;
        loader.load(
          modelUrl,
          (gltf) => {
            modelParsed = true;
            onProgress?.(72);

            yieldToMain(() => {
              const character = gltf.scene;
              character.traverse((child: any) => {
                if (child.isMesh) {
                  const mesh = child as THREE.Mesh;
                  child.castShadow = true;
                  child.receiveShadow = true;
                  mesh.frustumCulled = true;
                }
              });

              upgradeCharacterLook(character);

              onProgress?.(90);
              onReady?.();
              resolve(gltf);
              dracoLoader.dispose();

              void renderer
                .compileAsync(character, camera, scene)
                .catch(() => undefined);
            });
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
