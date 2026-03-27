import type { RouteFinalSummary, RouteIndicatorSnapshot, RouteProgressSnapshot } from "./RouteProgression";

export interface TrainHudSnapshot {
  readonly speed: number;
  readonly desiredSpeed: number;
  readonly minSpeed: number;
  readonly maxSpeed: number;
  readonly acceleration: number;
  readonly traveledDistance: number;
  readonly wagonCount: number;
  readonly convoyLength: number;
  readonly route: RouteProgressSnapshot;
}

type IndicatorElements = {
  readonly card: HTMLDivElement;
  readonly label: HTMLSpanElement;
  readonly distance: HTMLSpanElement;
  readonly detail: HTMLParagraphElement;
};

export class HudManager {
  private readonly root: HTMLDivElement;
  private readonly statValues: Record<string, HTMLSpanElement>;
  private readonly routeValues: Record<string, HTMLSpanElement>;
  private readonly speedCommandValue: HTMLSpanElement;
  private readonly speedCommandSlider: HTMLInputElement;
  private readonly commandButtons: HTMLButtonElement[] = [];
  private readonly signalIndicator: IndicatorElements;
  private readonly stationIndicator: IndicatorElements;
  private readonly objectiveValue: HTMLParagraphElement;
  private readonly messageValue: HTMLParagraphElement;
  private readonly finishOverlay: HTMLDivElement;
  private readonly finishTitle: HTMLHeadingElement;
  private readonly finishSubtitle: HTMLParagraphElement;
  private readonly finishValues: Record<string, HTMLSpanElement>;
  private readonly onDesiredSpeedChange: (value: number) => void;

