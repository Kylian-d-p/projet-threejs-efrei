import { Group, Mesh, Object3DEventMap } from "three";

export abstract class TrainElement {
  protected speed: number = 0;
  protected readonly object: Group<Object3DEventMap>;
  protected readonly visual: Group<Object3DEventMap>;
  protected readonly length: number;
  private shakeTime: number = 0;
  private readonly shakeAnimationOffset: number = Math.random() * 1000;

  constructor(settings: { object: Group<Object3DEventMap>; speed?: number; length: number }) {
    this.object = new Group<Object3DEventMap>();
    this.visual = settings.object;
    this.length = settings.length;

    this.visual.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.object.add(this.visual);

    if (settings.speed !== undefined) {
      this.speed = settings.speed;
    }
  }

  public getSpeed(): number {
    return this.speed;
  }

  public getObject(): Group<Object3DEventMap> {
    return this.object;
  }

  public getLength(): number {
    return this.length;
  }

  protected applyShake(timeElapsedSinceLastFrame: number): void {
    const speedFactor = Math.min(this.getSpeed(), 100) / 100;

    if (speedFactor <= 0) {
      this.visual.position.set(0, 0, 0);
      this.visual.rotation.set(0, 0, 0);
      return;
    }

    this.shakeTime += (timeElapsedSinceLastFrame + this.shakeAnimationOffset) * (5 + speedFactor * 20);

    this.visual.position.set(
      Math.sin(this.shakeTime * 1.7) * 0.03 * speedFactor,
      Math.sin(this.shakeTime * 2.9) * 0.015 * speedFactor,
      Math.sin(this.shakeTime * 1.2) * 0.01 * speedFactor,
    );
    this.visual.rotation.set(Math.sin(this.shakeTime * 1.6) * 0.01 * speedFactor, 0, Math.sin(this.shakeTime * 2.3) * 0.012 * speedFactor);
  }

  public abstract loop(timeElapsedSinceLastFrame: number): void;
}
