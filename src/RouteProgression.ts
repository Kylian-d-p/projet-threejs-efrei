import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, PointLight, SphereGeometry } from "three";

export type RouteIndicatorTone = "neutral" | "info" | "danger" | "success";

export interface RouteIndicatorSnapshot {
  readonly label: string;
  readonly distance: number | null;
  readonly detail: string;
  readonly tone: RouteIndicatorTone;
}

export interface RouteFinalSummary {
  readonly validatedStations: number;
  readonly missedStations: number;
  readonly clearedSignals: number;
  readonly violatedSignals: number;
  readonly totalStations: number;
  readonly totalSignals: number;
  readonly distanceTraveled: number;
  readonly totalTime: number;
  readonly rating: string;
}

export interface RouteProgressSnapshot {
  readonly nextSignal: RouteIndicatorSnapshot;
  readonly nextStation: RouteIndicatorSnapshot;
  readonly objective: string;
  readonly message: string;
  readonly validatedStations: number;
  readonly totalStations: number;
  readonly clearedSignals: number;
  readonly totalSignals: number;
  readonly gameEnded: boolean;
  readonly finalSummary: RouteFinalSummary | null;
}

type StationState = "pending" | "validated" | "missed";
type SignalState = "pending" | "cleared" | "violated";

interface StationCheckpoint {
  id: number;
  name: string;
  distance: number;
  start: number;
  end: number;
  dwellDuration: number;
  stopTimer: number;
  state: StationState;
  group: Group;
}

interface SignalCheckpoint {
  id: number;
  distance: number;
  stopTimer: number;
  releaseDuration: number;
  state: SignalState;
  group: Group;
  redLens: Mesh;
  greenLens: Mesh;
  redLight: PointLight;
  greenLight: PointLight;
}

export class RouteProgression {
  private static readonly stationDistances = [50, 1300, 2550];
  private static readonly stationPlatformLength = 70;
  private static readonly stationDwellDuration = 2;
  private static readonly stationStopSpeed = 1.2;
  private static readonly signalReleaseDuration = 1.2;
  private static readonly signalStopSpeed = 1.2;
  private static readonly signalValidationRange = 30;

  private readonly object = new Group();
  private readonly stations: StationCheckpoint[];
  private readonly signals: SignalCheckpoint[];
  private elapsedTime = 0;
  private gameEnded = false;
  private finalSummary: RouteFinalSummary | null = null;
  private message = "Desservir 3 gares et respecter tous les feux.";
  private messageTimeRemaining = 4;

  constructor() {
    this.stations = RouteProgression.stationDistances.map((distance, index) => this.createStationCheckpoint(index + 1, distance));
    this.signals = this.buildSignalDistances(RouteProgression.stationDistances).map((distance, index) =>
      this.createSignalCheckpoint(index + 1, distance),
    );

    for (const station of this.stations) {
      this.object.add(station.group);
    }

    for (const signal of this.signals) {
      this.object.add(signal.group);
    }
  }

  public getObject(): Group {
    return this.object;
  }

  public isGameEnded(): boolean {
    return this.gameEnded;
  }

  public update(timeElapsedSinceLastFrame: number, progressDistance: number, speed: number): RouteProgressSnapshot {
    if (!this.gameEnded) {
      this.elapsedTime += timeElapsedSinceLastFrame;
      this.updateSignals(timeElapsedSinceLastFrame, progressDistance, speed);
      this.updateStations(timeElapsedSinceLastFrame, progressDistance, speed);
      this.updateGameEnd(progressDistance);
    }

    if (this.messageTimeRemaining > 0) {
      this.messageTimeRemaining = Math.max(0, this.messageTimeRemaining - timeElapsedSinceLastFrame);
    }

    return this.buildSnapshot(progressDistance);
  }

