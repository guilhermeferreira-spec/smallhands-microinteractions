import { routePartykitRequest, Server, type Connection } from "partyserver";

export interface SlideMessage {
  type: "slide";
  slide: number;
}

export type InteractionKind = "tap" | "hover";

export interface TapMessage {
  type: "tap";
  clientId: string;
  kind?: InteractionKind;
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
  tapTotal: number;
  hoverTotal: number;
}

type IncomingMessage = SlideMessage | TapMessage;

interface Env {
  SmallHandsParty: DurableObjectNamespace<SmallHandsParty>;
}

// One Durable Object instance per room. Holds the current slide and tap
// totals in memory and broadcasts changes to every connected client.
export class SmallHandsParty extends Server<Env> {
  currentSlide = 0;
  tapTotal = 0;
  hoverTotal = 0;
  // Rolling window: interaction timestamps from the last 3 seconds.
  recentTaps: number[] = [];

  onConnect(connection: Connection) {
    // Catch late joiners up to the current state.
    const init: InitMessage = {
      type: "init",
      slide: this.currentSlide,
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
      // Broadcast to all, including the sender.
      this.broadcast(JSON.stringify(msg));
    }

    if (msg.type === "tap") {
      if (msg.kind === "hover") {
        this.hoverTotal += 1;
      } else {
        this.tapTotal += 1;
      }
      const now = Date.now();
      this.recentTaps.push(now);
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
