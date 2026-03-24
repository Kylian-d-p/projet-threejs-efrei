import { TextureLoader } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class Loader {
  private GLTFLoader = new GLTFLoader();
  private textureLoader = new TextureLoader();

  public loadGLTF(path: string) {
    return this.GLTFLoader.loadAsync(path);
  }

  public loadTexture(path: string) {
    return this.textureLoader.loadAsync(path);
  }
}
