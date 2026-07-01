declare module "troika-three-text" {
  import { Mesh } from "three";
  export class Text extends Mesh {
    text: string;
    font: string;
    fontSize: number;
    color: number | string;
    anchorX: number | string;
    anchorY: number | string;
    letterSpacing: number;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
