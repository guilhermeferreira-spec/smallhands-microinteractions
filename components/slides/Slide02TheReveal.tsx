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
          <p className="text-2xl text-white/60 font-light">
            This isn't just a slide deck.
          </p>
          {interactive && (
            <button
              onClick={handleTap}
              className="mt-4 w-24 h-24 rounded-full border-2 border-white/30 text-white/40
                hover:border-white/80 hover:text-white/80 transition-all duration-500
                active:scale-90 text-sm font-mono"
            >
              tap
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <p className="text-3xl text-white font-light">
            You just sent me a signal.
          </p>
          <p className="text-lg text-white/50">
            Everyone in this room can do that.
          </p>
        </div>
      )}
    </div>
  );
}
