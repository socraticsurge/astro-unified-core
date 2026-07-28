import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { AdminTables } from "./AdminTables";
import { Activity, Bot, MessageSquareText, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import styles from "./AdminPage.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!isAdmin(session)) {
    redirect("/");
  }

  const [users, profiles, feedback, compatibilityChecks, consultationRequests, appSettings, consultationSlots, aiInsightStats, chatUsageStats, aiInsightsLlm, chatLlm, draftLlm, todayReadingLlm] = await Promise.all([
    db.users.list(),
    db.profiles.listAllWithUser(),
    db.feedback.list(),
    db.compatibility.listAllWithDetails(),
    db.consultationRequests.listAllWithUser(),
    db.settings.getAll(),
    db.consultationSlots.listAll(),
    db.readings.aiInsightStats(),
    db.chatMessages.stats(),
    db.settings.getAiInsightsLlm(),
    db.settings.getChatLlm(),
    db.settings.getDraftLlm(),
    db.settings.getTodayReadingLlm(),
  ]);

  const openQuestions = consultationRequests.filter((request) => request.status !== "answered").length;
  const stats = [
    { label: "People", value: users.length, detail: `${profiles.length} saved profiles`, icon: UsersRound },
    { label: "Open questions", value: openQuestions, detail: "Awaiting attention", icon: MessageSquareText },
    { label: "Compatibility", value: compatibilityChecks.length, detail: "Recorded checks", icon: Activity },
    { label: "AI conversations", value: chatUsageStats.overview.total_user_messages, detail: "User messages", icon: Bot },
  ];

  return (
    <div className={styles.root}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroIcon}><ShieldCheck size={21} aria-hidden="true" /></span>
          <div>
            <p className={styles.eyebrow}>Astro Chaganti operations</p>
            <h1>Admin workspace</h1>
            <p>People, consultations, publishing, AI operations, and service settings in one calm control surface.</p>
          </div>
        </div>
        <div className={styles.owner}>
          <UserRound size={15} aria-hidden="true" />
          <span><strong>Administrator</strong>{session?.user?.email}</span>
        </div>
      </section>

      <section className={styles.stats} aria-label="Operational summary">
        {stats.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className={styles.stat}>
            <span className={styles.statIcon}><Icon size={16} aria-hidden="true" /></span>
            <div>
              <p>{label}</p>
              <strong>{value}</strong>
              <small>{detail}</small>
            </div>
          </article>
        ))}
      </section>

      <AdminTables
        users={users}
        profiles={profiles}
        feedback={feedback}
        compatibilityChecks={compatibilityChecks}
        consultationRequests={consultationRequests}
        consultationSlots={consultationSlots}
        appSettings={appSettings}
        aiInsightStats={aiInsightStats}
        chatUsageStats={chatUsageStats}
        llmSettings={{ ai_insights: aiInsightsLlm, chat: chatLlm, draft: draftLlm, today_reading: todayReadingLlm }}
        adminEmail={session?.user?.email ?? ""}
      />
    </div>
  );
}
