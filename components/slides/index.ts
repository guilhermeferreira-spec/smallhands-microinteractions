import type { SlideComponent } from "./types";
import JamShelf from "./JamShelf";
import Slide01Hook from "./Slide01Hook";
import Slide02WhatIs from "./Slide02WhatIs";
import Slide03Spring from "./Slide03Spring";
import Slide10Escalation from "./Slide10Escalation";
import Slide06Whiplash from "./Slide06Whiplash";
import Slide09AIAside from "./Slide09AIAside";
import Slide08Inclusive from "./Slide08Inclusive";
import Slide07Yokoi from "./Slide07Yokoi";
import Slide05End from "./Slide05End";

// Order matches the presentation beat sheet:
// 1 Jam shelf (hero)  2 Hook  3 What it is  4 Salt
// 5 Escalation (opens as the hidden swipe-to-delete, then dials up ceremony)
// 6 Robinhood  7 AI aside  8 Accessibility  9 Yokoi  10 Close
// Slide02WhatIs is special-cased by index (SLIDE02_INDEX in app/page.tsx and
// app/present/page.tsx) — update both if you insert before it.
export const SLIDES: SlideComponent[] = [
  JamShelf,
  Slide01Hook,
  Slide02WhatIs,
  Slide03Spring,
  Slide10Escalation,
  Slide06Whiplash,
  Slide09AIAside,
  Slide08Inclusive,
  Slide07Yokoi,
  Slide05End,
];

export type { SlideComponent };
