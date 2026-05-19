import { ProfileForm } from "@/components/ProfileForm";
import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";

export default async function NewProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userId = getUserId(session);
  const profiles = await db.profiles.list(userId);

  if (profiles.length >= 10) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-6">
        <h1 className="text-2xl font-bold">Profile Limit Reached</h1>
        <p className="text-muted-foreground leading-relaxed">
          You have reached the maximum limit of 10 saved profiles. To create a new profile, please delete an existing one from your dashboard first.
        </p>
        <Link href="/dashboard">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader back="/dashboard" title="New Birth Profile" />
      <ProfileForm />
    </div>
  );
}