  private updateSignals(timeElapsedSinceLastFrame: number, progressDistance: number, speed: number): void {
    for (const signal of this.signals) {
      if (signal.state !== "pending") {
        continue;
      }

      const distanceToSignal = signal.distance - progressDistance;
      const canValidate = distanceToSignal >= 0 && distanceToSignal <= RouteProgression.signalValidationRange;

      if (canValidate) {
        if (speed <= RouteProgression.signalStopSpeed) {
          signal.stopTimer += timeElapsedSinceLastFrame;

          if (signal.stopTimer >= signal.releaseDuration) {
            signal.state = "cleared";
            this.applySignalVisualState(signal);
            this.pushMessage(`Feu ${signal.id} valide. Voie libre.`);
          }
        } else {
          signal.stopTimer = 0;
        }
      } else if (distanceToSignal < -2) {
        signal.state = "violated";
        signal.stopTimer = 0;
        this.applySignalVisualState(signal);
        this.pushMessage(`Feu ${signal.id} grille.`);
      } else {
        signal.stopTimer = 0;
      }
    }
  }

  private updateStations(timeElapsedSinceLastFrame: number, progressDistance: number, speed: number): void {
    for (const station of this.stations) {
      if (station.state !== "pending") {
        continue;
      }

      const isInsideStation = progressDistance >= station.start && progressDistance <= station.end;

      if (isInsideStation) {
        if (speed <= RouteProgression.stationStopSpeed) {
          station.stopTimer += timeElapsedSinceLastFrame;

          if (station.stopTimer >= station.dwellDuration) {
            station.state = "validated";
            this.pushMessage(`${station.name} validee.`);
          }
        } else {
          station.stopTimer = 0;
        }
      } else if (progressDistance > station.end + 6) {
        station.state = "missed";
        station.stopTimer = 0;
        this.pushMessage(`${station.name} manquee.`);
      } else {
        station.stopTimer = 0;
      }
    }
  }

  private updateGameEnd(progressDistance: number): void {
    const finalStation = this.stations[this.stations.length - 1];

    if (finalStation.state === "validated") {
      this.finishGame(progressDistance);
      return;
    }

    if (finalStation.state === "missed" && progressDistance > finalStation.end + 12) {
      this.finishGame(progressDistance);
    }
  }

  private finishGame(progressDistance: number): void {
    if (this.gameEnded) {
      return;
    }

    this.gameEnded = true;
    this.finalSummary = this.createFinalSummary(progressDistance);
    this.pushMessage("Terminus atteint. Bilan de la partie disponible.");
  }

  private buildSnapshot(progressDistance: number): RouteProgressSnapshot {
    const nextSignal = this.buildNextSignalIndicator(progressDistance);
    const nextStation = this.buildNextStationIndicator(progressDistance);
    const validatedStations = this.stations.filter((station) => station.state === "validated").length;
    const clearedSignals = this.signals.filter((signal) => signal.state === "cleared").length;

    return {
      nextSignal,
      nextStation,
      objective: this.buildObjective(progressDistance, nextSignal, nextStation),
      message:
        this.messageTimeRemaining > 0
          ? this.message
          : `Gares ${validatedStations}/${this.stations.length} | Feux ${clearedSignals}/${this.signals.length}`,
      validatedStations,
      totalStations: this.stations.length,
      clearedSignals,
      totalSignals: this.signals.length,
      gameEnded: this.gameEnded,
      finalSummary: this.finalSummary,
    };
  }

  private buildNextSignalIndicator(progressDistance: number): RouteIndicatorSnapshot {
    const nextSignal = this.signals.find(
      (signal) => signal.state === "pending" || (signal.state === "cleared" && progressDistance <= signal.distance + 3),
    );

    if (nextSignal === undefined) {
      return {
        label: "Tous les feux",
        distance: null,
        detail: "Aucun feu a venir sur le trajet.",
        tone: "success",
      };
    }

    const distance = Math.max(0, nextSignal.distance - progressDistance);

    if (nextSignal.state === "cleared") {
      return {
        label: `Feu ${nextSignal.id}`,
        distance,
        detail: "Vert. Le passage est autorise.",
        tone: "success",
      };
    }

    return {
      label: `Feu ${nextSignal.id}`,
      distance,
      detail: distance <= 120 ? "Rouge. Arret obligatoire avant le mat." : "Feu rouge en approche.",
      tone: distance <= 120 ? "danger" : "info",
    };
  }

