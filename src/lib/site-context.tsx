import { createContext, useContext, type ReactNode } from "react";

export type SiteSettings = {
  id: number;
  site_name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  updated_at: string;
};

const defaultSettings: SiteSettings = {
  id: 1,
  site_name: "Aurum Predictions",
  tagline: "Premium Sports Predictions",
  logo_url: null,
  primary_color: "#D4AF37",
  accent_color: "#F5D57A",
  updated_at: new Date().toISOString(),
};

const Ctx = createContext<{ settings: SiteSettings }>({ settings: defaultSettings });

export function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings | undefined | null;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ settings: settings ?? defaultSettings }}>{children}</Ctx.Provider>;
}

export function useSiteSettings() {
  return useContext(Ctx);
}
