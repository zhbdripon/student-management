"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

const navItems = [
  {
    label: "Students",
    href: "/dashboard/students",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Fees & Payments",
    href: "/dashboard/fees",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    comingSoon: true,
  },
  {
    label: "Assessments",
    href: "/dashboard/assessments",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    comingSoon: true,
  },
  {
    label: "Marksheet",
    href: "/dashboard/marksheet",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    comingSoon: true,
  },
];

interface SidebarProps {
  userName: string;
  userEmail: string;
  role: string;
}

export function Sidebar({ userName, userEmail, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut({
      fetchOptions: { onSuccess: () => router.push("/sign-in") },
    });
  }

  const roleLabel = role === "owner" ? "Owner" : "Admin";

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
          <span className="text-xs font-bold text-white dark:text-zinc-900">SM</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Student Management
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Registry</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <div key={item.href}>
              {item.comingSoon ? (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600 cursor-not-allowed">
                  <span className="text-zinc-300 dark:text-zinc-700">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="ml-auto rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                    Soon
                  </span>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                  }`}
                >
                  <span className={isActive ? "opacity-90" : "opacity-60"}>{item.icon}</span>
                  {item.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {userName}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="inline-block rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
