"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import Avatar from "@/components/Avatar";
import { Send } from "lucide-react";
import { format } from "date-fns";

export default function MessagesPage() {
  const session = useSession();

  if (session.loading || !session.userId) return <p className="text-neutral-500">Loading…</p>;

  const isStaff = session.isTrainer || session.isOwner;
  return isStaff ? <StaffInbox userId={session.userId} /> : <ClientChat userId={session.userId} />;
}

// ---------------- Staff (PT/Owner): contact list + thread ----------------
function StaffInbox({ userId }: { userId: string }) {
  const supabase = createClient();
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("pt_clients")
      .select("client:profiles!pt_clients_client_id_fkey(id, full_name, username, avatar_url)")
      .eq("pt_id", userId)
      .then(({ data }) => {
        const list = (data ?? []).map((r: any) => r.client).filter(Boolean);
        setContacts(list);
        if (list[0]) setActiveId(list[0].id);
      });
  }, [userId]); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-neutral-400 text-sm">Chat with your clients.</p>
      </div>

      <div className="card grid md:grid-cols-[16rem_1fr] overflow-hidden" style={{ minHeight: "32rem" }}>
        <div className="border-r border-white/[0.06] overflow-y-auto">
          {contacts.length === 0 && (
            <p className="text-sm text-neutral-500 p-4">No clients yet.</p>
          )}
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                activeId === c.id ? "bg-gold-400/10" : "hover:bg-white/[0.03]"
              }`}
            >
              <Avatar url={c.avatar_url} name={c.full_name} size={32} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.full_name}</p>
                {c.username && <p className="text-xs text-neutral-500 truncate">@{c.username}</p>}
              </div>
            </button>
          ))}
        </div>
        <div className="flex flex-col">
          {activeId ? (
            <ChatThread meId={userId} otherId={activeId} contacts={contacts} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
              Select a client to start chatting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Client: single thread with their PT ----------------
function ClientChat({ userId }: { userId: string }) {
  const supabase = createClient();
  const [pt, setPt] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("pt_clients")
      .select("pt:profiles!pt_clients_pt_id_fkey(id, full_name, avatar_url)")
      .eq("client_id", userId)
      .single()
      .then(({ data }) => setPt((data as any)?.pt ?? null));
  }, [userId]); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-neutral-400 text-sm">
          {pt ? `Chatting with ${pt.full_name}` : "Your trainer"}
        </p>
      </div>
      <div className="card flex flex-col overflow-hidden" style={{ minHeight: "32rem" }}>
        {pt ? (
          <ChatThread meId={userId} otherId={pt.id} contacts={[pt]} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm p-6 text-center">
            You're not linked to a trainer yet — once you are, you can message them here.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Shared chat thread ----------------
function ChatThread({ meId, otherId, contacts }: { meId: string; otherId: string; contacts: any[] }) {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const other = contacts.find((c) => c.id === otherId);

  async function load() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${meId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${meId})`
      )
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    // mark incoming as read, then let the sidebar know so its badge updates immediately
    const { data: justRead } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", otherId)
      .eq("recipient_id", meId)
      .eq("read", false)
      .select("id");
    if (justRead && justRead.length > 0) {
      window.dispatchEvent(new Event("tmc:messages-read"));
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`messages-${meId}-${otherId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const m = payload.new;
          if (
            (m.sender_id === meId && m.recipient_id === otherId) ||
            (m.sender_id === otherId && m.recipient_id === meId)
          ) {
            load();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherId]); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!content.trim()) return;
    await supabase.from("messages").insert({ sender_id: meId, recipient_id: otherId, content: content.trim() });
    setContent("");
    load();
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <Avatar url={other?.avatar_url} name={other?.full_name} size={28} />
        <span className="font-medium text-sm">{other?.full_name}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && <p className="text-sm text-neutral-500">No messages yet — say hi!</p>}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <Avatar url={other?.avatar_url} name={other?.full_name} size={22} />}
              <div className="max-w-[70%]">
                <div className={`text-[10px] text-neutral-500 mb-0.5 ${mine ? "text-right" : ""}`}>
                  {mine ? "You" : other?.full_name}
                </div>
                <div
                  className={`px-3 py-2 rounded-lg text-sm ${
                    mine ? "text-base-950" : "bg-base-850 border border-white/[0.06] text-neutral-100"
                  }`}
                  style={mine ? { background: "linear-gradient(135deg, #f2c94c, #d4af37)" } : undefined}
                >
                  {m.content}
                  <div className={`text-[10px] mt-1 ${mine ? "text-base-950/60" : "text-neutral-500"}`}>
                    {format(new Date(m.created_at), "HH:mm")}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-white/[0.06]">
        <input
          className="input-field"
          placeholder="Type a message…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} className="btn-primary px-3">
          <Send size={16} />
        </button>
      </div>
    </>
  );
}
