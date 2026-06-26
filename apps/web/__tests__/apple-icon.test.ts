import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Next App Router auto-wires app/apple-icon.png into <link rel="apple-touch-icon">.
// Apple touch icons must be a 180x180 raster with NO transparency (iOS fills
// transparent pixels black and applies its own rounded-corner mask).
describe("apple-icon.png", () => {
  const buf = readFileSync(path.resolve(__dirname, "../app/apple-icon.png"));

  it("is a valid PNG", () => {
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("is 180x180 (the Apple touch icon size)", () => {
    // IHDR width/height are big-endian uint32 at byte offsets 16 and 20.
    expect(buf.readUInt32BE(16)).toBe(180);
    expect(buf.readUInt32BE(20)).toBe(180);
  });

  it("is opaque — colour type 2 (RGB), not 6 (RGBA)", () => {
    // IHDR colour-type byte is at offset 25; 2 = truecolour without alpha.
    expect(buf.readUInt8(25)).toBe(2);
  });
});
