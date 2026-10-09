export type InteractionKind = "tap" | "hover";

export interface SlideProps {
  interactive: boolean;
  // Defaults to a "tap". Pass "hover" for hover interactions.
  // Robust to being used directly as a DOM handler (event arg → treated as tap).
  onTap: (kind?: InteractionKind) => void;
  // Room "jam reset" counter from the server (null until connected). Only the
  // jam shelf reads it; other slides ignore it.
  epoch?: number | null;
}

export type SlideComponent = React.ComponentType<SlideProps>;
