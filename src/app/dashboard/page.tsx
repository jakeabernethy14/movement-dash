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

  return (
    <div>
      {session.profile?.access_expires_at && (
        <div className="flex justify-end mb-4">
          <span className="badge badge-gold">
            Membership expires: {new Date(session.profile.access_expires_at).toLocaleDateString()}
          </span>
        </div>
      )}
      {isStaff ? (
        <TrainerOverview userId={session.userId} isOwner={session.isOwner} />
      ) : (
        <ClientOverview userId={session.userId} />
      )}
    </div>
  );
}
