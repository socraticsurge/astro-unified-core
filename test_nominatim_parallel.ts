import { queryVariants } from "./lib/geocode";

async function nominatimQuery(query: string, limit = 3) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=0`;
  const res = await fetch(url, { headers: { "User-Agent": "AstroChaganti/1.0" } });
  console.log(`Query ${query} returned ${res.status}`);
  return await res.json();
}

async function testParallel() {
  const variants = queryVariants("Vishakhapatnam, AP");
  console.log("Variants:", variants);
  const promises = variants.map(q => nominatimQuery(q));
  await Promise.all(promises);
}

testParallel();
