import { geocodePlace, queryVariants } from "./lib/geocode";

async function run() {
  const start = Date.now();
  try {
    const res = await geocodePlace("Village, Mandal, District, State");
    // console.log("Result:", res);
  } catch (e) {
  }
  const end = Date.now();
  console.log(`Took ${end - start}ms`);
}

run();
