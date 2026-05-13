import { queryVariants } from "./geocode";
import assert from "node:assert";

function testQueryVariants() {
  console.log("Running tests for queryVariants...");

  // Case 1: Simple string without comma
  console.log("Test Case 1: Simple string without comma");
  const res1 = queryVariants("Hyderabad");
  assert.deepStrictEqual(res1, ["Hyderabad", "Hyderabad, India"]);

  // Case 2: String with leading/trailing whitespace
  console.log("Test Case 2: String with leading/trailing whitespace");
  const res2 = queryVariants("  Mumbai  ");
  assert.deepStrictEqual(res2, ["Mumbai", "Mumbai, India"]);

  // Case 3: String with one comma
  console.log("Test Case 3: String with one comma");
  const res3 = queryVariants("Vishakhapatnam, AP");
  // Expected:
  // 1. "Vishakhapatnam, AP" (trimmed)
  // 2. "Vishakhapatnam" (first segment)
  // 3. "Vishakhapatnam, India" (first segment + India)
  // 4. "AP" (last segment)
  // 5. "Vishakhapatnam" (all but last) - Duplicate of 2
  assert.ok(res3.includes("Vishakhapatnam, AP"));
  assert.ok(res3.includes("Vishakhapatnam"));
  assert.ok(res3.includes("Vishakhapatnam, India"));
  assert.ok(res3.includes("AP"));
  assert.strictEqual(res3.length, 4);

  // Case 4: Multiple segments
  console.log("Test Case 4: Multiple segments");
  const res4 = queryVariants("Village, Mandal, District, State");
  // Expected variants include:
  // - "Village, Mandal, District, State"
  // - "Village"
  // - "Village, India"
  // - "State"
  // - "Village, Mandal, District"
  assert.ok(res4.includes("Village, Mandal, District, State"));
  assert.ok(res4.includes("Village"));
  assert.ok(res4.includes("Village, India"));
  assert.ok(res4.includes("State"));
  assert.ok(res4.includes("Village, Mandal, District"));

  // Case 5: Empty or whitespace only (though likely handled upstream)
  console.log("Test Case 5: Empty string");
  const res5 = queryVariants("");
  assert.deepStrictEqual(res5, ["", ", India"]);

  // Case 6: Single comma only
  console.log("Test Case 6: Single comma only");
  const res6 = queryVariants(",");
  // trimmed is ","
  // firstSegment is ""
  // lastSegment is ""
  // allButLast is ""
  assert.deepStrictEqual(res6, [","]);

  console.log("All tests for queryVariants passed!");
}

try {
  testQueryVariants();
} catch (error) {
  console.error("Tests failed!");
  console.error(error);
  process.exit(1);
}
