import { routePartykitRequest, Server, type Connection } from "partyserver";

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

interface Env {
  SmallHandsParty: DurableObjectNamespace<SmallHandsParty>;
}

// One Durable Object instance per room. Holds the current slide and tap
// totals in memory and broadcasts changes to every connected client.
export class SmallHandsParty extends Server<Env> {
  currentSlide = 0;
  tapTotal = 0;
  // Rolling window: tap timestamps from the last 3 seconds.
  recentTaps: number[] = [];

  onConnect(connection: Connection) {
    // Catch late joiners up to the current state.
    const init: InitMessage = {
      type: "init",
      slide: this.currentSlide,
      tapTotal: this.tapTotal,
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
      this.tapTotal += 1;
      const now = Date.now();
      this.recentTaps.push(now);
      this.recentTaps = this.recentTaps.filter((t) => now - t < 3000);

      const aggregate: TapAggregateMessage = {
        type: "tap_aggregate",
        count: this.recentTaps.length,
        total: this.tapTotal,
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
