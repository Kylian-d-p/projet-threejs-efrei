import { Group, Object3DEventMap } from "three";
import { TrainElement } from "./TrainElement";

export class Locomotive extends TrainElement {
  static readonly length: number = 5;

  private desiredSpeed: number = 0;
  private maxSpeed: number = 190;
  private readonly acceleration: number = 10;

  constructor(settings: { speed?: number; acceleration?: number; maxSpeed?: number; object: Group<Object3DEventMap> }) {
    super({ object: settings.object, speed: settings.speed, length: Locomotive.length });
    this.object.rotateY(Math.PI);
    if (settings.speed !== undefined) {
      this.setDesiredSpeed(settings.speed);
    }
    if (settings.acceleration !== undefined) {
      this.acceleration = settings.acceleration;
    }
    if (settings.maxSpeed !== undefined) {
      this.maxSpeed = settings.maxSpeed;
    }
  }

  public getDesiredSpeed(): number {
    return this.desiredSpeed;
  }

  public setDesiredSpeed(value: number) {
    this.desiredSpeed = value;
  }

  public getMaxSpeed(): number {
    return this.maxSpeed;
  }

  public loop(timeElapsedSinceLastFrame: number): void {
    if (this.speed < this.desiredSpeed) {
      this.speed += Math.min(this.acceleration * timeElapsedSinceLastFrame, this.desiredSpeed - this.speed);
    } else if (this.speed > this.desiredSpeed) {
      this.speed -= Math.min(this.acceleration * timeElapsedSinceLastFrame, this.speed - this.desiredSpeed);
    }

    this.object.translateZ(this.speed * timeElapsedSinceLastFrame);
    this.applyShake(timeElapsedSinceLastFrame);
  }
}
