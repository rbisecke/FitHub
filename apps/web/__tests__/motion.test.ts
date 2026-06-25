import { describe, it, expect } from "vitest";
import { fadeUpProps, MOTION } from "@/lib/motion";

describe("fadeUpProps (shared motion signature)", () => {
  it("uses the fade-up entrance + base duration when motion is allowed", () => {
    const props = fadeUpProps(false, 0.12);
    expect(props.initial).toEqual(MOTION.fadeUp.initial);
    expect(props.animate).toEqual(MOTION.fadeUp.animate);
    expect(props.transition).toEqual({
      duration: MOTION.durBase,
      ease: "easeOut",
      delay: 0.12,
    });
  });

  it("disables the entrance offset under prefers-reduced-motion", () => {
    expect(fadeUpProps(true).initial).toBe(false);
  });
});