  private buildNextStationIndicator(progressDistance: number): RouteIndicatorSnapshot {
    const nextStation = this.stations.find((station) => station.state === "pending");

    if (nextStation === undefined) {
      return {
        label: "Terminus",
        distance: null,
        detail: this.gameEnded ? "Trajet termine." : "Toutes les gares ont ete traitees.",
        tone: this.gameEnded ? "success" : "neutral",
      };
    }

    const distance = Math.max(0, nextStation.distance - progressDistance);
    const inStation = progressDistance >= nextStation.start && progressDistance <= nextStation.end;

    return {
      label: nextStation.name,
      distance,
      detail: inStation ? "Immobilisez le train 2 s pour valider l'arret." : "Bloc beton, abri et lampadaires en approche.",
      tone: inStation || distance <= 140 ? "info" : "neutral",
    };
  }

  private buildObjective(progressDistance: number, nextSignal: RouteIndicatorSnapshot, nextStation: RouteIndicatorSnapshot): string {
    if (this.gameEnded) {
      return "Partie terminee.";
    }

    const activeStation = this.stations.find(
      (station) => station.state === "pending" && progressDistance >= station.start && progressDistance <= station.end,
    );
    if (activeStation !== undefined) {
      return `Arret en gare: immobilisez le train dans ${activeStation.name}.`;
    }

    if (nextSignal.distance !== null && nextSignal.distance <= 120 && nextSignal.tone === "danger") {
      return "Priorite au prochain feu rouge: stoppez le train pour le valider.";
    }

    if (nextStation.distance !== null && nextStation.distance <= 180) {
      return `Preparez l'arret a ${nextStation.label}.`;
    }

    return "Gardez une vitesse maitrisee et surveillez la signalisation.";
  }

  private createFinalSummary(progressDistance: number): RouteFinalSummary {
    const validatedStations = this.stations.filter((station) => station.state === "validated").length;
    const missedStations = this.stations.filter((station) => station.state === "missed").length;
    const clearedSignals = this.signals.filter((signal) => signal.state === "cleared").length;
    const violatedSignals = this.signals.filter((signal) => signal.state === "violated").length;
    const totalChecks = this.stations.length + this.signals.length;
    const successfulChecks = validatedStations + clearedSignals;
    const completionRatio = totalChecks > 0 ? successfulChecks / totalChecks : 1;

    return {
      validatedStations,
      missedStations,
      clearedSignals,
      violatedSignals,
      totalStations: this.stations.length,
      totalSignals: this.signals.length,
      distanceTraveled: progressDistance,
      totalTime: this.elapsedTime,
      rating: this.getRating(completionRatio),
    };
  }

  private getRating(completionRatio: number): string {
    if (completionRatio >= 1) {
      return "Parfait";
    }

    if (completionRatio >= 0.8) {
      return "Tres bon";
    }

    if (completionRatio >= 0.6) {
      return "Solide";
    }

    return "A revoir";
  }

  private buildSignalDistances(stationDistances: readonly number[]): number[] {
    const random = this.createRandom(20260326);
    const windows: Array<{ start: number; end: number; count: number }> = [
      { start: stationDistances[0] + 90, end: stationDistances[1] - 90, count: 2 },
      { start: stationDistances[1] + 90, end: stationDistances[2] - 90, count: 2 },
    ];

    const distances: number[] = [];

    for (const window of windows) {
      const span = window.end - window.start;

      for (let index = 0; index < window.count; index += 1) {
        const base = window.start + (span * (index + 1)) / (window.count + 1);
        const jitter = (random() - 0.5) * Math.min(22, span / 5);
        const distance = Math.round(base + jitter);
        const previousDistance = distances[distances.length - 1];

        distances.push(previousDistance === undefined ? distance : Math.max(previousDistance + 35, distance));
      }
    }

    return distances;
  }

  private createStationCheckpoint(id: number, distance: number): StationCheckpoint {
    const platformLength = RouteProgression.stationPlatformLength;
    const stationGroup = this.createStationGroup(id, platformLength);
    stationGroup.position.z = -distance;

    return {
      id,
      name: `Gare ${id}`,
      distance,
      start: distance - platformLength / 2,
      end: distance + platformLength / 2,
      dwellDuration: RouteProgression.stationDwellDuration,
      stopTimer: 0,
      state: "pending",
      group: stationGroup,
    };
  }

