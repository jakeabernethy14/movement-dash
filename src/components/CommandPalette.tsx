"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, UserRound } from "lucide-react";
import Modal from "./ui/Modal";
import { NavItem } from "@/lib/navigation";
export interface SearchClient { id: string; name: string }
export default function CommandPalette({ links, clients = [], onClose, demo = false }: { links: NavItem[]; clients?: SearchClient[]; onClose: () => void; demo?: boolean }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const q = query.trim().toLowerCase();
  const results = [
    ...links.filter(l => `${l.label} ${l.keywords ?? ""}`.toLowerCase().includes(q)).map(l => ({ ...l, category: l.group })),
    ...(q ? clients.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8).map(c => ({ href: `/dashboard/clients/${c.id}`, label: c.name, icon: UserRound, category: "Clients" })) : []),
  ];
  return <Modal title="Go anywhere" onClose={onClose}><div className="command-search"><Search size={20}/><input data-autofocus aria-label="Search pages and clients" placeholder="Search pages, actions or clients..." value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, Math.min(results.length - 1, a + (e.key === "ArrowDown" ? 1 : -1)))); }
    if (e.key === "Enter") { e.preventDefault(); document.getElementById(`command-${active}`)?.click(); }
  }}/><kbd>esc</kbd></div><div className="command-results">{!results.length && <p className="empty-state">No matches. Try "plans", "messages" or a client's name.</p>}{results.map((r, i) => <Link id={`command-${i}`} key={r.href} href={demo ? "/preview" : r.href} onClick={onClose} onMouseEnter={() => setActive(i)} className={`command-result ${active === i ? "selected" : ""}`}><r.icon size={18}/><span>{r.label}<small>{r.category}</small></span><ArrowUpRight size={16}/></Link>)}</div><div className="command-footer">Search your workspace <span>Arrow keys to navigate &middot; Enter to open</span></div></Modal>;
}
