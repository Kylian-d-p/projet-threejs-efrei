import { Group, InstancedMesh, MathUtils, MeshStandardMaterial, Object3D, PlaneGeometry } from "three";

export class Terrain {
  private readonly object = new Group();
  private readonly tiles: InstancedMesh;
  private readonly helper = new Object3D();
  private readonly tileSize: number;
  private readonly rows: number;
  private readonly columns: number;
  private readonly totalDepth: number;
  private readonly totalWidth: number;
  private traveledDistance: number = 0;
  private lastAnchorRow: number | null = null;

  constructor(settings?: { tileSize?: number; rows?: number; columns?: number; y?: number }) {
    this.tileSize = settings?.tileSize ?? 20;
    this.rows = settings?.rows ?? 10;
    this.columns = settings?.columns ?? 7;
    this.totalDepth = this.rows * this.tileSize;
    this.totalWidth = this.columns * this.tileSize;

    const geometry = new PlaneGeometry(this.tileSize, this.tileSize);
    geometry.rotateX(-Math.PI / 2);

    const material = new MeshStandardMaterial({ color: 0x68a357 });
    this.tiles = new InstancedMesh(geometry, material, this.rows * this.columns);
    this.tiles.receiveShadow = true;
    this.tiles.frustumCulled = false;

    this.object.position.y = settings?.y ?? -0.05;
    this.object.add(this.tiles);

    this.updateTiles();
  }

  public getObject(): Group {
    return this.object;
  }

  public loop(anchorZ: number): void {
    this.traveledDistance = anchorZ;
    this.updateTiles(anchorZ);
  }

  private updateTiles(anchorZ: number = this.traveledDistance): void {
    const halfDepth = this.totalDepth / 2;
    const halfWidth = this.totalWidth / 2;
    const anchorRow = Math.floor(anchorZ / this.tileSize);

    if (this.lastAnchorRow === anchorRow) {
      return;
    }

    this.lastAnchorRow = anchorRow;
    let index = 0;

    for (let row = 0; row < this.rows; row += 1) {
      const rowIndex = anchorRow + row - Math.floor(this.rows / 2);
      const z = rowIndex * this.tileSize + this.tileSize / 2;

      for (let column = 0; column < this.columns; column += 1) {
        const x = column * this.tileSize - halfWidth + this.tileSize / 2;

        this.helper.position.set(x, 0, z);
        this.helper.updateMatrix();
        this.tiles.setMatrixAt(index, this.helper.matrix);
        index += 1;
      }
    }

    this.tiles.instanceMatrix.needsUpdate = true;
  }
}