  private createSignalCheckpoint(id: number, distance: number): SignalCheckpoint {
    const signalGroup = new Group();
    signalGroup.position.z = -distance;

    const pole = this.createShadowedMesh(
      new CylinderGeometry(0.12, 0.12, 5.6, 12),
      new MeshStandardMaterial({ color: 0x3f464f, roughness: 0.9, metalness: 0.2 }),
    );
    pole.position.set(4.2, 2.8, 0);
    signalGroup.add(pole);

    const head = this.createShadowedMesh(new BoxGeometry(0.9, 1.8, 0.6), new MeshStandardMaterial({ color: 0x22262d, roughness: 0.9 }));
    head.position.set(4.2, 4.2, 0);
    signalGroup.add(head);

    const redLens = this.createShadowedMesh(
      new SphereGeometry(0.18, 16, 16),
      new MeshStandardMaterial({ color: 0xff5959, emissive: 0xff4545, emissiveIntensity: 2.2, roughness: 0.3 }),
    );
    redLens.position.set(4.2, 4.55, 0.34);
    signalGroup.add(redLens);

    const greenLens = this.createShadowedMesh(
      new SphereGeometry(0.18, 16, 16),
      new MeshStandardMaterial({ color: 0x4fbf67, emissive: 0x0c3514, emissiveIntensity: 0.2, roughness: 0.3 }),
    );
    greenLens.position.set(4.2, 3.88, 0.34);
    signalGroup.add(greenLens);

    const redLight = new PointLight(0xff4545, 1.5, 10, 2);
    redLight.position.copy(redLens.position);
    signalGroup.add(redLight);

    const greenLight = new PointLight(0x64ff84, 0, 10, 2);
    greenLight.position.copy(greenLens.position);
    signalGroup.add(greenLight);

    const stopMarker = this.createShadowedMesh(new BoxGeometry(3.4, 0.05, 0.8), new MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.8 }));
    stopMarker.position.set(0, 0.05, 4);
    signalGroup.add(stopMarker);

    const warningStrip = this.createShadowedMesh(new BoxGeometry(3.4, 0.04, 0.25), new MeshStandardMaterial({ color: 0xd34a4a, roughness: 0.7 }));
    warningStrip.position.set(0, 0.08, 4);
    signalGroup.add(warningStrip);

    const checkpoint: SignalCheckpoint = {
      id,
      distance,
      stopTimer: 0,
      releaseDuration: RouteProgression.signalReleaseDuration,
      state: "pending",
      group: signalGroup,
      redLens,
      greenLens,
      redLight,
      greenLight,
    };

    this.applySignalVisualState(checkpoint);

    return checkpoint;
  }

  private createStationGroup(id: number, platformLength: number): Group {
    const group = new Group();
    const platformX = 4.8;

    const platform = this.createShadowedMesh(new BoxGeometry(7.6, 0.9, platformLength), new MeshStandardMaterial({ color: 0x9ea4aa, roughness: 1 }));
    platform.position.set(platformX, 0.45, 0);
    group.add(platform);

    const edgeLine = this.createShadowedMesh(
      new BoxGeometry(0.22, 0.05, platformLength - 4),
      new MeshStandardMaterial({ color: 0xf0d163, roughness: 0.8 }),
    );
    edgeLine.position.set(platformX - 3.55, 0.93, 0);
    group.add(edgeLine);

    const shelterRoof = this.createShadowedMesh(
      new BoxGeometry(6.4, 0.24, 10),
      new MeshStandardMaterial({ color: 0x39424d, roughness: 0.9, metalness: 0.1 }),
    );
    shelterRoof.position.set(platformX + 1, 3, 0);
    group.add(shelterRoof);

    const shelterBack = this.createShadowedMesh(
      new BoxGeometry(0.18, 2.2, 10),
      new MeshStandardMaterial({ color: 0xa8c5d8, roughness: 0.4, metalness: 0.1 }),
    );
    shelterBack.position.set(platformX + 3.9, 1.85, 0);
    group.add(shelterBack);

    for (const localZ of [-3.4, 3.4]) {
      const post = this.createShadowedMesh(new BoxGeometry(0.18, 2.4, 0.18), new MeshStandardMaterial({ color: 0x505963, roughness: 0.9 }));
      post.position.set(platformX - 1.7, 1.8, localZ);
      group.add(post);

      const backPost = this.createShadowedMesh(new BoxGeometry(0.18, 2.4, 0.18), new MeshStandardMaterial({ color: 0x505963, roughness: 0.9 }));
      backPost.position.set(platformX + 3.3, 1.8, localZ);
      group.add(backPost);
    }

    const benchSeat = this.createShadowedMesh(new BoxGeometry(1.6, 0.12, 0.6), new MeshStandardMaterial({ color: 0x6d4d34, roughness: 1 }));
    benchSeat.position.set(platformX + 0.6, 1.1, 2.6);
    group.add(benchSeat);

    const benchBase = this.createShadowedMesh(new BoxGeometry(1.2, 0.5, 0.18), new MeshStandardMaterial({ color: 0x474d54, roughness: 0.9 }));
    benchBase.position.set(platformX + 0.6, 0.82, 2.6);
    group.add(benchBase);

    const signPole = this.createShadowedMesh(
      new CylinderGeometry(0.08, 0.08, 2.2, 12),
      new MeshStandardMaterial({ color: 0x465160, roughness: 0.9 }),
    );
    signPole.position.set(platformX + 2.9, 1.5, -11);
    group.add(signPole);

    const signBoard = this.createShadowedMesh(
      new BoxGeometry(2.2, 0.8, 0.12),
      new MeshStandardMaterial({ color: id === 3 ? 0xc96b3c : 0x2f5d8a, roughness: 0.8 }),
    );
    signBoard.position.set(platformX + 2.9, 2.4, -11);
    group.add(signBoard);

    for (const localZ of [-22, 22]) {
      group.add(this.createLampPost(platformX + 2.5, localZ));
    }

    return group;
  }

  private createLampPost(x: number, z: number): Group {
    const group = new Group();

    const pole = this.createShadowedMesh(new CylinderGeometry(0.08, 0.08, 4.8, 10), new MeshStandardMaterial({ color: 0x4b5058, roughness: 0.9 }));
    pole.position.set(x, 2.4, z);
    group.add(pole);

    const arm = this.createShadowedMesh(new BoxGeometry(0.8, 0.08, 0.08), new MeshStandardMaterial({ color: 0x4b5058, roughness: 0.9 }));
    arm.position.set(x - 0.35, 4.55, z);
    group.add(arm);

    const lamp = this.createShadowedMesh(
      new SphereGeometry(0.14, 12, 12),
      new MeshStandardMaterial({ color: 0xffe1a8, emissive: 0xffc56e, emissiveIntensity: 1.5, roughness: 0.4 }),
    );
    lamp.position.set(x - 0.75, 4.4, z);
    group.add(lamp);

    const light = new PointLight(0xffdf9b, 0.9, 16, 2);
    light.position.copy(lamp.position);
    group.add(light);

    return group;
  }

  private applySignalVisualState(signal: SignalCheckpoint): void {
    const redMaterial = signal.redLens.material;
    const greenMaterial = signal.greenLens.material;

    if (!(redMaterial instanceof MeshStandardMaterial) || !(greenMaterial instanceof MeshStandardMaterial)) {
      return;
    }

    if (signal.state === "cleared") {
      redMaterial.emissiveIntensity = 0.15;
      greenMaterial.emissiveIntensity = 2.3;
      signal.redLight.intensity = 0;
      signal.greenLight.intensity = 1.4;
      return;
    }

    redMaterial.emissiveIntensity = signal.state === "violated" ? 3 : 2.2;
    greenMaterial.emissiveIntensity = 0.1;
    signal.redLight.intensity = signal.state === "violated" ? 2 : 1.5;
    signal.greenLight.intensity = 0;
  }

  private createShadowedMesh(geometry: BoxGeometry | CylinderGeometry | SphereGeometry, material: MeshStandardMaterial): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private pushMessage(message: string): void {
    this.message = message;
    this.messageTimeRemaining = 4;
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
