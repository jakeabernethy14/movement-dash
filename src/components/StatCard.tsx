import { type LucideIcon, ArrowUpRight } from "lucide-react";
import Link from "next/link";
export default function StatCard({ label, value, icon: Icon, sub, href }: { label: string; value: string | number; icon: LucideIcon; sub?: string; href?: string }) {
  return <div className="kpi-card"><div className="kpi-top"><span className="kpi-label">{label}</span><span className="kpi-icon"><Icon size={15} strokeWidth={1.6}/></span></div><strong className="kpi-value">{value}</strong>{sub && <div className="kpi-bottom">{href ? <Link href={href}>{sub}<ArrowUpRight size={11}/></Link> : sub}</div>}</div>;
}
