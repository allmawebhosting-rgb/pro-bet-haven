import { QueryClient, QueryClientProvider, useQuery, queryOptions } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getSiteSettings } from "@/lib/site.functions";
import { SiteSettingsProvider, type SiteSettings } from "@/lib/site-context";
import { supabase } from "@/integrations/supabase/client";

const settingsQuery = queryOptions({
  queryKey: ["site_settings"],
  queryFn: () => getSiteSettings(),
  staleTime: 60_000,
});

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-2xl p-8 text-center">
        <h1 className="font-display text-2xl gold-text">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full gold-bg px-5 py-2 text-sm font-semibold"
          >Try again</button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { title: "Aurum — Premium Sports Predictions" },
      { name: "description", content: "A private members' circle for premium, carefully researched football predictions. Join today." },
      { property: "og:title", content: "Aurum — Premium Sports Predictions" },
      { property: "og:description", content: "A private members' circle for premium, carefully researched football predictions. Join today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aurum — Premium Sports Predictions" },
      { name: "twitter:description", content: "A private members' circle for premium, carefully researched football predictions. Join today." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23bd777d-fc91-4fe1-b80b-7d0e826ad5c8/id-preview-1db5bd02--408d69d8-796f-4031-bb90-562f27dbd8a1.lovable.app-1785196342118.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23bd777d-fc91-4fe1-b80b-7d0e826ad5c8/id-preview-1db5bd02--408d69d8-796f-4031-bb90-562f27dbd8a1.lovable.app-1785196342118.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  shellComponent: RootShell,
  component: RootComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <RootInner />
    </QueryClientProvider>
  );
}

function RootInner() {
  const { queryClient } = Route.useRouteContext();
  const { data } = useQuery(settingsQuery);
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <SiteSettingsProvider settings={(data as SiteSettings) ?? undefined!}>
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
    </SiteSettingsProvider>
  );
}
