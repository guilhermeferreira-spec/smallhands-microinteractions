import { routePartykitRequest, Server, type Connection } from "partyserver";

export interface SlideMessage {
  type: "slide";
  slide: number;
}

// Presenter highlights one part of the anatomy row on Slide02; rides the same
// simple road as `slide` (store -> broadcast). No batching needed: a presenter
// clicks once every few seconds, not hundreds of times like taps.
export interface ActiveIndexMessage {
  type: "activeIndex";
  index: number;
}

export type InteractionKind = "tap" | "hover";

// Clients accumulate interactions locally and flush a batch ~once/second.
export interface TapBatchMessage {
  type: "tap_batch";
  taps: number;
  hovers: number;
}

export interface TapAggregateMessage {
  type: "tap_aggregate";
  count: number; // interactions in the last 3s (taps + hovers)
  total: number; // cumulative taps
  hoverTotal: number; // cumulative hovers
}

export interface InitMessage {
  type: "init";
  slide: number;
  activeIndex: number;
  tapTotal: number;
  hoverTotal: number;
}

export interface ResetMessage {
  type: "reset";
}

type IncomingMessage =
  | SlideMessage
  | TapBatchMessage
  | ResetMessage
  | ActiveIndexMessage;

interface Env {
  SmallHandsParty: DurableObjectNamespace<SmallHandsParty>;
}

// One Durable Object instance per room. Holds the current slide and tap
// totals in memory and broadcasts changes to every connected client.
export class SmallHandsParty extends Server<Env> {
  currentSlide = 0;
  currentActiveIndex = -1;
  tapTotal = 0;
  hoverTotal = 0;
  // Rolling window: interaction timestamps from the last 3 seconds. Ephemeral
  // (not persisted) — a 3s window is meaningless to restore after a wake.
  recentTaps: number[] = [];

  // Load durable state on cold start / after the DO wakes from eviction, so an
  // idle room doesn't snap everyone back to slide 0.
  async onStart() {
    const s = await this.ctx.storage.get<{
      slide: number;
      activeIndex: number;
      tapTotal: number;
      hoverTotal: number;
    }>("state");
    if (s) {
      this.currentSlide = s.slide ?? 0;
      this.currentActiveIndex = s.activeIndex ?? -1;
      this.tapTotal = s.tapTotal ?? 0;
      this.hoverTotal = s.hoverTotal ?? 0;
    }
  }

  // Persist durable state (fire-and-forget; storage writes are transactional).
  private save() {
    void this.ctx.storage.put("state", {
      slide: this.currentSlide,
      activeIndex: this.currentActiveIndex,
      tapTotal: this.tapTotal,
      hoverTotal: this.hoverTotal,
    });
  }

  onConnect(connection: Connection) {
    // Catch late joiners up to the current state.
    const init: InitMessage = {
      type: "init",
      slide: this.currentSlide,
      activeIndex: this.currentActiveIndex,
      tapTotal: this.tapTotal,
      hoverTotal: this.hoverTotal,
    };
    connection.send(JSON.stringify(init));
  }

  onMessage(_connection: Connection, message: string | ArrayBuffer) {
    const raw = typeof message === "string" ? message : "";
    const msg = JSON.parse(raw) as IncomingMessage;

    if (msg.type === "slide") {
      this.currentSlide = msg.slide;
      this.save();
      // Broadcast to all, including the sender.
      this.broadcast(JSON.stringify(msg));
    }

    if (msg.type === "activeIndex") {
      this.currentActiveIndex = msg.index;
      this.save();
      // Broadcast to all, including the sender.
      this.broadcast(JSON.stringify(msg));
    }

    if (msg.type === "reset") {
      this.tapTotal = 0;
      this.hoverTotal = 0;
      this.recentTaps = [];
      this.save();
      const aggregate: TapAggregateMessage = {
        type: "tap_aggregate",
        count: 0,
        total: 0,
        hoverTotal: 0,
      };
      this.broadcast(JSON.stringify(aggregate));
      return;
    }

    if (msg.type === "tap_batch") {
      const taps = Math.max(0, msg.taps | 0);
      const hovers = Math.max(0, msg.hovers | 0);
      this.tapTotal += taps;
      this.hoverTotal += hovers;
      this.save();

      const now = Date.now();
      const added = taps + hovers;
      for (let i = 0; i < added; i++) this.recentTaps.push(now);
      this.recentTaps = this.recentTaps.filter((t) => now - t < 3000);

      const aggregate: TapAggregateMessage = {
        type: "tap_aggregate",
        count: this.recentTaps.length,
        total: this.tapTotal,
        hoverTotal: this.hoverTotal,
      };
      this.broadcast(JSON.stringify(aggregate));
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
