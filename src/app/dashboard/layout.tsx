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

  // Lockout gate: an account whose access has expired can still sign in, but sees
  // only a renewal screen until they redeem a fresh token (or log out).
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
      {/* Mobile top bar -- fixed */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 border-b flex items-center justify-between px-4 z-40" style={{background: "linear-gradient(180deg, #0d0d0d, #090909)", borderColor: "rgba(255,255,255,0.06)"}}>
        <span className="font-bold">
          The <span className="text-gold-400">Movement</span> Coaching
        </span>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar -- always fixed to the viewport, on both mobile and desktop, so it
          never moves as the page scrolls and never leaves a background gap. */}
      <aside
        className={`fixed z-30 top-14 md:top-0 bottom-0 w-64 border-r flex flex-col transition-transform md:translate-x-0 ${
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

        <div className="p-3 border-t border-base-border space-y-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar url={session.profile?.avatar_url} name={session.profile?.full_name} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {session.profile?.full_name || "…"}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {session.roles.join(" · ") || "…"}
              </p>
            </div>
          </div>
          <div className="px-2">
            <TimezoneClock timezone={session.profile?.timezone || "UTC"} />
          </div>
          <button onClick={handleLogout} className="nav-link w-full text-left">
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content -- offset past the fixed sidebar, with bottom padding that
          reserves room for the fixed footer (this is also the gap you asked for
          between the last card and the footer). */}
      <main className="md:ml-64 pt-14 md:pt-0 pb-24">
        <div className="max-w-screen-2xl mx-auto p-4 md:p-10">{children}</div>
      </main>

      {/* Footer -- always pinned to the very bottom of the viewport */}
      <Footer />
      <BackToTop />
    </div>
  );
}
