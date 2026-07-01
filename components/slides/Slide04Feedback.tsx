"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SlideProps } from "./types";

// ── Swipe-to-delete, done right ─────────────────────────────────────────────
// Styled as a database table. Swiping a row LEFT (the platform convention:
// iOS Reminders, YouTube) uncovers a red trash panel behind it — the signifier
// that makes the gesture discoverable. Release past the threshold deletes the
// record. Audience-play: draggable on the audience screen, static on the
// presenter's.

type Severity = "high" | "med" | "low";

// Realistic TELUS Digital consultancy backlog rows (demo data — edit freely).
const INITIAL_ROWS: { id: number; ticket: string; issue: string; severity: Severity }[] = [
  { id: 1, ticket: "DS-2041", issue: "Duplicate CTAs on checkout", severity: "high" },
  { id: 2, ticket: "DS-2044", issue: "Legacy cookie banner", severity: "med" },
  { id: 3, ticket: "DS-2050", issue: "Autoplay hero carousel", severity: "high" },
  { id: 4, ticket: "DS-2058", issue: "Redundant confirm dialog", severity: "low" },
  { id: 5, ticket: "DS-2063", issue: "Newsletter interstitial", severity: "med" },
  { id: 6, ticket: "DS-2071", issue: "Tooltip on every icon", severity: "low" },
];

const DELETE_THRESHOLD = 130; // px of left-drag past which release deletes
const GRID = "104px 1fr 92px"; // ticket · issue · severity

// Severity styling via opacity tiers (label carries meaning, not colour alone).
const SEV_CLASS: Record<Severity, string> = {
  high: "text-white/80 border-white/30",
  med: "text-white/50 border-white/20",
  low: "text-white/30 border-white/12",
};

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

interface RowProps {
  ticket: string;
  issue: string;
  severity: Severity;
  interactive: boolean;
  onDelete: () => void;
}

function Row({ ticket, issue, severity, interactive, onDelete }: RowProps) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const startX = useRef(0);

  const armed = -dx >= DELETE_THRESHOLD; // past the point of no return

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!interactive || removing) return;
    startX.current = e.clientX;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    setDx(Math.min(0, e.clientX - startX.current)); // left-only
  };

  const finish = () => {
    if (!dragging) return;
    setDragging(false);
    if (armed) setRemoving(true);
    else setDx(0);
  };

  return (
    <div
      className="relative overflow-hidden border-b border-white/[0.06] last:border-b-0"
      style={{
        maxHeight: removing ? 0 : 60,
        opacity: removing ? 0 : 1,
        transition: removing ? "max-height 300ms ease, opacity 200ms ease" : "none",
      }}
      onTransitionEnd={() => {
        if (removing) onDelete();
      }}
    >
      {/* Delete panel revealed behind the row */}
      <div
        className="absolute inset-0 flex items-center justify-end gap-2 pr-6 text-white"
        style={{ background: armed ? "#dc2626" : "#761717", transition: "background 120ms" }}
      >
        <TrashIcon />
        <span className="font-body text-lg uppercase tracking-[0.1em]">Delete</span>
      </div>

      {/* Foreground row (opaque, slides left to reveal the panel) */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        className="grid items-center h-[60px] px-5"
        style={{
          gridTemplateColumns: GRID,
          background: "#0b0b0b",
          transform: `translateX(${removing ? -560 : dx}px)`,
          transition: dragging
            ? "none"
            : "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          cursor: "default",
          touchAction: "pan-y",
        }}
      >
        <span className="font-body text-lg text-white/40 tabular-nums tracking-wide">
          {ticket}
        </span>
        <span className="font-body text-xl text-white/85 truncate pr-4">{issue}</span>
        <span
          className={`justify-self-start font-body text-sm uppercase tracking-[0.08em] border rounded px-2 py-0.5 ${SEV_CLASS[severity]}`}
        >
          {severity}
        </span>
      </div>
    </div>
  );
}

export default function Slide04Feedback({ interactive, onTap }: SlideProps) {
  const [rows, setRows] = useState(INITIAL_ROWS);

  const remove = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    onTap(); // each delete counts as one interaction
  };

  const reset = () => setRows(INITIAL_ROWS);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white px-16">
      <div className="w-full max-w-2xl rounded-xl border border-white/12 bg-white/[0.03] overflow-hidden shadow-2xl">
        {/* Query caption bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.04]">
          <span className="font-body text-lg text-white/55 tracking-wide">
            <span className="text-white/30">SELECT * FROM</span> design_debt
          </span>
          <span className="font-body text-base uppercase tracking-[0.1em] text-white/35 tabular-nums">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
          </span>
        </div>

        {/* Column header */}
        <div
          className="grid items-center px-5 py-2.5 border-b border-white/10 bg-white/[0.02] font-body text-sm uppercase tracking-[0.12em] text-white/35"
          style={{ gridTemplateColumns: GRID }}
        >
          <span>ticket</span>
          <span>issue</span>
          <span>severity</span>
        </div>

        {/* Rows */}
        {rows.length > 0 ? (
          rows.map((r) => (
            <Row
              key={r.id}
              ticket={r.ticket}
              issue={r.issue}
              severity={r.severity}
              interactive={interactive}
              onDelete={() => remove(r.id)}
            />
          ))
        ) : (
          <div className="px-5 py-10 text-center font-body text-xl text-white/30">
            0 rows returned
          </div>
        )}
      </div>

      {/* Reset — reload rows without a page refresh */}
      <button
        onClick={reset}
        disabled={rows.length === INITIAL_ROWS.length}
        className="mt-6 flex items-center gap-2 font-body text-base uppercase tracking-[0.1em] text-white/40 hover:text-white/80 disabled:opacity-30 disabled:hover:text-white/40 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
        Reset rows
      </button>
    </div>
  );
}
