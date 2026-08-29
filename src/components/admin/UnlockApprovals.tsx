import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X, Unlock } from "lucide-react";
import { listUnlocksAdmin, reviewUnlockAdmin } from "@/lib/unlocks.functions";

export function UnlockApprovals() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUnlocksAdmin);
  const reviewFn = useServerFn(reviewUnlockAdmin);

  const listQ = useQuery({
    queryKey: ["admin-unlocks"],
    queryFn: () => listFn(),
    refetchInterval: 20000,
  });

  const reviewMut = useMutation({
    mutationFn: (d: { id: string; status: "approved" | "rejected" }) => reviewFn({ data: d }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-unlocks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = listQ.data ?? [];
  const pending = rows.filter((r) => r.status === "pending");

  return (
    <div className="card-noir rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Unlock className="h-4 w-4 text-gold" />
        <h2 className="font-display text-xl">Reveal approvals</h2>
        {pending.length > 0 && (
          <span className="rounded-full gold-bg px-2 py-0.5 text-[10px] font-semibold">{pending.length} pending</span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Members share a pick and send proof. Approve to reveal the prediction for that member.
      </p>

      <div className="mt-4 space-y-3 max-h-[46vh] overflow-y-auto">
        {listQ.isLoading && <div className="shimmer h-16 rounded-xl" />}
        {!listQ.isLoading && rows.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">No share proofs yet.</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border/60 bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium">{r.member?.full_name ?? "Member"}</span>
                <span className="text-muted-foreground">
                  {" "}· {r.pick ? `${r.pick.home_team} vs ${r.pick.away_team}` : "Pick removed"}
                </span>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                  r.status === "approved"
                    ? "border-gold/40 text-gold"
                    : r.status === "rejected"
                      ? "border-destructive/40 text-destructive"
                      : "border-border text-muted-foreground"
                }`}
              >
                {r.status}
              </span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Ch {r.member?.channel ?? "—"} · {new Date(r.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
            {r.proof_image_url && (
              <a href={r.proof_image_url} target="_blank" rel="noreferrer">
                <img
                  src={r.proof_image_url}
                  alt="Share proof screenshot"
                  className="mt-2 max-h-48 rounded-lg border border-border/60"
                />
              </a>
            )}
            {r.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => reviewMut.mutate({ id: r.id, status: "approved" })}
                  disabled={reviewMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full gold-bg px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                >
                  <Check className="h-3 w-3" /> Approve reveal
                </button>
                <button
                  onClick={() => reviewMut.mutate({ id: r.id, status: "rejected" })}
                  disabled={reviewMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] disabled:opacity-50"
                >
                  <X className="h-3 w-3" /> Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
