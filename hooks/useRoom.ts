"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";

const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:8787";
// Must match the kebab-cased PartyServer binding name (SmallHandsParty).
const PARTY = "small-hands-party";
const ROOM = "main";

export type InteractionKind = "tap" | "hover";

export interface RoomState {
  slide: number;
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
    tapCount: 0,
    tapTotal: 0,
    hoverTotal: 0,
  });
  const onSlideRef = useRef(options.onSlide);
  onSlideRef.current = options.onSlide;

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
          tapTotal: msg.tapTotal,
          hoverTotal: msg.hoverTotal ?? 0,
        }));
        onSlideRef.current?.(msg.slide);
      }

      if (msg.type === "slide") {
        setState((s) => ({ ...s, slide: msg.slide }));
        onSlideRef.current?.(msg.slide);
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

    return () => {
      socket.close();
    };
  }, []);

  const broadcastSlide = useCallback((slide: number) => {
    socketRef.current?.send(JSON.stringify({ type: "slide", slide }));
  }, []);

  const broadcastTap = useCallback((kind?: InteractionKind) => {
    // Anything that isn't an explicit "hover" counts as a tap — this keeps
    // it safe to use directly as a DOM handler (where the arg is an event).
    const resolved: InteractionKind = kind === "hover" ? "hover" : "tap";
    socketRef.current?.send(
      JSON.stringify({
        type: "tap",
        clientId: socketRef.current?.id ?? "?",
        kind: resolved,
      })
    );
  }, []);

  const broadcastReset = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: "reset" }));
  }, []);

  return { state, broadcastSlide, broadcastTap, broadcastReset };
}
