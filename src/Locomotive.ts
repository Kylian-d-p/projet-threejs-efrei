import { Group, Object3DEventMap } from "three";
import { TrainElement } from "./TrainElement";

export class Locomotive extends TrainElement {
  static readonly length: number = 5;
  static readonly defaultMinSpeed: number = -10;

  private desiredSpeed: number = 0;
  private minSpeed: number = Locomotive.defaultMinSpeed;
  private maxSpeed: number = 190;
  private readonly acceleration: number = 10  ;
  private traveledDistance: number = 0;

  constructor(settings: { speed?: number; acceleration?: number; minSpeed?: number; maxSpeed?: number; object: Group<Object3DEventMap> }) {
    super({ object: settings.object, speed: settings.speed, length: Locomotive.length });
    this.object.rotateY(Math.PI);
    if (settings.acceleration !== undefined) {
      this.acceleration = settings.acceleration;
    }
    if (settings.minSpeed !== undefined) {
      this.minSpeed = settings.minSpeed;
    }
    if (settings.maxSpeed !== undefined) {
      this.maxSpeed = settings.maxSpeed;
    }
    if (settings.speed !== undefined) {
      this.setSpeed(settings.speed);
      this.setDesiredSpeed(settings.speed);
    }
  }

  public getDesiredSpeed(): number {
    return this.desiredSpeed;
  }

  public getMinSpeed(): number {
    return this.minSpeed;
  }

  public getAcceleration(): number {
    return this.acceleration;
  }

  public getTraveledDistance(): number {
    return this.traveledDistance;
  }

  public setDesiredSpeed(value: number) {
    this.desiredSpeed = Math.max(this.minSpeed, Math.min(this.maxSpeed, value));
  }

  public getMaxSpeed(): number {
    return this.maxSpeed;
  }

  public override setSpeed(value: number): void {
    super.setSpeed(Math.max(this.minSpeed, Math.min(this.maxSpeed, value)));
  }

  public loop(timeElapsedSinceLastFrame: number): void {
    if (this.speed < this.desiredSpeed) {
      this.speed += Math.min(this.acceleration * timeElapsedSinceLastFrame, this.desiredSpeed - this.speed);
    } else if (this.speed > this.desiredSpeed) {
      this.speed -= Math.min(this.acceleration * timeElapsedSinceLastFrame, this.speed - this.desiredSpeed);
    }

    const traveledDistance = this.speed * timeElapsedSinceLastFrame;
    this.object.translateZ(traveledDistance);
    this.traveledDistance += traveledDistance;
    this.applyShake(timeElapsedSinceLastFrame);
  }
}
