"use client";

import { useRef, useState, type MutableRefObject } from "react";
import { useRoom } from "@/hooks/useRoom";
import { SLIDES } from "@/components/slides";
import { InteractionTally } from "@/components/InteractionTally";
import { HeroCanvas } from "@/components/HeroCanvas";
import { TitleHTMLLayer } from "@/components/slides/Slide00Title";
import Slide02WhatIs from "@/components/slides/Slide02WhatIs";

// Index of the anatomy slide in the SLIDES array. Must match the presenter page.
const SLIDE02_INDEX = 2;

export default function AudiencePage() {
  const [slide, setSlide] = useState(0);
  const { state, broadcastTap } = useRoom({
    onSlide: (s) => setSlide(s),
  });

  // Shared ref: TitleHTMLLayer writes it, TitleSceneContents reads it.
  // Must live here so it survives slide changes without remounting.
  const htmlElRef = useRef<HTMLDivElement | null>(null);

  const isTitle = slide === 0;
  const isSlide02 = slide === SLIDE02_INDEX;
  const isLast = slide === SLIDES.length - 1;
  const SlideComponent = SLIDES[slide] ?? SLIDES[0];

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Persistent Canvas — mounts ONCE, never unmounts. Memoized so
          interaction-count re-renders never touch the 3D scene. */}
      <HeroCanvas
        active={isTitle}
        htmlElRef={htmlElRef as MutableRefObject<HTMLElement | null>}
        onInteraction={broadcastTap}
      />

      {/* Slide overlay — plain DOM, above canvas */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
        {isTitle ? (
          <TitleHTMLLayer
            elRef={htmlElRef}
            interactive={true}
            onTap={broadcastTap}
          />
        ) : isSlide02 ? (
          // Audience watches the presenter's highlight. No onSelect, no
          // isPresenter → words render as plain text, no clicking.
          <Slide02WhatIs
            interactive={false}
            onTap={() => {}}
            activeIndex={state.activeIndex}
          />
        ) : (
          <SlideComponent interactive={true} onTap={broadcastTap} />
        )}
      </div>

      {/* Final slide: reveal the room's total interactions */}
      {isLast && (
        <InteractionTally tapTotal={state.tapTotal} hoverTotal={state.hoverTotal} />
      )}
    </div>
  );
}