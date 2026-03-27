import { Euler, Group, Mesh, Object3DEventMap, Vector3 } from "three";

export abstract class TrainElement {
  protected speed: number = 0;
  protected readonly object: Group<Object3DEventMap>;
  protected readonly visual: Group<Object3DEventMap>;
  protected readonly length: number;
  private shakeTime: number = 0;
  private readonly shakeAnimationOffset: number = Math.random() * 1000;
  private readonly visualBasePosition: Vector3 = new Vector3();
  private readonly visualBaseRotation: Euler = new Euler();
  private currentShakeStrength: number = 0;

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

  public setSpeed(value: number): void {
    this.speed = value;
  }

  public getObject(): Group<Object3DEventMap> {
    return this.object;
  }

  public getLength(): number {
    return this.length;
  }

  protected setVisualBasePosition(x: number, y: number, z: number): void {
    this.visualBasePosition.set(x, y, z);
    this.visual.position.copy(this.visualBasePosition);
  }

  protected setVisualBaseRotation(x: number, y: number, z: number): void {
    this.visualBaseRotation.set(x, y, z);
    this.visual.rotation.copy(this.visualBaseRotation);
  }

  protected applyShake(timeElapsedSinceLastFrame: number): void {
    const clampedDelta = Math.min(timeElapsedSinceLastFrame, 1 / 30);
    const normalizedSpeed = Math.min(Math.abs(this.getSpeed()), 160) / 160;
    const speedFactor = normalizedSpeed * normalizedSpeed * (3 - 2 * normalizedSpeed);
    const targetShakeStrength = speedFactor * 1.2;
    const blendFactor = 1 - Math.exp(-clampedDelta * 7);

    this.currentShakeStrength += (targetShakeStrength - this.currentShakeStrength) * blendFactor;

    if (this.currentShakeStrength <= 0.0001) {
      this.currentShakeStrength = 0;
      this.visual.position.copy(this.visualBasePosition);
      this.visual.rotation.copy(this.visualBaseRotation);
      return;
    }

    const phase = this.shakeTime + this.shakeAnimationOffset;
    const lateralShake = (Math.sin(phase * 1.8) + Math.sin(phase * 0.95) * 0.35) * 0.012 * this.currentShakeStrength;
    const verticalShake = (Math.sin(phase * 2.6) + Math.sin(phase * 1.35 + 0.8) * 0.25) * 0.009 * this.currentShakeStrength;
    const longitudinalShake = Math.sin(phase * 1.2 + 1.3) * 0.004 * this.currentShakeStrength;
    const pitchShake = Math.sin(phase * 1.55 + 0.25) * 0.0035 * this.currentShakeStrength;
    const rollShake = (Math.sin(phase * 2.1) + Math.sin(phase * 0.9 + 1.1) * 0.25) * 0.005 * this.currentShakeStrength;

    this.visual.position.set(
      this.visualBasePosition.x + lateralShake,
      this.visualBasePosition.y + verticalShake,
      this.visualBasePosition.z + longitudinalShake,
    );
    this.visual.rotation.set(
      this.visualBaseRotation.x + pitchShake,
      this.visualBaseRotation.y,
      this.visualBaseRotation.z + rollShake,
    );

    this.shakeTime += clampedDelta * (4 + speedFactor * 7);
  }

  public abstract loop(timeElapsedSinceLastFrame: number): void;
}
