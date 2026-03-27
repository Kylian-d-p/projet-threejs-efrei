import { Group, Object3DEventMap, Vector3 } from "three";
import { TrainElement } from "./TrainElement";

export class Wagon extends TrainElement {
  static readonly length: number = 5;
  static readonly WagonOffset: number = -2;

  private readonly attachedTo: TrainElement;
  private readonly direction = new Vector3();

  constructor(settings: { attachedTo: { trainElement: TrainElement }; speed?: number; object: Group<Object3DEventMap> }) {
    super({ object: settings.object, speed: settings.speed, length: Wagon.length });
    this.attachedTo = settings.attachedTo.trainElement;
    this.snapBehind(this.attachedTo);
  }

  public getSpeed(): number {
    return this.attachedTo.getSpeed();
  }

  public loop(timeElapsedSinceLastFrame: number): void {
    this.speed = this.attachedTo.getSpeed();
    this.snapBehind(this.attachedTo);
    this.applyShake(timeElapsedSinceLastFrame);
  }

  private snapBehind(trainElement: TrainElement): void {
    const trainElementObject = trainElement.getObject();
    const distanceFromTrainElement = trainElement.getLength() / 2 + this.getLength() / 2 + Wagon.WagonOffset;
    const direction = trainElementObject.getWorldDirection(this.direction);

    this.object.quaternion.copy(trainElementObject.quaternion);
    this.object.position.copy(trainElementObject.position).addScaledVector(direction, -distanceFromTrainElement);
  }
}
