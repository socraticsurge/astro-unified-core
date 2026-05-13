import test from "node:test";
import assert from "node:assert";
import { computeTithi } from "./tarabalam.ts";

test("computeTithi - exact conjunction (0 gap)", () => {
  // Amavasya (tithi 30)
  const result = computeTithi(0, 0);
  assert.strictEqual(result.number, 30);
  assert.strictEqual(result.name, "Amavasya");
  assert.strictEqual(result.paksha, null);
  assert.strictEqual(result.label, "Amavasya");
});

test("computeTithi - tiny gap > 0 (e.g. 0.1 degree) -> Shukla Pratipada", () => {
  const result = computeTithi(0.1, 0);
  assert.strictEqual(result.number, 1);
  assert.strictEqual(result.name, "Pratipada");
  assert.strictEqual(result.paksha, "Shukla");
  assert.strictEqual(result.label, "S·Pratipada");
});

test("computeTithi - exact 12 degree gap -> Shukla Pratipada", () => {
  const result = computeTithi(12, 0);
  assert.strictEqual(result.number, 1);
  assert.strictEqual(result.name, "Pratipada");
});

test("computeTithi - slightly more than 12 degree gap -> Shukla Dwitiya", () => {
  const result = computeTithi(12.1, 0);
  assert.strictEqual(result.number, 2);
  assert.strictEqual(result.name, "Dwitiya");
});

test("computeTithi - exact 180 degree gap -> Purnima", () => {
  // 180 / 12 = 15
  const result = computeTithi(180, 0);
  assert.strictEqual(result.number, 15);
  assert.strictEqual(result.name, "Purnima");
  assert.strictEqual(result.paksha, null);
  assert.strictEqual(result.label, "Purnima");
});

test("computeTithi - slightly more than 180 degree gap -> Krishna Pratipada", () => {
  const result = computeTithi(180.1, 0);
  assert.strictEqual(result.number, 16);
  assert.strictEqual(result.name, "Pratipada");
  assert.strictEqual(result.paksha, "Krishna");
  assert.strictEqual(result.label, "K·Pratipada");
});

test("computeTithi - exact 360 degree gap (should behave like 0) -> Amavasya", () => {
  const result = computeTithi(360, 0);
  assert.strictEqual(result.number, 30);
  assert.strictEqual(result.name, "Amavasya");
});

test("computeTithi - gap close to 360 (e.g. 359.9) -> Krishna Amavasya (tithi 30)", () => {
  const result = computeTithi(359.9, 0);
  assert.strictEqual(result.number, 30);
  assert.strictEqual(result.name, "Amavasya");
  assert.strictEqual(result.paksha, null);
});

test("computeTithi - negative wrapping", () => {
  // If Moon is 10° and Sun is 20°, gap = -10° -> 350°
  // 350 / 12 = 29.16 -> ceil -> 30 (Amavasya)
  const result = computeTithi(10, 20);
  assert.strictEqual(result.number, 30);
});

test("computeTithi - large angles wrapping", () => {
  const result = computeTithi(720, 360);
  assert.strictEqual(result.number, 30);
});
