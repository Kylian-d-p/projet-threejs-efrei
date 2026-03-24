import { Group, MathUtils, Mesh, MeshStandardMaterial, SphereGeometry } from "three";

export class Clouds {
  private readonly object = new Group();
  private readonly chunks: Group[] = [];
  private readonly chunkLength: number;
  private readonly halfChunkCount: number;
  private anchorZ = 0;

  constructor(settings?: { chunkLength?: number; chunkCount?: number }) {
    this.chunkLength = settings?.chunkLength ?? 140;

    const chunkCount = settings?.chunkCount ?? 12;
    this.halfChunkCount = Math.floor(chunkCount / 2);

    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = new Group();
      const logicalRow = index - this.halfChunkCount;
      chunk.userData.logicalRow = logicalRow;
      this.chunks.push(chunk);
      this.object.add(chunk);
      this.populateChunk(chunk, logicalRow);
      this.placeChunk(chunk, logicalRow);
    }
  }

  public getObject(): Group {
    return this.object;
  }

  public loop(anchorZ: number): void {
    this.anchorZ = anchorZ;
    this.updateChunks(anchorZ);
  }

  private updateChunks(anchorZ: number): void {
    const currentRow = Math.floor(anchorZ / this.chunkLength);
    const minVisibleRow = currentRow - this.halfChunkCount;
    const maxVisibleRow = currentRow + this.halfChunkCount;

    for (const chunk of this.chunks) {
      let logicalRow = chunk.userData.logicalRow as number;

      while (logicalRow < minVisibleRow) {
        logicalRow += this.chunks.length;
        chunk.userData.logicalRow = logicalRow;
        this.populateChunk(chunk, logicalRow);
      }

      while (logicalRow > maxVisibleRow) {
        logicalRow -= this.chunks.length;
        chunk.userData.logicalRow = logicalRow;
        this.populateChunk(chunk, logicalRow);
      }

      this.placeChunk(chunk, logicalRow);
    }
  }

  private populateChunk(chunk: Group, logicalRow: number): void {
    chunk.clear();

    const random = this.createRandom(logicalRow + 101);
    const cloudCount = 2 + Math.floor(random() * 3);

    for (let cloudIndex = 0; cloudIndex < cloudCount; cloudIndex += 1) {
      const cloud = new Group();
      const puffCount = 3 + Math.floor(random() * 3);
      const cloudWidth = 12 + random() * 18;

      for (let puffIndex = 0; puffIndex < puffCount; puffIndex += 1) {
        const radius = 2.5 + random() * 3.5;
        const geometry = new SphereGeometry(radius, 12, 12);
        const material = new MeshStandardMaterial({
          color: 0xffffff,
          roughness: 1,
          metalness: 0,
        });
        const puff = new Mesh(geometry, material);
        puff.castShadow = true;
        puff.receiveShadow = true;

        puff.position.set(
          -cloudWidth / 2 + random() * cloudWidth,
          random() * 2.5,
          -3 + random() * 6,
        );
        puff.scale.y = 0.65 + random() * 0.35;
        cloud.add(puff);
      }

      cloud.position.set(
        MathUtils.randFloatSpread(120),
        28 + random() * 14,
        -this.chunkLength / 2 + random() * this.chunkLength,
      );
      chunk.add(cloud);
    }
  }

  private placeChunk(chunk: Group, logicalRow: number): void {
    chunk.position.z = logicalRow * this.chunkLength;
  }

  private createRandom(seed: number): () => number {
    let value = (seed ^ 0x45d9f3b) >>> 0;

    return () => {
      value = (value + 0x6d2b79f5) >>> 0;
      let result = Math.imul(value ^ (value >>> 15), 1 | value);
      result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }
}
