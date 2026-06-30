"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:8787";
// Must match the kebab-cased PartyServer binding name (SmallHandsParty).
const PARTY = "small-hands-party";
const ROOM = "main";

export type InteractionKind = "tap" | "hover";

export interface RoomState {
  slide: number;
  activeIndex: number; // highlighted part on Slide02 (-1 = none)
  tapCount: number; // recent interactions (3s window)
  tapTotal: number; // cumulative taps
  hoverTotal: number; // cumulative hovers
}

interface UseRoomOptions {
  onSlide?: (slide: number) => void;
}

export function useRoom(options: UseRoomOptions = {}) {
  const socketRef = useRef<PartySocket | null>(null);
  const [state, setState] = useState<RoomState>({
    slide: 0,
    activeIndex: -1,
    tapCount: 0,
    tapTotal: 0,
    hoverTotal: 0,
  });
  const onSlideRef = useRef(options.onSlide);
  onSlideRef.current = options.onSlide;

  // Interactions are accumulated in refs (zero re-render, immune to jittery
  // hover) and flushed to the server at most once/second as a batch. The
  // server holds the grand total and echoes an aggregate ≤1x/sec, so a
  // re-render storm is impossible and the 3D hero is never touched by counting.
  const pendingTaps = useRef(0);
  const pendingHovers = useRef(0);

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      party: PARTY,
      room: ROOM,
    });
    socketRef.current = socket;

    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "init") {
        setState((s) => ({
          ...s,
          slide: msg.slide,
          activeIndex: msg.activeIndex ?? -1,
          tapTotal: msg.tapTotal,
          hoverTotal: msg.hoverTotal ?? 0,
        }));
        onSlideRef.current?.(msg.slide);
      }

      if (msg.type === "slide") {
        setState((s) => ({ ...s, slide: msg.slide }));
        onSlideRef.current?.(msg.slide);
      }

      if (msg.type === "activeIndex") {
        setState((s) => ({ ...s, activeIndex: msg.index }));
      }

      if (msg.type === "tap_aggregate") {
        setState((s) => ({
          ...s,
          tapCount: msg.count,
          tapTotal: msg.total,
          hoverTotal: msg.hoverTotal ?? s.hoverTotal,
        }));
      }
    });

    // Flush accumulated interactions to the server once per second.
    const flush = setInterval(() => {
      const taps = pendingTaps.current;
      const hovers = pendingHovers.current;
      if (taps === 0 && hovers === 0) return;
      pendingTaps.current = 0;
      pendingHovers.current = 0;
      socket.send(JSON.stringify({ type: "tap_batch", taps, hovers }));
    }, 1000);

    return () => {
      socket.close();
      clearInterval(flush);
    };
  }, []);

  const broadcastSlide = useCallback((slide: number) => {
    socketRef.current?.send(JSON.stringify({ type: "slide", slide }));
  }, []);

  const broadcastActiveIndex = useCallback((index: number) => {
    socketRef.current?.send(JSON.stringify({ type: "activeIndex", index }));
  }, []);

  const broadcastTap = useCallback((kind?: InteractionKind) => {
    // Increment a ref only — NO socket, NO re-render. Safe to call from a
    // jittery per-frame hover or directly as a DOM handler (event arg = tap).
    // The 1s flush above batches these to the server.
    if (kind === "hover") pendingHovers.current += 1;
    else pendingTaps.current += 1;
  }, []);

  const broadcastReset = useCallback(() => {
    pendingTaps.current = 0;
    pendingHovers.current = 0;
    socketRef.current?.send(JSON.stringify({ type: "reset" }));
  }, []);

  return {
    state,
    broadcastSlide,
    broadcastActiveIndex,
    broadcastTap,
    broadcastReset,
  };
}
