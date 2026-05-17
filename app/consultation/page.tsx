import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConsultationForm } from "./ConsultationForm";

export const dynamic = "force-dynamic";

export default async function ConsultationPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth/signin");

  const userName = (session?.user as { name?: string } | undefined)?.name ?? "";
  const userEmail = (session?.user as { email?: string } | undefined)?.email ?? "";

  const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const [allRequests, profiles, appSettings, allUpcomingSlots] = await Promise.all([
    db.consultationRequests.listByUser(userId),
    db.profiles.list(userId),
    db.settings.getAll(),
    db.consultationSlots.listUpcoming(),
  ]);

  const availableSlots = allUpcomingSlots.filter(s => s.starts_at > fiveDaysFromNow && !s.is_booked);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: 300, fontSize: "2.4rem", letterSpacing: "0.02em", lineHeight: 1.15, color: "rgba(255,255,255,0.92)" }}>
          Seek Counsel
        </h1>
      </div>
      <ConsultationForm
        allRequests={allRequests}
        profiles={profiles}
        writtenConsultationEnabled={appSettings.written_consultation_enabled}
        liveConsultationEnabled={appSettings.live_consultation_enabled}
        writtenFeePaise={appSettings.written_fee_paise}
        liveFeePaise={appSettings.live_fee_paise}
        availableSlots={availableSlots}
        userName={userName}
        userEmail={userEmail}
      />
    </div>
  );
}
