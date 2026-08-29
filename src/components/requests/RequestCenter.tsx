import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, X, Send, Crown, Ticket, ChevronLeft, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { fileToImageDataUrl } from "@/lib/image-upload";
import {
  createRequest, listMyRequests, listRequestMessages, postMessage,
  type RequestKind,
} from "@/lib/requests.functions";

type OpenOpts = { kind?: RequestKind; subject?: string; draft?: string };

const Ctx = createContext<{ open: (o?: OpenOpts) => void } | null>(null);

export function useRequestCenter() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRequestCenter must be used inside RequestCenterProvider");
  return ctx;
}

const KIND_LABEL: Record<RequestKind, string> = {
  upgrade: "VIP upgrade",
  next_game: "Next game",
  general: "Message",
};

export function RequestCenterProvider({ children }: { children: ReactNode }) {
  const [openState, setOpenState] = useState<null | OpenOpts>(null);
  const value = useMemo(() => ({ open: (o?: OpenOpts) => setOpenState(o ?? {}) }), []);

  return (
    <Ctx.Provider value={value}>
      {children}
      <button
        onClick={() => value.open()}
        aria-label="Messages with admin"
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full gold-bg grid place-items-center shadow-lg"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {openState && <RequestDrawer opts={openState} onClose={() => setOpenState(null)} />}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

function RequestDrawer({ opts, onClose }: { opts: OpenOpts; onClose: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyRequests);
  const createFn = useServerFn(createRequest);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composing, setComposing] = useState(Boolean(opts.kind));
  const [kind, setKind] = useState<RequestKind>(opts.kind ?? "general");
  const [subject, setSubject] = useState(opts.subject ?? "");
  const [body, setBody] = useState(opts.draft ?? "");
  const [image, setImage] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["my-requests"],
    queryFn: () => listFn(),
    refetchInterval: 20000,
  });

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { kind, subject: subject || KIND_LABEL[kind], body, imageUrl: image ?? undefined } }),
    onSuccess: (r) => {
      toast.success("Sent to the admin");
      setBody(""); setSubject(""); setImage(null); setComposing(false);
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      setActiveId(r.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.aside
        onClick={(e) => e.stopPropagation()}
        initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
        className="h-full w-full sm:max-w-md card-noir border-l border-border/60 flex flex-col"
      >
        <header className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
          {(activeId || composing) && (
            <button onClick={() => { setActiveId(null); setComposing(false); }} className="text-muted-foreground hover:text-gold">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Direct line</p>
            <h2 className="font-display text-xl leading-tight">Admin messages</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-gold">
            <X className="h-4 w-4" />
          </button>
        </header>

        {activeId ? (
          <Thread requestId={activeId} />
        ) : composing ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <Field label="What do you need?">
              <select value={kind} onChange={(e) => setKind(e.target.value as RequestKind)} className={inputCls}>
                <option value="upgrade">Upgrade to VIP</option>
                <option value="next_game">Buy the next game</option>
                <option value="general">Something else</option>
              </select>
            </Field>
            <Field label="Subject">
              <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder={KIND_LABEL[kind]} />
            </Field>
            <Field label="Message">
              <textarea rows={5} className={inputCls} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Tell the admin what you want…" />
            </Field>
            <AttachmentPicker image={image} onChange={setImage} />
            <button
              disabled={createMut.isPending || (!body.trim() && !image)}
              onClick={() => createMut.mutate()}
              className="w-full rounded-full gold-bg px-5 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {createMut.isPending ? "Sending…" : "Send to admin"}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={Crown} label="Upgrade to VIP" onClick={() => { setKind("upgrade"); setSubject("VIP upgrade request"); setComposing(true); }} />
              <QuickAction icon={Ticket} label="Buy next game" onClick={() => { setKind("next_game"); setSubject("Buy the next game"); setComposing(true); }} />
            </div>
            <button onClick={() => { setKind("general"); setSubject(""); setComposing(true); }} className="w-full rounded-xl glass px-4 py-2.5 text-xs hover:border-gold/40">
              Write a message
            </button>

            <div className="pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">Your requests</div>
            {listQ.isLoading && <div className="shimmer h-16 rounded-xl" />}
            {!listQ.isLoading && (listQ.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            )}
            {(listQ.data ?? []).map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className="w-full text-left rounded-xl glass px-4 py-3 hover:border-gold/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{r.subject}</span>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {KIND_LABEL[r.kind as RequestKind]} · {new Date(r.last_message_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}

function Thread({ requestId }: { requestId: string }) {
  const qc = useQueryClient();
  const msgsFn = useServerFn(listRequestMessages);
  const sendFn = useServerFn(postMessage);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const msgsQ = useQuery({
    queryKey: ["my-request-messages", requestId],
    queryFn: () => msgsFn({ data: { requestId } }),
    refetchInterval: 10000,
  });

  const sendMut = useMutation({
    mutationFn: () => sendFn({ data: { requestId, body: text, imageUrl: image ?? undefined } }),
    onSuccess: () => {
      setText("");
      setImage(null);
      qc.invalidateQueries({ queryKey: ["my-request-messages", requestId] });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(msgsQ.data ?? []).map((m) => (
          <div key={m.id} className={m.sender_role === "admin" ? "flex justify-start" : "flex justify-end"}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              m.sender_role === "admin" ? "glass" : "gold-bg text-primary-foreground"
            }`}>
              {m.body}
              {m.image_url && <MessageImage src={m.image_url} />}
              <div className="mt-1 text-[10px] opacity-70">
                {new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border/50 p-3 flex gap-2">
        <input
          className={inputCls} value={text} maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) sendMut.mutate(); }}
          placeholder="Reply…"
        />
        <button
          onClick={() => sendMut.mutate()} disabled={!text.trim() || sendMut.isPending}
          className="rounded-full gold-bg px-4 grid place-items-center disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function AttachmentPicker({ image, onChange }: { image: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToImageDataUrl(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not attach the image");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {image ? (
        <div className="relative inline-block">
          <img src={image} alt="Attached screenshot" className="max-h-32 rounded-xl border border-gold/30" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove attachment"
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-background border border-border text-muted-foreground hover:text-gold"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-2 text-[11px] text-foreground/85 disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5 text-gold/80" /> {busy ? "Processing…" : "Attach screenshot"}
        </button>
      )}
    </div>
  );
}

export function MessageImage({ src }: { src: string }) {
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block">
      <img src={src} alt="Attached screenshot" className="mt-1.5 max-h-56 rounded-lg border border-white/10" loading="lazy" />
    </a>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Crown; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl glass px-3 py-3 text-left hover:border-gold/40">
      <Icon className="h-4 w-4 text-gold" />
      <div className="mt-1.5 text-xs font-medium">{label}</div>
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cls =
    status === "answered" ? "bg-gold/15 text-gold" :
    status === "closed" ? "bg-white/5 text-muted-foreground" :
    "bg-emerald-500/15 text-emerald-400";
  return <span className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold ${cls}`}>{status}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded-xl bg-surface-2 border border-border px-4 py-2.5 outline-none focus:border-gold text-sm";
