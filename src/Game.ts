import { AmbientLight, Color, DirectionalLight, Fog, HemisphereLight, Object3D, PerspectiveCamera, Scene, Vector3 } from "three";
import { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { Clouds } from "./Clouds";
import { HudManager, TrainHudSnapshot } from "./HudManager";
import { Loader } from "./Loader";
import { Locomotive } from "./Locomotive";
import { NatureDecor } from "./NatureDecor";
import { Rail } from "./Rail";
import { RouteProgressSnapshot, RouteProgression } from "./RouteProgression";
import { Terrain } from "./Terrain";
import { Wagon } from "./Wagon";

export class Game {
  private readonly cameraOffset = new Vector3(0, 5, -14);
  private readonly cameraLookAhead = new Vector3(0, 2, 18);
  private readonly sunlightOffset = new Vector3(24, 34, -6);
  private trainLocomotive: Locomotive;
  private wagons: Wagon[];
  private hudManager: HudManager;
  private clouds: Clouds;
  private terrain: Terrain;
  private rail: Rail;
  private routeProgression: RouteProgression;
  private routeSnapshot: RouteProgressSnapshot;
  private natureDecor: NatureDecor;
  private sunTarget = new Object3D();
  private sunLight: DirectionalLight;
  private scene: Scene = new Scene();
  private camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  constructor(
    trainLocomotiveModel: GLTF,
    trainWagonModel: GLTF,
    railModel: GLTF,
    treeModel: GLTF,
    pineModel: GLTF,
    bushModel: GLTF,
    rockModel: GLTF,
    grassModel: GLTF,
  ) {
    this.scene.background = new Color(0x87ceeb);
    this.scene.fog = new Fog(0x87ceeb, 45, 180);

    this.trainLocomotive = new Locomotive({
      speed: 30,
      object: trainLocomotiveModel.scene.clone(),
    });
    this.clouds = new Clouds();
    this.terrain = new Terrain({ tileSize: 50 });
    this.rail = new Rail(railModel, { visibleLength: 420 });
    this.routeProgression = new RouteProgression();
    this.natureDecor = new NatureDecor([
      { model: treeModel, scaleMin: 3.8, scaleMax: 5.8, weight: 3 },
      { model: pineModel, scaleMin: 4.2, scaleMax: 6.5, weight: 3 },
      { model: bushModel, scaleMin: 2.2, scaleMax: 3.8, weight: 4 },
      { model: rockModel, scaleMin: 2.4, scaleMax: 4.5, weight: 3 },
      { model: grassModel, scaleMin: 2.8, scaleMax: 4.8, weight: 6 },
    ], { chunkLength: 26, chunkCount: 28 });
    this.wagons = [];
    this.wagons.push(
      new Wagon({ attachedTo: { trainElement: this.trainLocomotive }, speed: 0, object: trainWagonModel.scene.clone() }),
    );
    this.wagons.push(
      new Wagon({ attachedTo: { trainElement: this.wagons[0] }, speed: 0, object: trainWagonModel.scene.clone() }),
    );
    this.wagons.push(
      new Wagon({ attachedTo: { trainElement: this.wagons[1] }, speed: 0, object: trainWagonModel.scene.clone() }),
    );

    this.scene.add(this.clouds.getObject());
    this.scene.add(this.terrain.getObject());
    this.scene.add(this.rail.getObject());
    this.scene.add(this.routeProgression.getObject());
    this.scene.add(this.natureDecor.getObject());
    this.scene.add(this.trainLocomotive.getObject());
    for (const wagon of this.wagons) {
      this.scene.add(wagon.getObject());
    }

    this.scene.add(new AmbientLight(0xffffff, 1.2));

    const hemisphereLight = new HemisphereLight(0xcbe8ff, 0x6f8d52, 1.8);
    this.scene.add(hemisphereLight);

    this.sunLight = new DirectionalLight(0xffd38a, 2.8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.bias = -0.00015;
    this.sunLight.shadow.normalBias = 0.02;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 280;
    this.sunLight.shadow.camera.left = -160;
    this.sunLight.shadow.camera.right = 160;
    this.sunLight.shadow.camera.top = 160;
    this.sunLight.shadow.camera.bottom = -160;
    this.sunLight.target = this.sunTarget;
    this.scene.add(this.sunTarget);
    this.scene.add(this.sunLight);

    this.routeSnapshot = this.routeProgression.update(0, this.trainLocomotive.getTraveledDistance(), Math.abs(this.trainLocomotive.getSpeed()));
    this.hudManager = new HudManager((desiredSpeed) => {
      this.trainLocomotive.setDesiredSpeed(desiredSpeed);
    });

    this.updateSunlight();
    this.updateCamera();
    this.hudManager.update(this.buildHudSnapshot());
  }

  public static async create(): Promise<Game> {
    const loader = new Loader();
    const [trainLocomotiveModel, trainWagonModel, railModel, treeModel, pineModel, bushModel, rockModel, grassModel] =
      await Promise.all([
        loader.loadGLTF("../assets/train/train-electric-subway-a.glb"),
        loader.loadGLTF("../assets/train/train-electric-subway-b.glb"),
        loader.loadGLTF("../assets/train/railroad-straight.glb"),
        loader.loadGLTF("../assets/nature/tree_default.glb"),
        loader.loadGLTF("../assets/nature/tree_pineRoundA.glb"),
        loader.loadGLTF("../assets/nature/plant_bushLarge.glb"),
        loader.loadGLTF("../assets/nature/rock_largeA.glb"),
        loader.loadGLTF("../assets/nature/grass_large.glb"),
      ]);

    return new Game(trainLocomotiveModel, trainWagonModel, railModel, treeModel, pineModel, bushModel, rockModel, grassModel);
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getCamera() {
    return this.camera;
  }

  public loop(timeElapsedSinceLastFrame: number): void {
    if (!this.routeProgression.isGameEnded()) {
      this.trainLocomotive.loop(timeElapsedSinceLastFrame);
    }

    this.routeSnapshot = this.routeProgression.update(
      timeElapsedSinceLastFrame,
      this.trainLocomotive.getTraveledDistance(),
      Math.abs(this.trainLocomotive.getSpeed()),
    );

    if (this.routeSnapshot.gameEnded) {
      this.trainLocomotive.setDesiredSpeed(0);
      this.trainLocomotive.setSpeed(0);
    }

    const trainPositionZ = this.trainLocomotive.getObject().position.z;

    this.clouds.loop(trainPositionZ);
    this.terrain.loop(trainPositionZ);
    this.rail.loop(trainPositionZ);
    this.natureDecor.loop(trainPositionZ);

    for (const wagon of this.wagons) {
      wagon.loop(timeElapsedSinceLastFrame);
    }

    this.updateSunlight();
    this.updateCamera();
    this.hudManager.update(this.buildHudSnapshot());
  }

  private updateCamera(): void {
    const locomotiveObject = this.trainLocomotive.getObject();
    const cameraOffset = this.cameraOffset.clone().applyQuaternion(locomotiveObject.quaternion);
    const cameraLookTarget = this.cameraLookAhead.clone().applyQuaternion(locomotiveObject.quaternion);

    this.camera.position.copy(locomotiveObject.position).add(cameraOffset);
    this.camera.lookAt(locomotiveObject.position.clone().add(cameraLookTarget));
  }

  private updateSunlight(): void {
    const locomotivePosition = this.trainLocomotive.getObject().position;

    this.sunLight.position.copy(locomotivePosition).add(this.sunlightOffset);
    this.sunTarget.position.copy(locomotivePosition);
    this.sunTarget.updateMatrixWorld();
    this.sunLight.updateMatrixWorld();
  }

  private buildHudSnapshot(): TrainHudSnapshot {
    const locomotiveObject = this.trainLocomotive.getObject();
    const lastElement = this.wagons.length > 0 ? this.wagons[this.wagons.length - 1] : this.trainLocomotive;
    const convoyLength =
      this.wagons.length > 0
        ? locomotiveObject.position.distanceTo(lastElement.getObject().position) + this.trainLocomotive.getLength() / 2 + lastElement.getLength() / 2
        : this.trainLocomotive.getLength();

    return {
      speed: this.trainLocomotive.getSpeed(),
      desiredSpeed: this.trainLocomotive.getDesiredSpeed(),
      minSpeed: this.trainLocomotive.getMinSpeed(),
      maxSpeed: this.trainLocomotive.getMaxSpeed(),
      acceleration: this.trainLocomotive.getAcceleration(),
      traveledDistance: this.trainLocomotive.getTraveledDistance(),
      wagonCount: this.wagons.length,
      convoyLength,
      route: this.routeSnapshot,
    };
  }
}
