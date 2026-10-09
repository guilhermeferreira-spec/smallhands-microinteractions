"use client";

// Isolated sandbox for JamShelf: tune motion + blob live, no PartyKit, no deck.
// Copy the JSON into DEFAULT_TUNING in components/slides/JamShelf.tsx when happy.

import { useEffect, useState } from "react";
import JamShelf, { DEFAULT_TUNING, type JamTuning } from "@/components/slides/JamShelf";

const NAMES = ["kiwi", "passion", "?????", "orange", "strawberry", "gomu gomu", "berry"];

const CONTROLS: { key: keyof JamTuning; label: string; min: number; max: number; step: number }[] = [
  { key: "lift", label: "lift (px)", min: 0, max: 40, step: 1 },
  { key: "scale", label: "scale", min: 1, max: 1.15, step: 0.005 },
  { key: "tilt", label: "tilt (deg)", min: 0, max: 8, step: 0.25 },
  { key: "nudge", label: "neighbour nudge (px)", min: 0, max: 30, step: 1 },
  { key: "glow", label: "glow (px)", min: 0, max: 50, step: 1 },
  { key: "blobScale", label: "blob width (% of jar)", min: 80, max: 300, step: 5 },
  { key: "blobX", label: "blob X offset (%)", min: -30, max: 30, step: 0.5 },
  { key: "blobY", label: "blob Y offset (%)", min: -30, max: 30, step: 0.5 },
  { key: "blobRotate", label: "blob rotate (deg)", min: -5, max: 5, step: 0.1 },
  { key: "blobWiggle", label: "blob wiggle ± (deg)", min: 0, max: 5, step: 0.1 },
  { key: "trailCount", label: "trail echoes", min: 0, max: 4, step: 1 },
  { key: "trailGap", label: "trail overshoot (%)", min: 1, max: 20, step: 0.5 },
  { key: "trailStroke", label: "trail stroke", min: 1, max: 12, step: 0.5 },
  { key: "chosenScale", label: "chosen jar scale", min: 1, max: 3.5, step: 0.05 },
  { key: "shelfY", label: "shelf + title down (px)", min: 0, max: 400, step: 5 },
  { key: "chosenY", label: "chosen group nudge (vh)", min: -15, max: 15, step: 0.5 },
  { key: "tagWiggle", label: "tag jitter (px)", min: 0, max: 8, step: 0.5 },
  { key: "tagRotate", label: "tag jitter (deg)", min: 0, max: 3, step: 0.1 },
  { key: "tagFps", label: "tag fps", min: 2, max: 24, step: 1 },
  { key: "fps", label: "lottie fps", min: 4, max: 30, step: 1 },
  { key: "trailDelay", label: "trail stagger (ms)", min: 0, max: 200, step: 5 },
];

export default function JamSandbox() {
  const [tuning, setTuning] = useState<JamTuning>(DEFAULT_TUNING);
  const [pinned, setPinned] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<number | null>(null); // forced committed view
  const [run, setRun] = useState(0); // bump to remount → clears a real click-commit

  const unpick = () => {
    setPreview(null);
    setRun((r) => r + 1);
  };

  // Press R to un-pick without reaching for the button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) unpick();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(tuning, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black">
      <div className="min-h-0 flex-1">
        <JamShelf
          key={run}
          interactive
          persist={false}
          onTap={() => {}}
          tuning={tuning}
          pinned={pinned}
          committedOverride={preview}
        />
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 border-t border-white/20 bg-black p-3 font-mono text-xs text-white/70 md:grid-cols-4">
        <label className="flex items-center justify-between gap-2">
          <span>pin jar</span>
          <select
            className="rounded border border-white/20 bg-black px-1 py-0.5"
            value={pinned ?? ""}
            onChange={(e) => setPinned(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">none (hover)</option>
            {NAMES.map((n, i) => (
              <option key={n} value={i}>
                {i + 1} {n}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-2">
          <span>preview picked</span>
          <select
            className="rounded border border-white/20 bg-black px-1 py-0.5"
            value={preview ?? ""}
            onChange={(e) => setPreview(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">none</option>
            {NAMES.map((n, i) => (
              <option key={n} value={i}>
                {i + 1} {n}
              </option>
            ))}
          </select>
        </label>

        {CONTROLS.map((c) => (
          <label key={c.key} className="block">
            <span className="flex justify-between">
              <span>{c.label}</span>
              <span className="text-white">{tuning[c.key]}</span>
            </span>
            <input
              type="range"
              className="w-full"
              min={c.min}
              max={c.max}
              step={c.step}
              value={tuning[c.key]}
              onChange={(e) => setTuning((t) => ({ ...t, [c.key]: Number(e.target.value) }))}
            />
          </label>
        ))}

        <div className="flex gap-2 pt-1">
          <button onClick={copy} className="flex-1 rounded border border-white/30 px-2 py-1 hover:text-white">
            {copied ? "copied" : "copy JSON"}
          </button>
          <button
            onClick={() => setTuning(DEFAULT_TUNING)}
            className="rounded border border-white/30 px-2 py-1 hover:text-white"
          >
            reset
          </button>
          <button
            onClick={unpick}
            className="rounded border border-white/30 px-2 py-1 hover:text-white"
          >
            un-pick (R)
          </button>
        </div>
      </div>
    </div>
  );
}
