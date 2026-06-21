import * as THREE from "three";

type MaterialTuning = {
  color?: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenRoughness?: number;
  sheenColor?: string;
  envMapIntensity?: number;
  usePhysical?: boolean;
};

const PART_TUNING: Record<string, MaterialTuning> = {
  "BODY.SHIRT": {
    color: "#3a2568",
    roughness: 0.78,
    metalness: 0.04,
    envMapIntensity: 0.95,
    usePhysical: true,
    sheen: 0.35,
    sheenRoughness: 0.55,
    sheenColor: "#8b6fd4",
  },
  Pant: {
    color: "#12121c",
    roughness: 0.68,
    metalness: 0.08,
    envMapIntensity: 0.85,
    usePhysical: true,
    sheen: 0.2,
    sheenRoughness: 0.7,
    sheenColor: "#2a2840",
  },
  Shoe: {
    color: "#f0eef5",
    roughness: 0.32,
    metalness: 0.02,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.15,
    usePhysical: true,
  },
  Sole: {
    color: "#1a1a22",
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.5,
  },
  Hand: {
    color: "#e8b48e",
    roughness: 0.48,
    metalness: 0,
    envMapIntensity: 0.9,
    usePhysical: true,
    sheen: 0.55,
    sheenRoughness: 0.42,
    sheenColor: "#f5c4a8",
  },
  Neck: {
    color: "#e0ad86",
    roughness: 0.5,
    metalness: 0,
    envMapIntensity: 0.9,
    usePhysical: true,
    sheen: 0.5,
    sheenRoughness: 0.45,
    sheenColor: "#f0b896",
  },
  "Ear.001": {
    color: "#dea882",
    roughness: 0.52,
    metalness: 0,
    envMapIntensity: 0.85,
    usePhysical: true,
    sheen: 0.45,
    sheenRoughness: 0.48,
    sheenColor: "#efb08a",
  },
  hair: {
    color: "#0a0810",
    roughness: 0.42,
    metalness: 0.12,
    envMapIntensity: 0.75,
    usePhysical: true,
    sheen: 0.25,
    sheenRoughness: 0.35,
    sheenColor: "#2a1848",
  },
  Eyebrow: {
    color: "#24140e",
    roughness: 0.82,
    metalness: 0,
    envMapIntensity: 0.4,
  },
  "EYEs.001": {
    roughness: 0.08,
    metalness: 0,
    clearcoat: 0.9,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.4,
    usePhysical: true,
  },
  Keyboard: {
    color: "#2a2a32",
    roughness: 0.55,
    metalness: 0.35,
    envMapIntensity: 1,
    usePhysical: true,
    clearcoat: 0.15,
    clearcoatRoughness: 0.35,
  },
};

const KEYCAP_TUNING: MaterialTuning = {
  color: "#1e1e28",
  roughness: 0.38,
  metalness: 0.05,
  envMapIntensity: 1.05,
  usePhysical: true,
  clearcoat: 0.25,
  clearcoatRoughness: 0.3,
};

function getPartName(object: THREE.Object3D): string {
  let current: THREE.Object3D | null = object;
  while (current) {
    const { name } = current;
    if (
      name &&
      !name.startsWith("Cube.") &&
      !name.startsWith("Plane.") &&
      !name.startsWith("Mesh.") &&
      !name.startsWith("Iron:") &&
      !name.startsWith("Sphere.") &&
      !name.startsWith("Cylinder.") &&
      !name.startsWith("Glass.")
    ) {
      return name;
    }
    current = current.parent;
  }
  return object.name;
}

function applyTuning(
  source: THREE.MeshStandardMaterial,
  tuning: MaterialTuning
): THREE.MeshStandardMaterial {
  let material: THREE.MeshStandardMaterial;

  if (tuning.usePhysical && !(source instanceof THREE.MeshPhysicalMaterial)) {
    material = new THREE.MeshPhysicalMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(material, source);
  } else {
    material = source.clone();
  }

  material.flatShading = false;

  if (tuning.color) material.color.set(tuning.color);
  if (tuning.roughness !== undefined) material.roughness = tuning.roughness;
  if (tuning.metalness !== undefined) material.metalness = tuning.metalness;
  if (tuning.emissive) {
    material.emissive.set(tuning.emissive);
    material.emissiveIntensity = tuning.emissiveIntensity ?? 1;
  }
  material.envMapIntensity = tuning.envMapIntensity ?? 1.1;

  if (material instanceof THREE.MeshPhysicalMaterial) {
    if (tuning.clearcoat !== undefined) material.clearcoat = tuning.clearcoat;
    if (tuning.clearcoatRoughness !== undefined) {
      material.clearcoatRoughness = tuning.clearcoatRoughness;
    }
    if (tuning.sheen !== undefined) material.sheen = tuning.sheen;
    if (tuning.sheenRoughness !== undefined) {
      material.sheenRoughness = tuning.sheenRoughness;
    }
    if (tuning.sheenColor) material.sheenColor.set(tuning.sheenColor);
  }

  material.needsUpdate = true;
  return material;
}

function resolveTuning(partName: string): MaterialTuning | null {
  if (partName.startsWith("KEYS")) return KEYCAP_TUNING;
  return PART_TUNING[partName] ?? null;
}

export function upgradeCharacterLook(character: THREE.Object3D) {
  character.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const partName = getPartName(mesh);
    const tuning = resolveTuning(partName);
    if (!tuning) return;

    const applyToMaterial = (material: THREE.Material) => {
      if (
        !(material instanceof THREE.MeshStandardMaterial) ||
        material.name === "screenlight.001"
      ) {
        return material;
      }
      return applyTuning(material, tuning);
    };

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(applyToMaterial);
    } else {
      mesh.material = applyToMaterial(mesh.material);
    }
  });
}
