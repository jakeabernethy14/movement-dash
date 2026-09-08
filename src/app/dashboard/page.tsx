"use client";
import { useSession } from "@/lib/useSession";
import TrainerOverview from "@/components/TrainerOverview";
import ClientOverview from "@/components/ClientOverview";

export default function DashboardHome() {
  const session = useSession();

  if (session.loading) {
    return <p className="text-neutral-500">Loading…</p>;
  }

  if (!session.userId) {
    return <p className="text-neutral-500">Not signed in.</p>;
  }

  const isStaff = session.isTrainer || session.isOwner;

  return isStaff ? (
    <TrainerOverview userId={session.userId} />
  ) : (
    <ClientOverview userId={session.userId} />
  );
}
