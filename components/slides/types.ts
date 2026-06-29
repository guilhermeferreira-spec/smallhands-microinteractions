export type InteractionKind = "tap" | "hover";

export interface SlideProps {
  interactive: boolean;
  // Defaults to a "tap". Pass "hover" for hover interactions.
  // Robust to being used directly as a DOM handler (event arg → treated as tap).
  onTap: (kind?: InteractionKind) => void;
}

export type SlideComponent = React.ComponentType<SlideProps>;
