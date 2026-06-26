"use client";

import { useRef, useState, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { useRoom } from "@/hooks/useRoom";
import { SLIDES } from "@/components/slides";
import { TitleSceneContents, TitleHTMLLayer } from "@/components/slides/Slide00Title";

export default function AudiencePage() {
  const [slide, setSlide] = useState(0);
  const { broadcastTap } = useRoom({
    onSlide: (s) => setSlide(s),
  });

  // Shared ref: TitleHTMLLayer writes it, TitleSceneContents reads it.
  // Must live here so it survives slide changes without remounting.
  const htmlElRef = useRef<HTMLDivElement | null>(null);

  const isTitle = slide === 0;
  const SlideComponent = SLIDES[slide] ?? SLIDES[0];

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Persistent Canvas — mounts ONCE, never unmounts */}
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
        {isTitle && (
          <TitleSceneContents htmlElRef={htmlElRef as MutableRefObject<HTMLElement | null>} />
        )}
      </Canvas>

      {/* Slide overlay — plain DOM, above canvas */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
        {isTitle ? (
          <TitleHTMLLayer
            elRef={htmlElRef}
            interactive={true}
            onTap={broadcastTap}
          />
        ) : (
          <SlideComponent interactive={true} onTap={broadcastTap} />
        )}
      </div>
    </div>
  );
}
