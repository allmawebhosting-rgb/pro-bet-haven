import { Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/site-context";

export function Logo({ className = "" }: { className?: string }) {
  const { settings } = useSiteSettings();
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      {settings.logo_url ? (
        <img src={settings.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="grid h-9 w-9 place-items-center rounded-full gold-bg shadow-[0_0_20px_oklch(0.82_0.14_85/40%)]">
          <span className="font-display text-lg text-primary-foreground">A</span>
        </div>
      )}
      <span className="font-display text-xl sm:text-2xl tracking-tight">
        <span className="gold-text">{settings.site_name.split(" ")[0]}</span>
        {settings.site_name.includes(" ") && (
          <span className="text-foreground/90"> {settings.site_name.split(" ").slice(1).join(" ")}</span>
        )}
      </span>
    </Link>
  );
}
