import * as THREE from "three";
import { Game } from "./Game";
import "./hud.css";

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.domElement.style.cursor = "grab";
document.body.appendChild(renderer.domElement);

let lastFrameTime = 0;

async function start(): Promise<void> {
  const game = await Game.create();
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  game.setViewportSize(window.innerWidth, window.innerHeight);

  renderer.domElement.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    isDragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    renderer.domElement.style.cursor = "grabbing";
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }

    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    game.rotateCamera(deltaX, deltaY);
  });

  const stopDragging = (pointerId?: number) => {
    isDragging = false;
    renderer.domElement.style.cursor = "grab";

    if (pointerId !== undefined && renderer.domElement.hasPointerCapture(pointerId)) {
      renderer.domElement.releasePointerCapture(pointerId);
    }
  };

  renderer.domElement.addEventListener("pointerup", (event) => {
    stopDragging(event.pointerId);
  });

  renderer.domElement.addEventListener("pointercancel", (event) => {
    stopDragging(event.pointerId);
  });

  renderer.domElement.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      game.zoomCamera(event.deltaY);
    },
    { passive: false },
  );

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    game.setViewportSize(window.innerWidth, window.innerHeight);
  });

  function animate(timeElapsedSinceBeginning: number): void {
    if (lastFrameTime === 0) {
      lastFrameTime = timeElapsedSinceBeginning;
    }

    const timeElapsedSinceLastFrame = (timeElapsedSinceBeginning - lastFrameTime) / 1000;
    lastFrameTime = timeElapsedSinceBeginning;

    game.loop(timeElapsedSinceLastFrame);
    renderer.render(game.getScene(), game.getCamera());
  }

  renderer.setAnimationLoop(animate);
}

void start();
