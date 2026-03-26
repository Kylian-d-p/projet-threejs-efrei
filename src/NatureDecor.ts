import { Box3, Group, Material, MathUtils, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { GLTF } from "three/addons/loaders/GLTFLoader.js";

type NatureVariant = {
  model: GLTF;
  scaleMin: number;
  scaleMax: number;
  weight?: number;
};

export class NatureDecor {
  private readonly object = new Group();
  private readonly chunks: Group[] = [];
  private readonly variants: NatureVariant[];
  private readonly weightedVariants: NatureVariant[];
  private readonly chunkLength: number;
  private readonly halfChunkCount: number;
  private traveledDistance = 0;

  constructor(variants: NatureVariant[], settings?: { chunkLength?: number; chunkCount?: number }) {
    this.variants = variants;
    this.weightedVariants = this.createWeightedVariants(variants);
    this.chunkLength = settings?.chunkLength ?? 30;

    const chunkCount = settings?.chunkCount ?? 24;
    this.halfChunkCount = Math.floor(chunkCount / 2);

    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = new Group();
      this.chunks.push(chunk);
      this.object.add(chunk);
    }

    this.updateChunks(this.traveledDistance, true);
  }

  public getObject(): Group {
    return this.object;
  }

  public loop(anchorZ: number): void {
    this.traveledDistance = anchorZ;
    this.updateChunks(anchorZ);
  }

  private updateChunks(anchorZ: number = this.traveledDistance, forceRefresh = false): void {
    const currentRow = Math.floor(anchorZ / this.chunkLength);

    for (let index = 0; index < this.chunks.length; index += 1) {
      const logicalRow = currentRow + index - this.halfChunkCount;
      const chunk = this.chunks[index];
      const previousRow = chunk.userData.logicalRow as number | undefined;

      if (forceRefresh || previousRow !== logicalRow) {
        this.populateChunk(chunk, logicalRow);
        chunk.userData.logicalRow = logicalRow;
      }

      chunk.position.set(0, 0, logicalRow * this.chunkLength);
    }
  }

  private populateChunk(chunk: Group, logicalRow: number): void {
    chunk.clear();

    const random = this.createRandom(logicalRow + 1);
    const itemCount = 8 + Math.floor(random() * 8);

    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const variant = this.weightedVariants[Math.floor(random() * this.weightedVariants.length)];
      const item = this.createNormalizedInstance(variant.model.scene);
      const side = random() > 0.5 ? 1 : -1;
      const distanceFromTrack = 18 + random() * 62;
      const localZ = -this.chunkLength / 2 + random() * this.chunkLength;
      const rotationY = random() * Math.PI * 2;
      const scale = MathUtils.lerp(variant.scaleMin, variant.scaleMax, random());

      item.position.set(side * distanceFromTrack, 0, localZ);
      item.rotation.y = rotationY;
      item.scale.setScalar(scale);
      chunk.add(item);
    }
  }

  private createNormalizedInstance(source: Group): Object3D {
    const item = source.clone();
    item.updateMatrixWorld(true);
    item.traverse((child) => {
      if (!(child instanceof Mesh)) {
        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;

      if (Array.isArray(child.material)) {
        child.material = child.material.map((material) => this.prepareMaterial(material));
      } else {
        child.material = this.prepareMaterial(child.material);
      }
    });

    const bounds = new Box3().setFromObject(item);
    const center = bounds.getCenter(new Vector3());
    const wrapper = new Group();

    item.position.set(-center.x, -bounds.min.y, -center.z);
    wrapper.add(item);

    return wrapper;
  }

  private prepareMaterial(material: Material): Material {
    if (!(material instanceof MeshStandardMaterial)) {
      return material.clone();
    }

    const preparedMaterial = material.clone();
    preparedMaterial.metalness = 0;
    preparedMaterial.roughness = 1;
    preparedMaterial.envMapIntensity = 0.25;

    return preparedMaterial;
  }

  private createWeightedVariants(variants: NatureVariant[]): NatureVariant[] {
    const weightedVariants: NatureVariant[] = [];

    for (const variant of variants) {
      const weight = variant.weight ?? 1;

      for (let index = 0; index < weight; index += 1) {
        weightedVariants.push(variant);
      }
    }

    return weightedVariants;
  }

  private createRandom(seed: number): () => number {
    let value = (seed ^ 0x6d2b79f5) >>> 0;

    return () => {
      value = (value + 0x6d2b79f5) >>> 0;
      let result = Math.imul(value ^ (value >>> 15), 1 | value);
      result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }
}
