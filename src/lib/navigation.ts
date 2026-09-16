import { LayoutDashboard, Users, Dumbbell, ShieldCheck, Settings, CalendarDays, Target, NotebookPen, UserRound, MessageCircle, ClipboardCheck, Salad, Globe2, Trophy, TrendingUp, type LucideIcon } from "lucide-react";
export interface NavItem { href: string; label: string; icon: LucideIcon; group: string; keywords?: string }
export function getNavigation(staff: boolean, owner: boolean): NavItem[] {
  const list: NavItem[] = staff ? [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Workspace" },
    { href: "/dashboard/clients", label: "My clients", icon: Users, group: "Workspace", keywords: "roster customers" },
    { href: "/dashboard/messages", label: "Messages", icon: MessageCircle, group: "Workspace", keywords: "chat inbox" },
    { href: "/dashboard/sessions", label: "Sessions & classes", icon: CalendarDays, group: "Workspace", keywords: "calendar schedule call" },
    { href: "/dashboard/programs", label: "Training plans", icon: Dumbbell, group: "Coaching", keywords: "program workouts exercises" },
    { href: "/dashboard/checkins", label: "Daily check-ins", icon: ClipboardCheck, group: "Coaching", keywords: "log nutrition" },
    { href: "/dashboard/progress/pt", label: "Client progress", icon: TrendingUp, group: "Coaching" },
    { href: "/dashboard/pbs/pt", label: "Personal bests", icon: Trophy, group: "Coaching", keywords: "pb pr strength" },
    { href: "/dashboard/public-plans", label: "Plan library", icon: Globe2, group: "Coaching", keywords: "public training" },
    { href: "/dashboard/admin", label: "PT admin", icon: ShieldCheck, group: "Management", keywords: "invite token access renewal" },
  ] : [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Your space" },
    { href: "/dashboard/schedule", label: "My programme", icon: Dumbbell, group: "Your space", keywords: "workout training schedule" },
    { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays, group: "Your space" },
    { href: "/dashboard/messages", label: "Messages", icon: MessageCircle, group: "Your space", keywords: "chat trainer coach" },
    { href: "/dashboard/dailylog", label: "Daily log", icon: NotebookPen, group: "Your progress", keywords: "check-in weight mood" },
    { href: "/dashboard/progress", label: "My progress", icon: TrendingUp, group: "Your progress" },
    { href: "/dashboard/nutrition", label: "Nutrition plan", icon: Salad, group: "Your progress", keywords: "calories protein macros" },
    { href: "/dashboard/goals", label: "Goals", icon: Target, group: "Your progress" },
    { href: "/dashboard/pbs", label: "Personal bests", icon: Trophy, group: "Your progress", keywords: "pb pr" },
    { href: "/dashboard/public-plans", label: "Plan library", icon: Globe2, group: "Explore", keywords: "public" },
  ];
  if (owner) list.push({ href: "/dashboard/owner", label: "Owner dashboard", icon: ShieldCheck, group: "Management" }, { href: "/dashboard/settings", label: "Studio settings", icon: Settings, group: "Management" });
  list.push({ href: "/dashboard/account", label: "My account", icon: UserRound, group: staff ? "Management" : "Explore", keywords: "profile password timezone avatar" });
  return list;
}
