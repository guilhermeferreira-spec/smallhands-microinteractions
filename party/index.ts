import type * as Party from "partykit/server";

export interface SlideMessage {
  type: "slide";
  slide: number;
}

export interface TapMessage {
  type: "tap";
  clientId: string;
}

export interface TapAggregateMessage {
  type: "tap_aggregate";
  count: number;
  total: number;
}

export interface InitMessage {
  type: "init";
  slide: number;
  tapTotal: number;
}

type IncomingMessage = SlideMessage | TapMessage;
type OutgoingMessage = SlideMessage | TapAggregateMessage | InitMessage;

export default class SmallHandsParty implements Party.Server {
  currentSlide: number = 0;
  tapTotal: number = 0;
  // Rolling window: taps in the last 3 seconds
  recentTaps: number[] = [];

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    // Send current state to late joiners
    const init: InitMessage = {
      type: "init",
      slide: this.currentSlide,
      tapTotal: this.tapTotal,
    };
    conn.send(JSON.stringify(init));
  }

  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message) as IncomingMessage;

    if (msg.type === "slide") {
      this.currentSlide = msg.slide;
      // Broadcast to all including sender
      this.room.broadcast(JSON.stringify(msg));
    }

    if (msg.type === "tap") {
      this.tapTotal += 1;
      const now = Date.now();
      this.recentTaps.push(now);
      // Keep only last 3s
      this.recentTaps = this.recentTaps.filter((t) => now - t < 3000);

      const aggregate: TapAggregateMessage = {
        type: "tap_aggregate",
        count: this.recentTaps.length,
        total: this.tapTotal,
      };
      this.room.broadcast(JSON.stringify(aggregate));
    }
  }
}

SmallHandsParty satisfies Party.Worker;