  constructor(onDesiredSpeedChange: (value: number) => void) {
    this.onDesiredSpeedChange = onDesiredSpeedChange;
    this.root = document.createElement("div");
    this.root.id = "train-hud";

    const layout = document.createElement("div");
    layout.className = "train-hud__layout";
    this.root.appendChild(layout);

    const shell = document.createElement("div");
    shell.className = "train-hud__shell";
    layout.appendChild(shell);

    const aside = document.createElement("aside");
    aside.className = "train-hud__aside";
    layout.appendChild(aside);

    const header = document.createElement("div");
    header.className = "train-hud__header";
    shell.appendChild(header);

    const titleBlock = document.createElement("div");
    titleBlock.className = "train-hud__title-block";
    header.appendChild(titleBlock);

    const eyebrow = document.createElement("span");
    eyebrow.className = "train-hud__eyebrow";
    eyebrow.textContent = "Telemetry";
    titleBlock.appendChild(eyebrow);

    const title = document.createElement("h1");
    title.className = "train-hud__title";
    title.textContent = "Stats du train";
    titleBlock.appendChild(title);

    const summary = document.createElement("div");
    summary.className = "train-hud__summary";
    header.appendChild(summary);

    this.statValues = {
      speed: this.createSummaryStat(summary, "Vitesse", "0 km/h"),
      traveledDistance: this.createSummaryStat(summary, "Distance", "0 m"),
      wagonCount: this.createSummaryStat(summary, "Wagons", "0"),
      convoyLength: this.createSummaryStat(summary, "Longueur", "0 m"),
      maxSpeed: this.createSummaryStat(summary, "Vitesse max", "0 km/h"),
      acceleration: this.createSummaryStat(summary, "Acceleration", "0 km/h/s"),
    };

    const commandPanel = this.createPanel(shell, "Commande de vitesse");
    const commandHeader = document.createElement("div");
    commandHeader.className = "train-hud__command-header";
    commandPanel.appendChild(commandHeader);

    const commandLabel = document.createElement("span");
    commandLabel.className = "train-hud__label";
    commandLabel.textContent = "Consigne moteur";
    commandHeader.appendChild(commandLabel);

    this.speedCommandValue = document.createElement("span");
    this.speedCommandValue.className = "train-hud__command-value";
    this.speedCommandValue.textContent = "0 km/h";
    commandHeader.appendChild(this.speedCommandValue);

    const commandControls = document.createElement("div");
    commandControls.className = "train-hud__command-controls";
    commandPanel.appendChild(commandControls);

    const stopButton = this.createCommandButton("STOP");
    stopButton.classList.add("train-hud__command-button--stop");
    stopButton.addEventListener("click", () => {
      this.onDesiredSpeedChange(0);
    });
    commandControls.appendChild(stopButton);
    this.commandButtons.push(stopButton);

    const decreaseButton = this.createCommandButton("-10");
    decreaseButton.addEventListener("click", () => {
      this.onDesiredSpeedChange(Math.max(Number(this.speedCommandSlider.min), Number(this.speedCommandSlider.value) - 10));
    });
    commandControls.appendChild(decreaseButton);
    this.commandButtons.push(decreaseButton);

    this.speedCommandSlider = document.createElement("input");
    this.speedCommandSlider.className = "train-hud__slider";
    this.speedCommandSlider.type = "range";
    this.speedCommandSlider.min = "-10";
    this.speedCommandSlider.max = "190";
    this.speedCommandSlider.step = "1";
    this.speedCommandSlider.value = "0";
    this.speedCommandSlider.addEventListener("input", () => {
      this.onDesiredSpeedChange(Number(this.speedCommandSlider.value));
    });
    commandControls.appendChild(this.speedCommandSlider);

    const increaseButton = this.createCommandButton("+10");
    increaseButton.addEventListener("click", () => {
      this.onDesiredSpeedChange(Math.min(Number(this.speedCommandSlider.max), Number(this.speedCommandSlider.value) + 10));
    });
    commandControls.appendChild(increaseButton);
    this.commandButtons.push(increaseButton);

    const indicatorGrid = document.createElement("div");
    indicatorGrid.className = "train-hud__indicator-grid";
    aside.appendChild(indicatorGrid);

    this.signalIndicator = this.createIndicatorCard(indicatorGrid, "Prochain feu");
    this.stationIndicator = this.createIndicatorCard(indicatorGrid, "Prochaine gare");

    const routePanel = this.createPanel(aside, "Progression");

    this.objectiveValue = document.createElement("p");
    this.objectiveValue.className = "train-hud__objective";
    this.objectiveValue.textContent = "En attente de la mission.";
    routePanel.appendChild(this.objectiveValue);

    this.messageValue = document.createElement("p");
    this.messageValue.className = "train-hud__note";
    this.messageValue.textContent = "";
    routePanel.appendChild(this.messageValue);

    const routeStats = document.createElement("div");
    routeStats.className = "train-hud__summary";
    routePanel.appendChild(routeStats);

    this.routeValues = {
      stations: this.createSummaryStat(routeStats, "Gares validees", "0 / 0"),
      signals: this.createSummaryStat(routeStats, "Feux valides", "0 / 0"),
    };

    this.finishOverlay = document.createElement("div");
    this.finishOverlay.className = "train-hud__finish-overlay";
    this.root.appendChild(this.finishOverlay);

    const finishCard = document.createElement("section");
    finishCard.className = "train-hud__finish-card";
    this.finishOverlay.appendChild(finishCard);

    const finishEyebrow = document.createElement("span");
    finishEyebrow.className = "train-hud__eyebrow";
    finishEyebrow.textContent = "Fin de partie";
    finishCard.appendChild(finishEyebrow);

    this.finishTitle = document.createElement("h2");
    this.finishTitle.className = "train-hud__finish-title";
    this.finishTitle.textContent = "Terminus";
    finishCard.appendChild(this.finishTitle);

    this.finishSubtitle = document.createElement("p");
    this.finishSubtitle.className = "train-hud__finish-subtitle";
    this.finishSubtitle.textContent = "Le bilan de votre trajet apparait ici.";
    finishCard.appendChild(this.finishSubtitle);

    const finishGrid = document.createElement("div");
    finishGrid.className = "train-hud__finish-grid";
    finishCard.appendChild(finishGrid);

    this.finishValues = {
      stations: this.createSummaryStat(finishGrid, "Gares validees", "0 / 0"),
      missedStations: this.createSummaryStat(finishGrid, "Gares manquees", "0"),
      signals: this.createSummaryStat(finishGrid, "Feux respectes", "0 / 0"),
      violations: this.createSummaryStat(finishGrid, "Feux grilles", "0"),
      distance: this.createSummaryStat(finishGrid, "Distance", "0 m"),
      duration: this.createSummaryStat(finishGrid, "Temps", "0 s"),
    };

    document.body.appendChild(this.root);
  }

  public update(snapshot: TrainHudSnapshot): void {
    this.setValue("speed", `${this.formatNumber(snapshot.speed, 0)} km/h`);
    this.setValue("traveledDistance", `${this.formatNumber(snapshot.traveledDistance, 0)} m`);
    this.setValue("wagonCount", `${snapshot.wagonCount}`);
    this.setValue("convoyLength", `${this.formatNumber(snapshot.convoyLength, 1)} m`);
    this.setValue("maxSpeed", `${this.formatNumber(snapshot.maxSpeed, 0)} km/h`);
    this.setValue("acceleration", `${this.formatNumber(snapshot.acceleration, 1)} km/h/s`);

    const sliderMin = `${Math.min(snapshot.minSpeed, snapshot.maxSpeed)}`;
    const sliderMax = `${Math.max(1, Math.round(snapshot.maxSpeed))}`;
    const sliderValue = `${Math.max(Number(sliderMin), Math.min(snapshot.desiredSpeed, Number(sliderMax)))}`;

    if (this.speedCommandSlider.min !== sliderMin) {
      this.speedCommandSlider.min = sliderMin;
    }
    if (this.speedCommandSlider.max !== sliderMax) {
      this.speedCommandSlider.max = sliderMax;
    }
    if (this.speedCommandSlider.value !== sliderValue) {
      this.speedCommandSlider.value = sliderValue;
    }
    this.setTextIfChanged(this.speedCommandValue, `${this.formatNumber(snapshot.desiredSpeed, 0)} km/h`);

    this.updateIndicator(this.signalIndicator, snapshot.route.nextSignal);
    this.updateIndicator(this.stationIndicator, snapshot.route.nextStation);
    this.setTextIfChanged(this.objectiveValue, snapshot.route.objective);
    this.setTextIfChanged(this.messageValue, snapshot.route.message);
    this.setTextIfChanged(this.routeValues.stations, `${snapshot.route.validatedStations} / ${snapshot.route.totalStations}`);
    this.setTextIfChanged(this.routeValues.signals, `${snapshot.route.clearedSignals} / ${snapshot.route.totalSignals}`);

    if (this.speedCommandSlider.disabled !== snapshot.route.gameEnded) {
      this.speedCommandSlider.disabled = snapshot.route.gameEnded;
    }
    for (const button of this.commandButtons) {
      if (button.disabled !== snapshot.route.gameEnded) {
        button.disabled = snapshot.route.gameEnded;
      }
    }

    this.updateFinishOverlay(snapshot.route.finalSummary, snapshot.route.gameEnded);
  }

