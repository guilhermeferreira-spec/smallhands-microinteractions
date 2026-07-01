"use client";

import { memo } from "react";
import { Canvas } from "@react-three/fiber";
import { TitleSceneContents } from "@/components/slides/Slide00Title";
import type { InteractionKind } from "@/components/slides/types";

interface HeroCanvasProps {
  active: boolean; // render the title scene (slide 0)
  onInteraction?: (kind?: InteractionKind) => void;
}

// Memoized so the page re-rendering (e.g. on interaction-count updates) does
// NOT re-render the WebGL Canvas subtree. Props are all stable across those
// re-renders (active flips only on slide change, the others are stable refs/
// callbacks), so React skips this entirely — the 3D scene is never touched by
// counting. This is the r3f-recommended isolation pattern.
function HeroCanvasImpl({ active, onInteraction }: HeroCanvasProps) {
  return (
    <Canvas
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        zIndex: 1,
        pointerEvents: "none",
      }}
      gl={{ antialias: true, alpha: false }}
      frameloop="always"
    >
      {active && <TitleSceneContents onInteraction={onInteraction} />}
    </Canvas>
  );
}

export const HeroCanvas = memo(HeroCanvasImpl);
