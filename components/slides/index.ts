import type { SlideComponent } from "./types";
import Slide00Title from "./Slide00Title";
import Slide01Hook from "./Slide01Hook";
import Slide02WhatIs from "./Slide02WhatIs";
import Slide03Spring from "./Slide03Spring";
import Slide06Whiplash from "./Slide06Whiplash";
import Slide04Feedback from "./Slide04Feedback";
import Slide07Yokoi from "./Slide07Yokoi";
import Slide08Inclusive from "./Slide08Inclusive";
import Slide09AIAside from "./Slide09AIAside";
import Slide05End from "./Slide05End";

// Order matches the presentation beat sheet:
// 1 Hero  2 Hook  3 What it is  4 Salt  5 Robinhood  6 Hidden=bad
// 7 Yokoi  8 Inclusive  9 AI aside  10 Close
export const SLIDES: SlideComponent[] = [
  Slide00Title,
  Slide01Hook,
  Slide02WhatIs,
  Slide03Spring,
  Slide06Whiplash,
  Slide04Feedback,
  Slide07Yokoi,
  Slide08Inclusive,
  Slide09AIAside,
  Slide05End,
];

export type { SlideComponent };
