"use client";

import gsap from "gsap";

if (typeof window !== "undefined") {
  gsap.config({ force3D: "auto" });
}

export { gsap };
