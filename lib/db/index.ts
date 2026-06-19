export { ensureSchema } from "./client";
export type { User } from "./users";
export type { Profile, ProfileWithUser } from "./profiles";
export type { Reading } from "./readings";
export type { CompatibilityCheck, CompatibilityCheckWithDetails } from "./compatibility";
export type { Feedback } from "./feedback";
export type { AppSettings, AiInsightsLlmConfig, ChatLlmConfig, DraftLlmConfig, TodayReadingLlmConfig } from "./settings";
export type { ConsultationRequest, ConsultationRequestWithUser } from "./consultation-requests";
export type { ConsultationSlot } from "./consultation-slots";
export type { DailyLandingRow } from "./daily-landing";
export type { ChatMessageRecord } from "./chat-messages";

import { users } from "./users";
import { profiles } from "./profiles";
import { readings } from "./readings";
import { compatibility } from "./compatibility";
import { feedback } from "./feedback";
import { settings } from "./settings";
import { consultationRequests } from "./consultation-requests";
import { consultationSlots } from "./consultation-slots";
import { dailyLanding } from "./daily-landing";
import { chatMessages } from "./chat-messages";

export const db = { users, profiles, readings, compatibility, feedback, settings, consultationRequests, consultationSlots, dailyLanding, chatMessages };
