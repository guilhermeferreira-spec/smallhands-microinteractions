import type { SlideProps } from "./types";

/**
 * Slide05End — Close. Just the question, large, centered. No interaction —
 * you ask, the room answers. Biggest whitespace of the deck, mirrors the
 * hero's calm.
 *
 * DRAFT COPY — swap CLOSING_QUESTION for your actual closing line.
 */

const CLOSING_QUESTION = "What's the smallest interaction you could improve on Monday?";

export default function Slide05End(_props: SlideProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#000] px-24">
      <h2 className="max-w-4xl text-center font-title text-3xl leading-[1.6] text-white md:text-5xl">
        {CLOSING_QUESTION}
      </h2>
    </div>
  );
}
