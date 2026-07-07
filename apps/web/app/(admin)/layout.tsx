import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminMobileBar } from "@/components/admin/AdminMobileBar";
import { AdminMobileTabBar } from "@/components/admin/AdminMobileTabBar";

export const metadata = {
  title: "FitHub Admin",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ADMIN_USER_IDS is set in Vercel env vars (production) or .env.local (dev).
  // The backend also reads ADMIN_USER_IDS_CSV from its own env — see apps/api/app/config.py.
  // Both must be kept in sync when adding or removing admins.
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!adminIds.includes(user.id)) redirect("/");

  const email = user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#0d1117",
        color: "#e6edf3",
        fontFamily: "var(--font-jetbrains-mono), monospace",
      }}
    >
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <AdminSidebar email={email} initials={initials} />
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mobile header — shown on mobile, hidden on desktop */}
        <div className="md:hidden">
          <AdminMobileBar />
        </div>

        {/* Desktop header — hidden on mobile */}
        <div className="hidden md:block">
          <AdminHeader />
        </div>

        <main
          className="admin-main"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 28px 60px",
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — fixed position, hidden on desktop */}
      <div className="md:hidden">
        <AdminMobileTabBar />
      </div>
    </div>
  );
}
