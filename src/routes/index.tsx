import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronRight, ShieldCheck, Timer, Trophy, Zap, Star } from "lucide-react";
import heroImg from "@/assets/hero-stadium.jpg";
import { Logo } from "@/components/Logo";
import { useSiteSettings } from "@/lib/site-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurum — Premium Sports Predictions" },
      { name: "description", content: "A private members' circle for premium, carefully researched football predictions. Join today." },
      { property: "og:title", content: "Aurum — Premium Sports Predictions" },
      { property: "og:description", content: "A private members' circle for premium, carefully researched football predictions. Join today." },
    ],
  }),
  component: Landing,
});

const stats = [
  { label: "Members", value: 12480, suffix: "+" },
  { label: "Predictions delivered", value: 3200, suffix: "+" },
  { label: "Avg. odds", value: 2.4, suffix: "" },
  { label: "Leagues covered", value: 38, suffix: "" },
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
  const { settings } = useSiteSettings();
  return (
    <div className="min-h-screen">
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <div className="glass rounded-full px-4 sm:px-6 py-3 flex items-center justify-between">
            <Logo />
            <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition">Why Aurum</a>
              <a href="#testimonials" className="hover:text-foreground transition">Members</a>
              <a href="#faq" className="hover:text-foreground transition">FAQ</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/auth" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
              <Link to="/register" className="rounded-full gold-bg px-4 py-2 text-sm font-semibold shadow-[0_0_24px_oklch(0.82_0.14_85/35%)]">
                Join
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
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          width={1920} height={1280}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
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
              Invite-only members' circle
            </div>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
              Premium <span className="gold-text">Sports</span><br />Predictions
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl">
              {settings.tagline}. Carefully researched football predictions delivered to a private, curated channel — nothing broadcast, nothing generic.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-full gold-bg px-7 py-4 text-sm font-semibold shadow-[0_0_40px_oklch(0.82_0.14_85/45%)]"
              >
                Claim your spot
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#features"
                className="rounded-full glass px-7 py-4 text-sm font-medium text-foreground hover:border-gold/40 transition"
              >
                How it works
              </a>
            </div>
          </motion.div>

          {/* Stats */}
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

      {/* FEATURES */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Why Aurum</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl">A different kind of edge.</h2>
            <p className="mt-4 text-muted-foreground">
              We treat football like fintech — data, discipline, and delivery. Members receive concise, actionable insight with confidence indicators, kickoff timing, and full match context.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Curated channel", desc: "Members are placed in a private channel. No noise, no crowd." },
              { icon: Timer, title: "Timed releases", desc: "Predictions unlock on a schedule, with a live countdown to kickoff." },
              { icon: Trophy, title: "Research-first", desc: "Every pick includes league context, form signals and confidence." },
              { icon: Zap, title: "Instant delivery", desc: "Realtime notifications the moment a new prediction is released." },
              { icon: Star, title: "Transparent history", desc: "Full performance archive — see prior picks, odds and outcomes." },
              { icon: ChevronRight, title: "Built for mobile", desc: "Every surface designed mobile-first with premium interactions." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="glass rounded-2xl p-6 hover:border-gold/40 transition"
              >
                <div className="grid h-11 w-11 place-items-center rounded-full gold-bg mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-2xl">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Members</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl max-w-xl">Trusted by discerning members.</h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { q: "The interface alone feels like a private bank. The predictions are the reason I stayed.", n: "K. Adeyemi", r: "Member since 2023" },
              { q: "I love that it's quiet. One channel, timed drops, done. Everything feels considered.", n: "M. Novak", r: "Member since 2024" },
              { q: "Best presentation of match data I've seen. Confidence markers make it easy to prioritise.", n: "J. Fernández", r: "Member since 2022" },
            ].map((t, i) => (
              <motion.figure
                key={t.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="glass rounded-2xl p-8"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
                <blockquote className="font-display text-2xl leading-snug">"{t.q}"</blockquote>
                <figcaption className="mt-6 text-sm">
                  <div className="text-foreground">{t.n}</div>
                  <div className="text-muted-foreground text-xs">{t.r}</div>
                </figcaption>
              </motion.figure>
            ))}
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
              { q: "How do predictions get delivered?", a: "Each member is placed into a private channel on signup. Predictions unlock inside your channel according to a release schedule you can track in your dashboard." },
              { q: "Do you guarantee results?", a: "No. Every prediction is based on research and context; sport is inherently uncertain. Please play responsibly and only stake what you can afford." },
              { q: "Can I choose my channel?", a: "Members are allocated automatically to keep each channel curated and balanced. This is by design." },
              { q: "What do I need to sign up?", a: "Only your full name and WhatsApp number. Nothing else." },
              { q: "How do I cancel?", a: "You can request to have your account disabled at any time from support." },
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

      {/* FOOTER */}
      <footer className="border-t border-border/50 py-14">
        <div className="mx-auto max-w-7xl px-6 grid gap-10 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              A private members' circle for premium football predictions. For informational purposes only.
            </p>
          </div>
          <div className="text-sm">
            <p className="text-gold uppercase text-xs tracking-widest">Contact</p>
            <p className="mt-3 text-muted-foreground">support@aurumpredictions.com</p>
            <p className="text-muted-foreground">WhatsApp: +1 (000) 000-0000</p>
          </div>
          <div className="text-sm">
            <p className="text-gold uppercase text-xs tracking-widest">Social</p>
            <div className="mt-3 flex gap-4 text-muted-foreground">
              <a href="#" className="hover:text-foreground">Twitter</a>
              <a href="#" className="hover:text-foreground">Instagram</a>
              <a href="#" className="hover:text-foreground">Telegram</a>
            </div>
          </div>
        </div>
        <div className="mt-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.site_name}. Play responsibly.
        </div>
      </footer>
    </div>
  );
}
