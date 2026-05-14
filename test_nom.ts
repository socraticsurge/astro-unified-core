import { queryVariants } from "./lib/geocode";
async function nominatimQuery(query: string, limit = 3) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=0`;
  const res = await fetch(url, { headers: { "User-Agent": "AstroChaganti/1.0" } });
  return await res.json();
}
async function run() {
  console.log(await nominatimQuery("Vishakhapatnam"));
}
run();
