import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/ProfileForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  
  const profile = await db.profiles.get(id, userId);
  
  if (!profile) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href={`/dashboard`} 
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-medium tracking-tight">Edit Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Editing details for {profile.name}. Note: changing birth data will regenerate the chart.
          </p>
        </div>
      </div>
      
      <ProfileForm initialData={profile} />
    </div>
  );
}
