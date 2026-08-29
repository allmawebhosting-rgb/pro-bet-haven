import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Send, Share2, Link2, Camera } from "lucide-react";
import { toast } from "sonner";
import { useRequestCenter } from "@/components/requests/RequestCenter";

const EVENT = "share-unlock-changed";
const key = (id: string) => `share-unlocked:${id}`;

export function useShareUnlocked(id: string) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setUnlocked(localStorage.getItem(key(id)) === "1");
      } catch {
        /* noop */
      }
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, [id]);

  const unlock = useCallback(() => {
    try {
      localStorage.setItem(key(id), "1");
    } catch {
      /* noop */
    }
    window.dispatchEvent(new Event(EVENT));
  }, [id]);

  return { unlocked, unlock };
}

export function ShareToReveal({
  id,
  message,
  className = "",
  proofOnly = false,
}: {
  id: string;
  message: string;
  className?: string;
  proofOnly?: boolean;
}) {
  const { unlocked, unlock } = useShareUnlocked(id);
  const { open } = useRequestCenter();
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const text = `${message}\n\n${url}`;

  const done = () => {
    unlock();
    toast.success("Prediction revealed", { description: "Thanks for sharing — the tip is now unlocked." });
  };

  const openShare = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
    done();
  };

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Aurum Fixed", text: message, url });
        done();
        return true;
      }
    } catch {
      /* user cancelled or unsupported */
    }
    return false;
  };

  const proofButton = unlocked ? (
    <button
      type="button"
      onClick={() =>
        open({
          kind: "general",
          subject: "Share proof",
          draft: `I shared the pick — screenshot attached.\n\n${message}`,
        })
      }
      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[11px] font-semibold text-gold"
    >
      <Camera className="h-3.5 w-3.5" /> Send proof screenshot to admin
    </button>
  ) : null;

  if (proofOnly) {
    return proofButton ? <div className={className}>{proofButton}</div> : null;
  }

  return (
    <div className={className}>
      <div className="text-[9px] uppercase tracking-[0.3em] text-gold/70">Reveal early — share once</div>
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
            } catch {
              /* noop */
            }
            done();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-2 text-[11px] text-foreground/85"
          aria-label="Copy link"
        >
          <Link2 className="h-3.5 w-3.5 text-gold/80" /> Copy link
        </button>
      </div>
      {proofButton}
    </div>
  );
}
