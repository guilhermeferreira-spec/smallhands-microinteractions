export interface SlideProps {
  interactive: boolean;
  onTap: () => void;
}

export type SlideComponent = React.ComponentType<SlideProps>;
