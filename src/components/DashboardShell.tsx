"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, ChevronRight, ChevronsUpDown, Menu, LogOut, ArrowUpRight, Timer, Plus, Sparkles, CircleHelp } from "lucide-react";
import Brand from "./ui/Brand";
import Avatar from "./Avatar";
import Modal from "./ui/Modal";
import ToastHost from "./ui/Toast";
import RestTimer from "./RestTimer";
import CommandPalette, { type SearchClient } from "./CommandPalette";
import { getNavigation } from "@/lib/navigation";
import TimezoneClock from "./TimezoneClock";
import BackToTop from "./BackToTop";
export interface WorkspaceAlert { id: string; title: string; detail: string; href: string; kind: "message" | "session" | "renewal" }
export default function DashboardShell({ children, name, avatarUrl, timezone = "Pacific/Auckland", staff, owner = false, onLogout, clients = [], alerts = [], alertsLoading = false, alertsError = false, onRefreshAlerts, demo = false }: { children: ReactNode; name: string; avatarUrl?: string | null; timezone?: string; staff: boolean; owner?: boolean; onLogout?: () => void; clients?: SearchClient[]; alerts?: WorkspaceAlert[]; alertsLoading?: boolean; alertsError?: boolean; onRefreshAlerts?: () => void; demo?: boolean }) {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [timer, setTimer] = useState(false);
  const [help, setHelp] = useState(false);
  const links = getNavigation(staff, owner);
  const current = [...links].reverse().find(l => l.href === pathname || (l.href !== "/dashboard" && pathname.startsWith(l.href + "/")));
  const destination = (href: string) => demo ? "/preview" : href;
  useEffect(() => { setMobile(false); setSearch(false); setNotifications(false); }, [pathname]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(s => !s); setMobile(false); setNotifications(false); setHelp(false); setTimer(false); } };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  const navigation = <nav className="workspace-nav" aria-label="Main navigation">{links.map((link, i) => <div key={link.href}>{(i === 0 || links[i - 1].group !== link.group) && <p className="nav-group-label">{link.group}</p>}<Link href={destination(link.href)} onClick={() => setMobile(false)} aria-current={(demo ? link.href === "/dashboard" : current?.href === link.href) ? "page" : undefined} className={`nav-link ${(demo ? link.href === "/dashboard" : current?.href === link.href) ? "nav-link-active" : ""}`}><link.icon size={18} strokeWidth={1.7}/><span>{link.label}</span>{link.href === "/dashboard/messages" && alerts.some(a => a.kind === "message") && <span className="nav-unread" aria-label="Unread messages"/>}{link.href === "/dashboard" && <ChevronRight size={14} className="nav-end"/>}</Link></div>)}</nav>;
  return <div className="workspace">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="workspace-sidebar"><div className="sidebar-brand"><Brand href={destination("/dashboard")}/></div><div className="workspace-switch"><span className="studio-icon">M</span><div><strong>Movement studio</strong><small>{demo ? "Design preview" : owner ? "Owner workspace" : staff ? "Coach workspace" : "Member workspace"}</small></div><ChevronsUpDown size={14}/></div>{navigation}<div className="sidebar-bottom"><button className="sidebar-help" onClick={() => setHelp(true)}><CircleHelp size={16}/> Your workspace guide <ArrowUpRight size={14}/></button><div className="sidebar-profile"><Link href={destination("/dashboard/account")} className="profile-link"><Avatar url={avatarUrl} name={name} size={36}/><span><strong>{name}</strong><small>{owner ? "Owner & coach" : staff ? "Personal trainer" : "Member"}</small></span></Link>{onLogout && <button className="icon-button" onClick={onLogout} aria-label="Sign out"><LogOut size={16}/></button>}</div><TimezoneClock timezone={timezone}/></div></aside>
    <div className="workspace-main"><header className="workspace-topbar"><div className="topbar-location"><button className="icon-button mobile-menu" onClick={() => setMobile(true)} aria-label="Open navigation" aria-expanded={mobile}><Menu size={20}/></button><span className="breadcrumb-root">Workspace</span><ChevronRight size={13}/><strong>{current?.label ?? "Overview"}</strong>{demo && <span className="demo-pill">SAMPLE DATA</span>}</div><div className="topbar-actions"><button className="topbar-search" onClick={() => setSearch(true)} aria-label="Search workspace"><Search size={16}/><span>Search anything...</span><kbd>Ctrl K</kbd></button><button className="icon-button" onClick={() => setTimer(true)} aria-label="Open rest timer" title="Rest timer"><Timer size={19}/></button><button className={`icon-button notification-button ${alerts.length ? "has-unread" : ""}`} onClick={() => { setNotifications(true); onRefreshAlerts?.(); }} aria-label={`Notifications${alerts.length ? `, ${alerts.length} updates` : ""}`}><Bell size={19}/></button><span className="topbar-divider"/><Link href={destination("/dashboard/account")} aria-label="Open my account"><Avatar url={avatarUrl} name={name} size={32}/></Link></div></header>
    <main id="main-content" className="workspace-content" tabIndex={-1}>{demo && <div className="preview-notice"><Sparkles size={15}/><span>Interactive design preview. All names and numbers are fictional; no account or database is connected.</span><Link href="/">View sign-in <ArrowUpRight size={13}/></Link></div>}{children}</main><footer className="workspace-footer"><span>&copy; {new Date().getFullYear()} The Movement Coaching</span><span>Better every day.<span className="footer-dot"/></span></footer></div>
    {mobile && <Modal title="Your workspace" onClose={() => setMobile(false)}>{navigation}{onLogout && <button className="btn-secondary w-full mt-3" onClick={onLogout}><LogOut size={16}/>Sign out</button>}</Modal>}
    {search && <CommandPalette links={links} clients={clients} onClose={() => setSearch(false)} demo={demo}/>}
    {notifications && <Modal title="Your notifications" onClose={() => setNotifications(false)}>{alertsLoading ? <p className="empty-state">Checking your workspace...</p> : alertsError ? <p className="empty-state">Could not refresh notifications. Reopen this panel after checking your connection.</p> : !alerts.length ? <div className="empty-state"><Bell size={28}/><h3>All caught up</h3><p>Unread messages, today's sessions and access reminders appear here.</p></div> : <div className="notifications-list">{alerts.map(a => <Link href={destination(a.href)} key={a.id} className="notification-item" onClick={() => setNotifications(false)}><span className="notification-symbol">{a.kind === "message" ? <Bell size={18}/> : a.kind === "renewal" ? <Sparkles size={18}/> : <Timer size={18}/>}</span><span><strong>{a.title}</strong><small>{a.detail}</small></span><ChevronRight size={16}/></Link>)}</div>}<p className="modal-footnote">Refreshed when you open this panel, visit a page or return to this window. Messages are marked read in your conversation.</p></Modal>}
    {help && <Modal title="Make the most of your workspace" onClose={() => setHelp(false)}><div className="workspace-guide"><div><Search size={21}/><h3>Less clicking, more coaching</h3><p>Press Ctrl+K (or Command+K on Mac) to jump to a page{staff ? " or find a client by name" : ""}.</p></div><div><Bell size={21}/><h3>Know what needs your attention</h3><p>The bell brings together unread messages, today's sessions and upcoming account renewals.</p></div><div><Timer size={21}/><h3>Keep your training on track</h3><p>Open the rest timer from the top bar. It keeps counting while you move between dashboard pages.</p></div><Link className="btn-primary" href={destination(staff ? "/dashboard/admin" : "/dashboard/dailylog")} onClick={() => setHelp(false)}><Plus size={16}/>{staff ? "Invite your next client" : "Log your day"}</Link></div></Modal>}
    <RestTimer open={timer} onClose={() => setTimer(false)}/><ToastHost/><BackToTop/>
  </div>;
}
