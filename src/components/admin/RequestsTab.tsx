import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Crown, Send, Inbox } from "lucide-react";
import {
  listRequestsAdmin, listRequestMessagesAdmin, replyRequestAdmin, setRequestStatusAdmin,
  type RequestKind, type RequestStatus,
} from "@/lib/requests.functions";
import { setMemberVipAdmin } from "@/lib/admin.functions";
import { StatusPill } from "@/components/requests/RequestCenter";

const KIND_LABEL: Record<RequestKind, string> = {
  upgrade: "VIP upgrade",
  next_game: "Next game",
  general: "Message",
};

export function RequestsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRequestsAdmin);
  const statusFn = useServerFn(setRequestStatusAdmin);
  const vipFn = useServerFn(setMemberVipAdmin);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [kindFilter, setKindFilter] = useState<"all" | RequestKind>("all");

  const listQ = useQuery({
    queryKey: ["admin-requests"],
    queryFn: () => listFn(),
    refetchInterval: 20000,
  });

  const statusMut = useMutation({
    mutationFn: (d: { requestId: string; status: RequestStatus }) => statusFn({ data: d }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const vipMut = useMutation({
    mutationFn: (d: { id: string; is_vip: boolean }) => vipFn({ data: d }),
    onSuccess: () => { toast.success("VIP granted"); qc.invalidateQueries({ queryKey: ["admin-requests"] }); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (listQ.data ?? []).filter(
    (r) => (statusFilter === "all" || r.status === statusFilter) && (kindFilter === "all" || r.kind === kindFilter),
  );
  const active = rows.find((r) => r.id === activeId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Inbox</p>
        <h1 className="mt-1 font-display text-4xl sm:text-5xl">Member requests.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Upgrade requests, next-game purchases and questions land here.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={selectCls}>
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="answered">Answered</option>
          <option value="closed">Closed</option>
        </select>
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as any)} className={selectCls}>
          <option value="all">All types</option>
          <option value="upgrade">VIP upgrade</option>
          <option value="next_game">Next game</option>
          <option value="general">Message</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card-noir rounded-2xl p-2 space-y-1 max-h-[70vh] overflow-y-auto">
          {listQ.isLoading && <div className="shimmer h-16 rounded-xl" />}
          {!listQ.isLoading && rows.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Inbox className="mx-auto h-5 w-5 mb-2 text-gold" /> No requests yet.
            </div>
          )}
          {rows.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className={`w-full text-left rounded-xl px-3 py-2.5 transition ${activeId === r.id ? "bg-white/[0.06] border border-gold/30" : "hover:bg-white/5 border border-transparent"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{r.member?.full_name ?? "Member"}</span>
                <StatusPill status={r.status} />
              </div>
              <div className="text-xs text-muted-foreground truncate">{r.subject}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                {KIND_LABEL[r.kind as RequestKind]} · Ch {r.member?.channel ?? "—"} · {new Date(r.last_message_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </button>
          ))}
        </div>

        <div className="card-noir rounded-2xl p-4 min-h-[420px] flex flex-col">
          {!active ? (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Select a request to view the conversation.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div>
                  <div className="font-display text-xl leading-tight">{active.subject}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {active.member?.full_name ?? "Member"} · {active.member?.whatsapp ?? "—"} · Channel {active.member?.channel ?? "—"}
                    {active.member?.is_vip ? " · VIP" : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {active.kind === "upgrade" && !active.member?.is_vip && (
                    <button
                      onClick={() => vipMut.mutate({ id: active.user_id, is_vip: true })}
                      disabled={vipMut.isPending}
                      className="inline-flex items-center gap-1.5 rounded-full gold-bg px-3 py-1.5 text-[11px] font-semibold"
                    >
                      <Crown className="h-3 w-3" /> Grant VIP
                    </button>
                  )}
                  <select
                    value={active.status}
                    onChange={(e) => statusMut.mutate({ requestId: active.id, status: e.target.value as RequestStatus })}
                    className={selectCls}
                  >
                    <option value="open">Open</option>
                    <option value="answered">Answered</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <AdminThread requestId={active.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminThread({ requestId }: { requestId: string }) {
  const qc = useQueryClient();
  const msgsFn = useServerFn(listRequestMessagesAdmin);
  const replyFn = useServerFn(replyRequestAdmin);
  const [text, setText] = useState("");

  const msgsQ = useQuery({
    queryKey: ["admin-request-messages", requestId],
    queryFn: () => msgsFn({ data: { requestId } }),
    refetchInterval: 15000,
  });

  const replyMut = useMutation({
    mutationFn: () => replyFn({ data: { requestId, body: text } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["admin-request-messages", requestId] });
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto py-4 space-y-3 max-h-[46vh]">
        {(msgsQ.data ?? []).map((m) => (
          <div key={m.id} className={m.sender_role === "admin" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              m.sender_role === "admin" ? "gold-bg text-primary-foreground" : "glass"
            }`}>
              {m.body}
              <div className="mt-1 text-[10px] opacity-70">
                {new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border/50 pt-3 flex gap-2">
        <input
          className={inputCls} value={text} maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) replyMut.mutate(); }}
          placeholder="Write a reply to this member…"
        />
        <button
          onClick={() => replyMut.mutate()} disabled={!text.trim() || replyMut.isPending}
          className="rounded-full gold-bg px-4 grid place-items-center disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

const inputCls = "w-full rounded-xl bg-surface-2 border border-border px-4 py-2.5 outline-none focus:border-gold text-sm";
const selectCls = "rounded-lg bg-surface-2 border border-border px-2 py-1.5 text-xs outline-none focus:border-gold";
