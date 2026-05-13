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

  const [pending, profiles, appSettings] = await Promise.all([
    db.consultationRequests.getPending(userId),
    db.profiles.list(userId),
    db.settings.getAll(),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ask a Question</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a structured question and receive a personalised Vedic astrology answer.
        </p>
      </div>
      <ConsultationForm
        pending={pending ?? null}
        profiles={profiles}
        liveConsultationEnabled={appSettings.live_consultation_enabled}
      />
    </div>
  );
}
