import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
function token(name: string): string {
  const color = css.match(
    new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"),
  )?.[1];
  assert.ok(color, `Color token ${name} must be defined`);
  return color;
}
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
for (const [foreground, background] of [
  ["text", "paper"],
  ["muted", "paper"],
  ["muted", "white"],
  ["muted", "soft"],
  ["white", "forest"],
  ["deep", "lime"],
  ["forest", "soft"],
]) {
  test(`readable normal text contrast: ${foreground} on ${background}`, () => {
    const colors = [
      luminance(token(foreground)),
      luminance(token(background)),
    ].sort((a, b) => b - a);
    const ratio = (colors[0] + 0.05) / (colors[1] + 0.05);
    assert.ok(
      ratio >= 4.5,
      `Contrast ${ratio.toFixed(2)} must be at least 4.5:1`,
    );
  });
}
