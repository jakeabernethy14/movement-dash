"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ShieldCheck,
  Settings,
  Calendar,
  Target,
  LogOut,
  Menu,
  X,
  NotebookPen,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const session = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const clientLinks = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/schedule", label: "Schedule / Program", icon: Calendar },
    { href: "/dashboard/dailylog", label: "Daily Log", icon: NotebookPen },
    { href: "/dashboard/goals", label: "Goals", icon: Target },
    { href: "/dashboard/account", label: "Account", icon: UserCircle },
  ];

  const ownerLinks = [
    { href: "/dashboard/owner", label: "Owner", icon: ShieldCheck },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  let links = [...clientLinks];
  if (session.isTrainer || session.isOwner) {
    links = [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/clients", label: "Clients", icon: Users },
      { href: "/dashboard/programs", label: "Training Plans", icon: Dumbbell },
      { href: "/dashboard/admin", label: "PT Admin", icon: ShieldCheck },
      { href: "/dashboard/account", label: "Account", icon: UserCircle },
    ];
  }
  if (session.isOwner) links = [...links, ...ownerLinks];

  const initials = (session.profile?.full_name || session.profile?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 border-b flex items-center justify-between px-4 z-40" style={{background: "linear-gradient(180deg, #0d0d0d, #090909)", borderColor: "rgba(255,255,255,0.06)"}}>
        <span className="font-bold">
          The <span className="text-gold-400">Movement</span> Coaching
        </span>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:static z-30 top-14 md:top-0 bottom-0 w-64 border-r flex flex-col transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "linear-gradient(180deg, #0d0d0d, #070707)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="hidden md:block p-5 border-b border-base-border">
          <span className="font-bold text-lg">
            The <span className="text-gold-400">Movement</span> Coaching
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-base-border">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400 text-sm font-semibold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {session.profile?.full_name || "…"}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {session.roles.join(" · ") || "…"}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="nav-link w-full text-left">
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 pt-14 md:pt-0 min-h-screen bg-transparent">
        <div className="max-w-screen-2xl mx-auto p-4 md:p-10">{children}</div>
      </main>
    </div>
  );
}