  public destroy(): void {
    this.root.remove();
  }

  private updateIndicator(indicator: IndicatorElements, snapshot: RouteIndicatorSnapshot): void {
    if (indicator.card.dataset.tone !== snapshot.tone) {
      indicator.card.dataset.tone = snapshot.tone;
    }
    this.setTextIfChanged(indicator.label, snapshot.label);
    this.setTextIfChanged(indicator.distance, snapshot.distance === null ? "OK" : `${this.formatNumber(snapshot.distance, 0)} m`);
    this.setTextIfChanged(indicator.detail, snapshot.detail);
  }

  private updateFinishOverlay(summary: RouteFinalSummary | null, isVisible: boolean): void {
    this.finishOverlay.classList.toggle("is-visible", isVisible);

    if (summary === null) {
      return;
    }

    this.setTextIfChanged(this.finishTitle, "Terminus atteint");
    this.setTextIfChanged(this.finishSubtitle, `Mention: ${summary.rating}`);
    this.setTextIfChanged(this.finishValues.stations, `${summary.validatedStations} / ${summary.totalStations}`);
    this.setTextIfChanged(this.finishValues.missedStations, `${summary.missedStations}`);
    this.setTextIfChanged(this.finishValues.signals, `${summary.clearedSignals} / ${summary.totalSignals}`);
    this.setTextIfChanged(this.finishValues.violations, `${summary.violatedSignals}`);
    this.setTextIfChanged(this.finishValues.distance, `${this.formatNumber(summary.distanceTraveled, 0)} m`);
    this.setTextIfChanged(this.finishValues.duration, this.formatDuration(summary.totalTime));
  }

  private setValue(key: string, value: string): void {
    this.setTextIfChanged(this.statValues[key], value);
  }

  private setTextIfChanged(element: Node & { textContent: string | null }, value: string): void {
    if (element.textContent !== value) {
      element.textContent = value;
    }
  }

  private createSummaryStat(container: HTMLElement, label: string, initialValue: string): HTMLSpanElement {
    const item = document.createElement("div");
    item.className = "train-hud__summary-item";
    container.appendChild(item);

    const name = document.createElement("span");
    name.className = "train-hud__label";
    name.textContent = label;
    item.appendChild(name);

    const value = document.createElement("span");
    value.className = "train-hud__value";
    value.textContent = initialValue;
    item.appendChild(value);

    return value;
  }

  private createPanel(parent: HTMLElement, title: string): HTMLElement {
    const panel = document.createElement("section");
    panel.className = "train-hud__panel";
    parent.appendChild(panel);

    const heading = document.createElement("h2");
    heading.className = "train-hud__panel-title";
    heading.textContent = title;
    panel.appendChild(heading);

    return panel;
  }

  private createIndicatorCard(parent: HTMLElement, title: string): IndicatorElements {
    const card = document.createElement("div");
    card.className = "train-hud__indicator";
    card.dataset.tone = "neutral";
    parent.appendChild(card);

    const eyebrow = document.createElement("span");
    eyebrow.className = "train-hud__eyebrow";
    eyebrow.textContent = title;
    card.appendChild(eyebrow);

    const label = document.createElement("span");
    label.className = "train-hud__indicator-label";
    label.textContent = "-";
    card.appendChild(label);

    const distance = document.createElement("span");
    distance.className = "train-hud__indicator-distance";
    distance.textContent = "0 m";
    card.appendChild(distance);

    const detail = document.createElement("p");
    detail.className = "train-hud__indicator-detail";
    detail.textContent = "";
    card.appendChild(detail);

    return { card, label, distance, detail };
  }

  private createCommandButton(label: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "train-hud__command-button";
    button.type = "button";
    button.textContent = label;
    return button;
  }

  private formatDuration(value: number): string {
    const totalSeconds = Math.max(0, Math.round(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds} s`;
    }

    return `${minutes} min ${seconds.toString().padStart(2, "0")} s`;
  }

  private formatNumber(value: number, fractionDigits: number): string {
    return value.toFixed(fractionDigits);
  }
}
