"use client";

import { useRef, useEffect, useState, useCallback, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { useRoom } from "@/hooks/useRoom";
import { SLIDES } from "@/components/slides";
import { TapWave } from "@/components/TapWave";
import { InteractionTally } from "@/components/InteractionTally";
import { TitleSceneContents, TitleHTMLLayer } from "@/components/slides/Slide00Title";

const TOTAL = SLIDES.length;

export default function PresenterPage() {
  const [slide, setSlide] = useState(0);
  const { state, broadcastSlide } = useRoom();

  const htmlElRef = useRef<HTMLDivElement | null>(null);

  // Sync local slide → room on change
  useEffect(() => {
    broadcastSlide(slide);
  }, [slide, broadcastSlide]);

  const next = useCallback(() => setSlide((s) => Math.min(s + 1, TOTAL - 1)), []);
  const prev = useCallback(() => setSlide((s) => Math.max(s - 1, 0)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ")
        next();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const isTitle = slide === 0;
  const SlideComponent = SLIDES[slide];

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
            interactive={false}
            onTap={() => {}}
          />
        ) : (
          <SlideComponent interactive={false} onTap={() => {}} />
        )}
      </div>

      {/* Tap aggregate overlay */}
      <TapWave count={state.tapCount} total={state.tapTotal} />

      {/* Final slide: reveal the room's total interactions */}
      {slide === TOTAL - 1 && (
        <InteractionTally tapTotal={state.tapTotal} hoverTotal={state.hoverTotal} />
      )}

      {/* Presenter HUD */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 text-white/40 text-xs font-mono select-none" style={{ zIndex: 10 }}>
        <button onClick={prev} className="px-3 py-1 border border-white/20 rounded hover:text-white/80">
          ←
        </button>
        <span>
          {slide + 1} / {TOTAL}
        </span>
        <button onClick={next} className="px-3 py-1 border border-white/20 rounded hover:text-white/80">
          →
        </button>
      </div>

      {/* Interaction counter badge */}
      <div className="absolute top-4 right-4 text-white/50 text-xs font-mono" style={{ zIndex: 10 }}>
        {state.tapTotal + state.hoverTotal} interactions · {state.tapTotal} taps · {state.hoverTotal} hovers · {state.tapCount} recent
      </div>
    </div>
  );
}
