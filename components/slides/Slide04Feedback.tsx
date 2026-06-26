"use client";

import { useState } from "react";
import { SlideProps } from "./types";

export default function Slide04Feedback({ interactive, onTap }: SlideProps) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  const handleLike = () => {
    if (!liked) {
      setLiked(true);
      setCount((c) => c + 1);
    } else {
      setLiked(false);
      setCount((c) => c - 1);
    }
    onTap();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white gap-8 px-16">
      <h2 className="text-3xl font-light text-white/80">
        Feedback loops close the action.
      </h2>
      <p className="text-base text-white/40 max-w-md text-center">
        Without feedback, the user doesn't know if anything happened. The microinteraction <em>is</em> the confirmation.
      </p>

      {interactive && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <button
            onClick={handleLike}
            className="text-4xl transition-transform active:scale-75"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {liked ? "❤️" : "🤍"}
          </button>
          <span className="text-sm text-white/40 font-mono tabular-nums">
            {count}
          </span>
        </div>
      )}
    </div>
  );
}
