import { useRef, useState } from "react";
import { MessageCircle, Send, Share2, Link2, Camera, Clock3, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { requestUnlock } from "@/lib/unlocks.functions";
import { fileToImageDataUrl } from "@/lib/image-upload";

export type UnlockState = "none" | "pending" | "approved" | "rejected";

export function ShareToReveal({
  id,
  message,
  status = "none",
  className = "",
}: {
  id: string;
  message: string;
  status?: UnlockState;
  className?: string;
}) {
  const qc = useQueryClient();
  const submit = useServerFn(requestUnlock);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const text = `${message}\n\n${url}`;

  const proofMut = useMutation({
    mutationFn: (proofImageUrl: string) => submit({ data: { predictionId: id, proofImageUrl } }),
    onSuccess: () => {
      toast.success("Proof sent", { description: "An admin will approve it and the pick unlocks." });
      qc.invalidateQueries({ queryKey: ["channel-picks"] });
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openShare = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Aurum Fixed", text: message, url });
        return true;
      }
    } catch {
      /* user cancelled or unsupported */
    }
    return false;
  };

  const onPick = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToImageDataUrl(file);
      await proofMut.mutateAsync(dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that image");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (status === "approved") {
    return (
      <div className={className}>
        <div className="inline-flex items-center gap-1.5 text-[11px] text-gold">
          <CheckCircle2 className="h-3.5 w-3.5" /> Approved by admin — revealed
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className={className}>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.06] px-3 py-1.5 text-[11px] text-gold">
          <Clock3 className="h-3.5 w-3.5" /> Proof sent — waiting for admin approval
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="text-[9px] uppercase tracking-[0.3em] text-gold/70">
        Reveal early — share, then send proof
      </div>
      {status === "rejected" && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-destructive">
          <RotateCcw className="h-3.5 w-3.5" /> Proof declined — share again and resend
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={async () => {
            if (await nativeShare()) return;
            openShare(`https://wa.me/?text=${encodeURIComponent(text)}`);
          }}
          className="inline-flex items-center gap-1.5 rounded-full gold-bg px-4 py-2 text-[11px] font-semibold shadow-[0_10px_28px_-12px_var(--gold)]"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
        </button>
        <button
          type="button"
          onClick={() => openShare(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-2 text-[11px] text-foreground/85"
          aria-label="Share on Telegram"
        >
          <Send className="h-3.5 w-3.5 text-gold/80" /> Telegram
        </button>
        <button
          type="button"
          onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-2 text-[11px] text-foreground/85"
          aria-label="Share on X"
        >
          <Share2 className="h-3.5 w-3.5 text-gold/80" /> X
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              toast.success("Link copied");
            } catch {
              /* noop */
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-2 text-[11px] text-foreground/85"
          aria-label="Copy link"
        >
          <Link2 className="h-3.5 w-3.5 text-gold/80" /> Copy link
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy || proofMut.isPending}
        onClick={() => fileRef.current?.click()}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[11px] font-semibold text-gold disabled:opacity-50"
      >
        <Camera className="h-3.5 w-3.5" />
        {busy || proofMut.isPending ? "Sending proof…" : "Send proof screenshot for approval"}
      </button>
    </div>
  );
}
