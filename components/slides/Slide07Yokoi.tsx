import type { SlideProps } from "./types";

/**
 * Slide07Yokoi — the biggest beat, let it breathe.
 *
 * Static: no interaction, no click, no auto-advance. Just the portrait,
 * anchored to the bottom edge, with a dark gradient overlay for depth so it
 * blends into the black background instead of hard-cutting.
 */

export default function Slide07Yokoi(_props: SlideProps) {
  return (
    <div className="relative flex h-full w-full items-end justify-center overflow-hidden bg-[#000]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/gunpei-gameboy.png"
        alt="Gunpei Yokoi with the Game Boy"
        className="max-h-[92vh] w-auto object-contain object-bottom"
      />

      {/* Depth gradient — overlays the bottom of the image, fading to black */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 85%, #000 100%)",
        }}
      />
    </div>
  );
}
