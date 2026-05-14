import { geocodePlace } from "./lib/geocode";

async function run() {
  const start = Date.now();
  try {
    // A query that requires falling back to later variants
    const res = await geocodePlace("SomeFakeVillage, Vishakhapatnam");
    console.log("Result:", res);
  } catch (e) {
    console.log("Error:", e);
  }
  const end = Date.now();
  console.log(`Took ${end - start}ms`);
}

run();
