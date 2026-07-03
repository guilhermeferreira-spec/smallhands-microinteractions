import type { SlideProps } from "./types";

/**
 * Slide09AIAside — one line, no interaction. Quick and light.
 */

export default function Slide09AIAside(_props: SlideProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#000] px-16">
      <p className="text-center font-title text-3xl text-white md:text-5xl">
        1 hour <span className="text-white/30">vs</span> 2 weeks
      </p>
    </div>
  );
}
