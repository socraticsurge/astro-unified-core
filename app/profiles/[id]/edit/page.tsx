import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/ProfileForm";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId = getUserId(session);
  const { id } = await params;
  
  const profile = await db.profiles.get(id, userId);
  
  if (!profile) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        back={`/profiles/${id}`}
        title="Edit Profile"
        subtitle={profile.name}
      />

      <ProfileForm initialData={profile} />
    </div>
  );
}
