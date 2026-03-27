import * as THREE from "three";
import { Game } from "./Game";
import "./hud.css";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

let lastFrameTime = 0;

async function start(): Promise<void> {
  const game = await Game.create();

  function animate(timeElapsedSinceBeginning: number): void {
    const timeElapsedSinceLastFrame = (timeElapsedSinceBeginning - lastFrameTime) / 1000;
    lastFrameTime = timeElapsedSinceBeginning;

    game.loop(timeElapsedSinceLastFrame);
    renderer.render(game.getScene(), game.getCamera());
  }

  renderer.setAnimationLoop(animate);
}

void start();
