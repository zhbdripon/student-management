import { requireAdminOrOwnerPage } from "@/lib/auth-utils";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, member } = await requireAdminOrOwnerPage();

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        userName={session.user.name}
        userEmail={session.user.email}
        role={member.role}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
