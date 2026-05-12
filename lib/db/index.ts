export { ensureSchema } from "./client";
export type { User } from "./users";
export type { Profile, ProfileWithUser } from "./profiles";
export type { Reading } from "./readings";
export type { CompatibilityCheck, CompatibilityCheckWithDetails } from "./compatibility";
export type { Feedback } from "./feedback";

import { users } from "./users";
import { profiles } from "./profiles";
import { readings } from "./readings";
import { compatibility } from "./compatibility";
import { feedback } from "./feedback";

export const db = { users, profiles, readings, compatibility, feedback };
