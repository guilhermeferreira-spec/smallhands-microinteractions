"use client";

import { useState } from "react";
import { SlideProps } from "./types";

export default function Slide02TheReveal({ interactive, onTap }: SlideProps) {
  const [tapped, setTapped] = useState(false);

  const handleTap = () => {
    setTapped(true);
    onTap();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white gap-8 px-16">
      {!tapped ? (
        <>
          <p className="font-body text-3xl text-white/70">
            This isn&apos;t just a slide deck.
          </p>
          {interactive && (
            <button
              onClick={handleTap}
              className="mt-4 w-24 h-24 rounded-full border-2 border-white/30 text-white/40
                hover:border-white/80 hover:text-white/80 transition-all duration-500
                active:scale-90 font-title text-[0.625rem] uppercase tracking-[0.1em]"
            >
              tap
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <p className="font-title text-xl leading-[1.6] text-white text-center">
            You just sent me a signal.
          </p>
          <p className="font-body text-2xl text-white/60">
            Everyone in this room can do that.
          </p>
        </div>
      )}
    </div>
  );
}
