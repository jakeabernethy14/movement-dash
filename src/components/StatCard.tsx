import { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between">
        <span className="text-neutral-400 text-sm">{label}</span>
        <Icon size={18} className="text-gold-400" />
      </div>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs text-neutral-500">{sub}</span>}
    </div>
  );
}
