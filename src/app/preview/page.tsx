"use client";
import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import CoachDashboardView from "@/components/CoachDashboardView";
import ClientDashboardView from "@/components/ClientDashboardView";
import ClientRoster from "@/components/ClientRoster";
import { previewCoachData, previewClientData, previewClients } from "@/lib/preview-data";
import { toast } from "@/components/ui/Toast";
export default function PreviewPage() {
  const [view, setView] = useState<"coach" | "client" | "clients">("coach");
  const [coachData, setCoachData] = useState(previewCoachData);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const clients = previewClients();
  if (!mounted) return <div className="p-8 muted" aria-busy="true">Opening the design preview...</div>;
  return <DashboardShell demo staff={view !== "client"} name={view === "client" ? "Taylor Brooks" : "Alex Morgan"} clients={clients.map(c => ({ id: c.id, name: c.name }))} alerts={[{ id: "demo-alert-1", kind: "message", title: "2 clients have unread messages", detail: "Fictional preview notification. Nothing is connected to an account.", href: "/dashboard/messages" }, { id: "demo-alert-2", kind: "renewal", title: "2 renewals are coming up", detail: "Fictional preview notification.", href: "/dashboard/clients" }]}><div className="preview-tabs" role="group" aria-label="Preview screen"><button className={view === "coach" ? "selected" : ""} aria-pressed={view === "coach"} onClick={() => setView("coach")}>Coach dashboard</button><button className={view === "client" ? "selected" : ""} aria-pressed={view === "client"} onClick={() => setView("client")}>Client dashboard</button><button className={view === "clients" ? "selected" : ""} aria-pressed={view === "clients"} onClick={() => setView("clients")}>Client roster</button></div><div onClickCapture={e => {
    const target = (e.target as HTMLElement).closest("a");
    if (target?.getAttribute("href") === "/preview") { e.preventDefault(); e.stopPropagation(); toast("This is a design preview. Sign in to use the live coaching tools."); }
  }}>{view === "coach" ? <CoachDashboardView name="Alex Morgan" data={coachData} demo onDateChange={date => setCoachData(d => ({ ...d, selectedDate: date, dayEvents: date === previewCoachData().selectedDate ? previewCoachData().dayEvents : [] }))}/> : view === "client" ? <ClientDashboardView name="Taylor Brooks" data={previewClientData()} demo/> : <ClientRoster clients={clients} demo/>}</div></DashboardShell>;
}
