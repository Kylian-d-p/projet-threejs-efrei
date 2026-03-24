import { Group, Object3DEventMap, Vector3 } from "three";
import { TrainElement } from "./TrainElement";

export class Wagon extends TrainElement {
  static readonly length: number = 5;
  static readonly WagonOffset: number = -2;

  private attachedTo: TrainElement | null = null;
  private readonly deceleration: number = 5;

  constructor(settings: { attachedTo?: { trainElement: TrainElement }; speed?: number; deceleration?: number; object: Group<Object3DEventMap> }) {
    super({ object: settings.object, speed: settings.speed, length: Wagon.length });
    if (settings.attachedTo !== undefined) {
      const trainElement = settings.attachedTo.trainElement;
      if (trainElement) {
        this.attachTo(trainElement);
      }
    }
    if (settings.deceleration !== undefined) {
      this.deceleration = settings.deceleration;
    }
  }

  public attachTo(trainElement: TrainElement): void {
    this.attachedTo = trainElement;
    this.snapBehind(trainElement);
  }

  public detach(): void {
    this.speed = this.getSpeed();
    this.attachedTo = null;
  }

  public getSpeed(): number {
    return this.attachedTo ? this.attachedTo.getSpeed() : this.speed;
  }

  public loop(timeElapsedSinceLastFrame: number): void {
    if (this.attachedTo) {
      this.speed = this.attachedTo.getSpeed();
      this.snapBehind(this.attachedTo);
      this.applyShake(timeElapsedSinceLastFrame);
      return;
    }

    this.speed = Math.max(0, this.speed - this.deceleration * timeElapsedSinceLastFrame);
    this.object.translateZ(this.speed * timeElapsedSinceLastFrame);
    this.applyShake(timeElapsedSinceLastFrame);
  }

  private snapBehind(trainElement: TrainElement): void {
    const trainElementObject = trainElement.getObject();
    const distanceFromTrainElement = trainElement.getLength() / 2 + this.getLength() / 2 + Wagon.WagonOffset;
    const direction = trainElementObject.getWorldDirection(new Vector3());

    this.object.quaternion.copy(trainElementObject.quaternion);
    this.object.position.copy(trainElementObject.position).addScaledVector(direction, -distanceFromTrainElement);
  }
}
