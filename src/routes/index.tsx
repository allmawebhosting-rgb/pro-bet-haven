import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronRight, ShieldCheck, Lock, Trophy, Zap, CheckCircle2, Flame, Target } from "lucide-react";
import heroImg from "@/assets/hero-stadium.jpg";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurum Fixed — 100% Guaranteed Fixed Matches, Delivered Daily" },
      { name: "description", content: "Insider fixed matches with verified sources. Claim 2 free picks — no stake, no risk. Join the private VIP circle winning every day." },
      { property: "og:title", content: "Aurum Fixed — 100% Guaranteed Fixed Matches" },
      { property: "og:description", content: "Insider fixed matches with verified sources. Your first 2 picks are on us." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const stats = [
  { label: "Winning members", value: 12480, suffix: "+" },
  { label: "Fixed matches delivered", value: 3200, suffix: "+" },
  { label: "Win rate", value: 98, suffix: "%" },
  { label: "Avg. odds", value: 3.6, suffix: "" },
];

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  const display = to % 1 === 0 ? Math.floor(n).toLocaleString() : n.toFixed(1);
  return <span>{display}{suffix}</span>;
}

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <div className="glass rounded-full px-4 sm:px-6 py-3 flex items-center justify-between">
            <Logo />
            <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#how" className="hover:text-foreground transition">How it works</a>
              <a href="#proof" className="hover:text-foreground transition">Recent wins</a>
              <a href="#faq" className="hover:text-foreground transition">FAQ</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/auth" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
              <Link to="/register" className="rounded-full gold-bg px-4 py-2 text-sm font-semibold shadow-[0_0_24px_oklch(0.82_0.14_85/35%)]">
                Get 2 free picks
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <img
          src={heroImg}
          alt="Stadium at night"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          width={1920} height={1280}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-radial-gold)" }} />

        <div className="relative mx-auto max-w-7xl px-6 pt-32 pb-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Verified insider sources · Daily drops
            </div>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
              100% Guaranteed<br /><span className="gold-text">Fixed Matches</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl">
              Insider odds. Verified sources. Your first <b className="text-gold">2 picks are on us</b> — no stake, no risk, no card. Just sign up and start winning.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-full gold-bg px-7 py-4 text-sm font-semibold shadow-[0_0_40px_oklch(0.82_0.14_85/45%)]"
              >
                Claim 2 Free Fixed Picks
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#how"
                className="rounded-full glass px-7 py-4 text-sm font-medium text-foreground hover:border-gold/40 transition"
              >
                How it works
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-gold" /> No payment required</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-gold" /> Instant channel access</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-gold" /> WhatsApp alerts</span>
            </div>
          </motion.div>

          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass rounded-2xl p-4 sm:p-6"
              >
                <div className="font-display text-3xl sm:text-5xl gold-text tabular-nums">
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-xs sm:text-sm text-muted-foreground uppercase tracking-widest">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">How it works</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl">From signup to first win in minutes.</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", icon: ShieldCheck, title: "Join in one tap", desc: "Continue with Google — that's it. You're placed in a private VIP channel instantly." },
              { n: "02", icon: Trophy, title: "Unlock 2 free fixed matches", desc: "See two full fixed match slips — teams, prediction, odds, kickoff — no stake, no card." },
              { n: "03", icon: Flame, title: "Go VIP for daily wins", desc: "Upgrade for daily fixed matches on tap, delivered the moment they drop." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="card-noir rounded-3xl p-8"
              >
                <div className="font-display text-6xl gold-text opacity-40">{f.n}</div>
                <div className="mt-4 grid h-11 w-11 place-items-center rounded-full gold-bg">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-2xl">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT WINS PROOF */}
      <section id="proof" className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold">Recent fixed wins</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl max-w-xl">This week's slips.</h2>
            </div>
            <Link to="/register" className="text-sm text-gold hover:underline">Unlock all slips →</Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { league: "Serie A", match: "Juventus vs Roma", pick: "Home & Over 2.5", odds: 3.85, result: "WON" },
              { league: "La Liga", match: "Real Madrid vs Sevilla", pick: "BTTS & Over 3.5", odds: 4.20, result: "WON" },
              { league: "Premier League", match: "Arsenal vs Chelsea", pick: "Home Win", odds: 2.10, result: "WON" },
              { league: "Bundesliga", match: "Bayern vs Dortmund", pick: "Over 3.5", odds: 2.75, result: "LOCKED" },
              { league: "Ligue 1", match: "PSG vs Marseille", pick: "Correct Score 3-1", odds: 9.50, result: "LOCKED" },
              { league: "Champions League", match: "Man City vs Inter", pick: "Home & BTTS", odds: 3.40, result: "LOCKED" },
            ].map((c, i) => {
              const locked = c.result === "LOCKED";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="card-noir rounded-2xl p-6 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{c.league}</span>
                    {c.result === "WON" ? (
                      <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest">Won</span>
                    ) : (
                      <span className="rounded-full glass px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest inline-flex items-center gap-1 text-gold"><Lock className="h-3 w-3" /> VIP</span>
                    )}
                  </div>
                  <div className={`mt-3 font-display text-xl ${locked ? "blur-sm select-none" : ""}`}>{c.match}</div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`text-sm ${locked ? "blur-sm select-none" : "text-foreground"}`}>Pick: <b>{c.pick}</b></span>
                    <span className="rounded-full glass px-3 py-1 text-xs">Odds <b className="text-gold">{c.odds}</b></span>
                  </div>
                  {locked && (
                    <Link to="/register" className="absolute inset-0 grid place-items-center bg-background/50 backdrop-blur-sm">
                      <span className="rounded-full gold-bg px-5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Unlock free</span>
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="card-fixed rounded-[2rem] p-10 sm:p-16 text-center gold-ring">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-gold">
              <Target className="h-3.5 w-3.5" /> Free trial · 2 picks
            </div>
            <h2 className="mt-6 font-display text-4xl sm:text-6xl">
              Two <span className="gold-text">guaranteed wins</span> on the house.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Sign up now and both picks land in your private channel instantly. If you win, keep winning with VIP.
            </p>
            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-full gold-bg px-8 py-4 text-sm font-semibold shadow-[0_0_50px_oklch(0.82_0.14_85/55%)]"
            >
              Claim your 2 free fixed picks
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-xs uppercase tracking-[0.3em] text-gold text-center">FAQ</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl text-center">Everything you need to know.</h2>
          <div className="mt-12 divide-y divide-border/60 glass rounded-2xl overflow-hidden">
            {[
              { q: "Are the free picks really free?", a: "Yes. No card, no deposit, no stake. Just sign up with your name and WhatsApp and both fixed picks appear in your private channel." },
              { q: "How are matches 'fixed'?", a: "Our sources come from inside the leagues — clubs, staff, officials. Every slip is verified before it drops to members. Play responsibly." },
              { q: "What happens after the 2 free picks?", a: "Additional slips are VIP-only. Upgrade any time from your dashboard to get every daily fixed match." },
              { q: "How fast are picks delivered?", a: "Instantly to your dashboard with WhatsApp alerts, usually 2–24 hours before kickoff." },
              { q: "Do you guarantee results?", a: "Our win rate is 98%+ across verified slips, but no outcome in sport is ever 100%. Please play responsibly and only stake what you can afford." },
            ].map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-display text-lg">{f.q}</span>
                  <span className="text-gold transition group-open:rotate-45 text-2xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-14">
        <div className="mx-auto max-w-7xl px-6 grid gap-10 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              Insider fixed matches for a private members' circle. 18+ only. Play responsibly.
            </p>
          </div>
          <div className="text-sm">
            <p className="text-gold uppercase text-xs tracking-widest">Contact</p>
            <p className="mt-3 text-muted-foreground">support@aurumfixed.com</p>
            <p className="text-muted-foreground">WhatsApp: +1 (000) 000-0000</p>
          </div>
          <div className="text-sm">
            <p className="text-gold uppercase text-xs tracking-widest">Follow</p>
            <div className="mt-3 flex gap-4 text-muted-foreground">
              <a href="#" className="hover:text-foreground">Telegram</a>
              <a href="#" className="hover:text-foreground">Instagram</a>
              <a href="#" className="hover:text-foreground">X</a>
            </div>
          </div>
        </div>
        <div className="mt-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Aurum Fixed. 18+. Play responsibly.
        </div>
      </footer>
    </div>
  );
}
