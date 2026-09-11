"use client";
import BackToTop from "@/components/BackToTop";
import TimezoneClock from "@/components/TimezoneClock";
import Avatar from "@/components/Avatar";
import LockedAccountScreen from "@/components/LockedAccountScreen";
import Footer from "@/components/Footer";
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
  MessageCircle,
  ClipboardList,
  Salad,
  Globe,
  Trophy,
  TrendingUp,
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
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
    { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
    { href: "/dashboard/schedule", label: "Schedule / Program", icon: NotebookPen },
    { href: "/dashboard/dailylog", label: "Daily Log", icon: NotebookPen },
    { href: "/dashboard/nutrition", label: "Nutrition Plan", icon: Salad },
    { href: "/dashboard/pbs", label: "PBs", icon: Trophy },
    { href: "/dashboard/goals", label: "Goals", icon: Target },
    { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
    { href: "/dashboard/public-plans", label: "Public Training Plans", icon: Globe },
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
      { href: "/dashboard/checkins", label: "Daily Check-ins", icon: ClipboardList },
      { href: "/dashboard/progress/pt", label: "Client Progress", icon: TrendingUp },
      { href: "/dashboard/pbs/pt", label: "PBs", icon: Trophy },
      { href: "/dashboard/sessions", label: "Sessions & Classes", icon: Calendar },
      { href: "/dashboard/programs", label: "Training Plans", icon: Dumbbell },
      { href: "/dashboard/public-plans", label: "Public Training Plans", icon: Globe },
      { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
      { href: "/dashboard/admin", label: "PT Admin", icon: ShieldCheck },
      { href: "/dashboard/account", label: "Account", icon: UserCircle },
    ];
  }
  if (session.isOwner) links = [...links, ...ownerLinks];

  const isExpired =
    !session.loading &&
    session.profile?.access_expires_at &&
    new Date(session.profile.access_expires_at) < new Date();

  if (isExpired && session.userId && session.profile) {
    return (
      <LockedAccountScreen
        userId={session.userId}
        fullName={session.profile.full_name}
        email={session.profile.email}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="md:hidden fixed top-0 inset-x-0 h-16 border-b border-white/[0.08] bg-[#0b1714]/95 backdrop-blur-xl flex items-center justify-between px-4 z-40">
        <span className="font-semibold tracking-tight text-[#edf5ed]">
          The <span className="text-[#a8d5b5]">Movement</span>
        </span>
        <button aria-label="Toggle navigation" className="rounded-xl p-2 text-[#a8d5b5] hover:bg-white/[0.06]" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <aside
        className={`fixed z-30 top-16 md:top-0 bottom-0 w-[17.5rem] border-r border-white/[0.08] bg-[#0a1714]/95 backdrop-blur-xl flex flex-col transition-transform md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="hidden md:block px-6 py-7 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#79c89a]/30 bg-[#79c89a]/10 text-lg font-bold text-[#c7efd0]">M</div>
            <div>
              <span className="block text-[15px] font-semibold tracking-tight text-[#edf5ed]">The Movement</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#79c89a]">Coaching studio</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#567166]">Workspace</p>
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={`nav-link ${active ? "nav-link-active" : ""}`}>
                <Icon size={17} strokeWidth={1.8} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.08] space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.035] px-3 py-3">
            <Avatar url={session.profile?.avatar_url} name={session.profile?.full_name} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-[#edf5ed]">{session.profile?.full_name || "…"}</p>
              <p className="text-xs text-[#739084] truncate">{session.roles.join(" · ") || "…"}</p>
            </div>
          </div>
          <div className="px-2"><TimezoneClock timezone={session.profile?.timezone || "UTC"} /></div>
          <button onClick={handleLogout} className="nav-link w-full text-left"><LogOut size={17} />Sign out</button>
        </div>
      </aside>

      <main className="md:ml-[17.5rem] pt-16 md:pt-0 pb-24">
        <div className="max-w-screen-2xl mx-auto p-4 md:p-10">{children}</div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
