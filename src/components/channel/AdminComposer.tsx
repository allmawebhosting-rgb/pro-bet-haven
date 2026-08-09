import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Pin, Trophy, X, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { postAnnouncement, postMatchPick } from "@/lib/channel.functions";
import { SPORTS, SPORT_LABEL, participantLabels, type Sport } from "@/lib/sports";

type Target = "A" | "B" | "all";

export function AdminComposer({ currentChannel }: { currentChannel: "A" | "B" }) {
  const qc = useQueryClient();
  const send = useServerFn(postAnnouncement);
  const sendMatch = useServerFn(postMatchPick);

  const [mode, setMode] = useState<"text" | "match">("text");
  const [menuOpen, setMenuOpen] = useState(false);
  const [target, setTarget] = useState<Target>(currentChannel);
  const [pinned, setPinned] = useState(false);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const [match, setMatch] = useState({
    sport: "football" as Sport,
    league: "",
    home_team: "",
    away_team: "",
    kickoff_at: "",
    prediction: "",
    odds: "",
    confidence: 4,
    tier: "vip" as "free" | "vip",
  });

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      await send({ data: { body: body.trim(), target, pinned, title: "" } });
      setBody("");
      setPinned(false);
      await qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Broadcast sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  async function sendMatchNow(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendMatch({
        data: {
          target,
          sport: match.sport,
          league: match.league.trim(),
          home_team: match.home_team.trim(),
          away_team: match.away_team.trim(),
          kickoff_at: new Date(match.kickoff_at).toISOString(),
          prediction: match.prediction.trim(),
          odds: match.odds ? Number(match.odds) : null,
          confidence: match.confidence,
          tier: match.tier,
        },
      });
      setMatch({
        sport: match.sport,
        league: "",
        home_team: "",
        away_team: "",
        kickoff_at: "",
        prediction: "",
        odds: "",
        confidence: 4,
        tier: "vip",
      });
      setMode("text");
      await qc.invalidateQueries({ queryKey: ["predictions"] });
      const where = target === "all" ? "both channels" : `Channel ${target}`;
      toast.success(
        match.tier === "vip"
          ? `Posted to ${where} — visible to VIP members only`
          : `Posted to ${where} — drops at the channel's scheduled time`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-2xl px-3 sm:px-4 pb-3 sm:pb-4 pointer-events-auto">
        {/* target + pinned chips */}
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-1.5">
            {(["A", "B", "all"] as Target[]).map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold transition ${
                  target === t
                    ? "gold-bg text-primary-foreground"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "Both" : `Channel ${t}`}
              </button>
            ))}
          </div>
          {mode === "text" && (
            <button
              onClick={() => setPinned((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold transition ${
                pinned ? "gold-bg text-primary-foreground" : "glass text-muted-foreground"
              }`}
            >
              <Pin className="h-3 w-3 rotate-45" />
              {pinned ? "Pinning" : "Pin"}
            </button>
          )}
        </div>

        <div className="relative rounded-2xl glass-strong shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
          <AnimatePresence mode="wait">
            {mode === "text" ? (
              <motion.form
                key="text"
                onSubmit={sendText}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-end gap-2 p-2"
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="h-10 w-10 rounded-full glass grid place-items-center hover:border-gold/40 transition"
                    title="Attach"
                  >
                    <Plus className={`h-4 w-4 text-gold transition-transform ${menuOpen ? "rotate-45" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        className="absolute bottom-12 left-0 w-52 rounded-2xl glass-strong p-1.5 shadow-2xl"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMode("match");
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gold/10 transition text-left"
                        >
                          <div className="h-8 w-8 rounded-lg gold-bg grid place-items-center">
                            <Trophy className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Fixed match pick</div>
                            <div className="text-[10px] text-muted-foreground">Structured card</div>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendText(e as unknown as React.FormEvent);
                    }
                  }}
                  rows={1}
                  placeholder="Broadcast to the channel…"
                  className="flex-1 resize-none bg-transparent outline-none px-2 py-2.5 text-sm placeholder:text-muted-foreground/60 max-h-32"
                  style={{ minHeight: 40 }}
                />

                <button
                  type="submit"
                  disabled={loading || !body.trim()}
                  className="h-10 w-10 rounded-full gold-bg grid place-items-center disabled:opacity-40 transition shadow-[0_0_20px_-4px_var(--gold)]"
                  title="Send"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 text-primary-foreground" />
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="match"
                onSubmit={sendMatchNow}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMode("text")}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-gold"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back to text
                  </button>
                  <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-gold">
                    <Trophy className="h-3 w-3" /> Fixed pick
                  </div>
                  <button type="button" onClick={() => setMode("text")} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <select
                  className="w-full rounded-xl bg-surface-2/50 border border-border px-3 py-2 text-sm outline-none focus:border-gold"
                  value={match.sport}
                  onChange={(e) => setMatch({ ...match, sport: e.target.value as Sport })}
                >
                  {SPORTS.map((s) => (
                    <option key={s} value={s}>{SPORT_LABEL[s]}</option>
                  ))}
                </select>
                <input
                  className="w-full rounded-xl bg-surface-2/50 border border-border px-3 py-2 text-sm outline-none focus:border-gold"
                  placeholder="League / competition"
                  value={match.league}
                  onChange={(e) => setMatch({ ...match, league: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="rounded-xl bg-surface-2/50 border border-border px-3 py-2 text-sm outline-none focus:border-gold"
                    placeholder={participantLabels(match.sport).home}
                    value={match.home_team}
                    onChange={(e) => setMatch({ ...match, home_team: e.target.value })}
                    required
                  />
                  <input
                    className="rounded-xl bg-surface-2/50 border border-border px-3 py-2 text-sm outline-none focus:border-gold"
                    placeholder={participantLabels(match.sport).away}
                    value={match.away_team}
                    onChange={(e) => setMatch({ ...match, away_team: e.target.value })}
                    required
                  />
                </div>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl bg-surface-2/50 border border-border px-3 py-2 text-sm outline-none focus:border-gold"
                  value={match.kickoff_at}
                  onChange={(e) => setMatch({ ...match, kickoff_at: e.target.value })}
                  required
                />
                <input
                  className="w-full rounded-xl bg-surface-2/50 border border-border px-3 py-2 text-sm outline-none focus:border-gold"
                  placeholder="Prediction (e.g. Over 2.5)"
                  value={match.prediction}
                  onChange={(e) => setMatch({ ...match, prediction: e.target.value })}
                  required
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className="rounded-xl bg-surface-2/50 border border-border px-3 py-2 text-sm outline-none focus:border-gold"
                    placeholder="Odds"
                    inputMode="decimal"
                    value={match.odds}
                    onChange={(e) => setMatch({ ...match, odds: e.target.value })}
                  />
                  <select
                    className="rounded-xl bg-surface-2/50 border border-border px-2 py-2 text-sm outline-none focus:border-gold"
                    value={match.confidence}
                    onChange={(e) => setMatch({ ...match, confidence: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{"★".repeat(n)}</option>
                    ))}
                  </select>
                  <select
                    className="rounded-xl bg-surface-2/50 border border-border px-2 py-2 text-sm outline-none focus:border-gold"
                    value={match.tier}
                    onChange={(e) => setMatch({ ...match, tier: e.target.value as "free" | "vip" })}
                  >
                    <option value="vip">VIP</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl gold-bg py-2.5 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Post fixed pick
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
