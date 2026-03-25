export interface TrainHudSnapshot {
  readonly speed: number;
  readonly desiredSpeed: number;
  readonly minSpeed: number;
  readonly maxSpeed: number;
  readonly acceleration: number;
  readonly traveledDistance: number;
  readonly wagonCount: number;
  readonly convoyLength: number;
}

export class HudManager {
  private readonly root: HTMLDivElement;
  private readonly statValues: Record<string, HTMLSpanElement>;
  private readonly speedCommandValue: HTMLSpanElement;
  private readonly speedCommandSlider: HTMLInputElement;
  private readonly onDesiredSpeedChange: (value: number) => void;

  constructor(onDesiredSpeedChange: (value: number) => void) {
    this.onDesiredSpeedChange = onDesiredSpeedChange;
    this.root = document.createElement("div");
    this.root.id = "train-hud";

    const shell = document.createElement("div");
    shell.className = "train-hud__shell";
    this.root.appendChild(shell);

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
      acceleration: this.createSummaryStat(summary, "Acceleration", "0"),
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

    const decreaseButton = this.createCommandButton("-10");
    decreaseButton.addEventListener("click", () => {
      this.onDesiredSpeedChange(Math.max(Number(this.speedCommandSlider.min), Number(this.speedCommandSlider.value) - 10));
    });
    commandControls.appendChild(decreaseButton);

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

    document.body.appendChild(this.root);
  }

  public update(snapshot: TrainHudSnapshot): void {
    this.setValue("speed", `${this.formatNumber(snapshot.speed, 1)} km/h`);
    this.setValue("traveledDistance", `${this.formatNumber(snapshot.traveledDistance, 0)} m`);
    this.setValue("wagonCount", `${snapshot.wagonCount}`);
    this.setValue("convoyLength", `${this.formatNumber(snapshot.convoyLength, 1)} m`);
    this.setValue("maxSpeed", `${this.formatNumber(snapshot.maxSpeed, 0)} km/h`);
    this.setValue("acceleration", `${this.formatNumber(snapshot.acceleration, 1)} m/s²`);

    this.speedCommandSlider.min = `${Math.min(snapshot.minSpeed, snapshot.maxSpeed)}`;
    this.speedCommandSlider.max = `${Math.max(1, Math.round(snapshot.maxSpeed))}`;
    this.speedCommandSlider.value = `${Math.max(Number(this.speedCommandSlider.min), Math.min(snapshot.desiredSpeed, Number(this.speedCommandSlider.max)))}`;
    this.speedCommandValue.textContent = `${this.formatNumber(snapshot.desiredSpeed, 0)} km/h`;
  }

  public destroy(): void {
    this.root.remove();
  }

  private setValue(key: string, value: string): void {
    this.statValues[key].textContent = value;
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

  private createCommandButton(label: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "train-hud__command-button";
    button.type = "button";
    button.textContent = label;
    return button;
  }

  private formatNumber(value: number, fractionDigits: number): string {
    return value.toFixed(fractionDigits);
  }
}
