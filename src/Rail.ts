import { Box3, Group, MathUtils, Mesh, Object3D, Vector3 } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";

export class Rail {
  private readonly object = new Group();
  private readonly segments: Object3D[] = [];
  private readonly segmentLength: number;
  private readonly shouldRotate: boolean;
  private traveledDistance: number = 0;

  constructor(model: GLTF, settings?: { visibleLength?: number; y?: number }) {
    const sampleBounds = this.getSegmentBounds(model.scene);
    const sampleSize = sampleBounds.getSize(new Vector3());
    this.shouldRotate = sampleSize.x > sampleSize.z;

    const normalizedSample = this.createSegmentInstance(model.scene);
    const normalizedSize = new Box3().setFromObject(normalizedSample).getSize(new Vector3());
    this.segmentLength = Math.max(normalizedSize.z, 0.001);

    const visibleLength = settings?.visibleLength ?? 280;
    const segmentCount = Math.max(6, Math.ceil(visibleLength / this.segmentLength) + 2);

    this.object.position.y = settings?.y ?? 0.02;

    for (let index = 0; index < segmentCount; index += 1) {
      const segment = this.createSegmentInstance(model.scene);
      this.segments.push(segment);
      this.object.add(segment);
    }

    this.updateSegments();
  }

  public getObject(): Group {
    return this.object;
  }

  public loop(anchorZ: number): void {
    this.traveledDistance = anchorZ;
    this.updateSegments(anchorZ);
  }

  private updateSegments(anchorZ: number = this.traveledDistance): void {
    const anchorSegment = Math.floor(anchorZ / this.segmentLength);

    for (let index = 0; index < this.segments.length; index += 1) {
      const segment = this.segments[index];
      const segmentIndex = anchorSegment + index - Math.floor(this.segments.length / 2);
      const z = segmentIndex * this.segmentLength + this.segmentLength / 2;

      segment.position.set(0, 0, z);
    }
  }

  private createSegmentInstance(source: Group): Object3D {
    const segment = source.clone();
    if (this.shouldRotate) {
      segment.rotateY(Math.PI / 2);
    }

    segment.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    segment.updateMatrixWorld(true);

    const bounds = new Box3().setFromObject(segment);
    const center = bounds.getCenter(new Vector3());
    const wrapper = new Group();

    segment.position.set(-center.x, -bounds.min.y, -center.z);
    segment.updateMatrixWorld(true);
    wrapper.add(segment);

    return wrapper;
  }

  private getSegmentBounds(source: Group): Box3 {
    const segment = source.clone();
    segment.updateMatrixWorld(true);
    return new Box3().setFromObject(segment);
  }
}
