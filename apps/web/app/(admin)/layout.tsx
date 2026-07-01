import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

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
      <AdminSidebar email={email} initials={initials} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AdminHeader />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 28px 60px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
