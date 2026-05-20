import { redirect } from "next/navigation";

// Profile creation now happens inline in the dashboard sidebar
// (DashboardClient + ProfileSidebarCreate). This route is kept so existing
// bookmarks and external links continue to work.
export default function NewProfilePage() {
  redirect("/dashboard?create=1");
}
