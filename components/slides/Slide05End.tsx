import type { SlideProps } from "./types";

/**
 * Slide05End — Close. Thank you, nothing else. The InteractionTally overlay
 * (rendered by the pages on the last slide) carries the payoff number.
 */

export default function Slide05End(_props: SlideProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-[#000] px-16">
      <h2 className="text-center font-title text-4xl leading-[1.4] text-white md:text-6xl">
        Thank you
      </h2>
      <p className="font-body text-2xl text-white/30">小さな手 — smallhands</p>
    </div>
  );
}
