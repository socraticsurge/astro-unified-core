import { rateLimit } from "./lib/rate-limit";

console.log("Testing Rate Limiter...");
const userId = "test_user_123";

for (let i = 1; i <= 7; i++) {
  const result = rateLimit(`create_profile_${userId}`, 5, 60_000);
  console.log(`Request ${i}: success=${result.success}, remaining=${result.remaining}`);
}
