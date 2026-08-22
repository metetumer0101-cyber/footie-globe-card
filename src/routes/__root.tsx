import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import i18n, { languages, detectAndApplyLanguage, STORAGE_KEY } from "../i18n";
import { reportLovableError } from "../lib/lovable-error-reporting";
import brandIcon from "../assets/footcard-icon.png";

function NotFoundComponent() {
  return (
    <div className="pitch-bg flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card-surface max-w-md rounded-3xl p-8 text-center">
        <img
          src={brandIcon}
          alt="FootCard"
          width={96}
          height={96}
          className="mx-auto h-24 w-24"
        />
        <h1 className="mt-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-6xl font-black tracking-tight text-transparent">
          404
        </h1>
        <h2 className="mt-3 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FootCard — Football Scout, Player Cards & Comparison" },
      { name: "description", content: "Mobile-first football scouting platform: player cards, comparisons, squad builder and competitions in 35 languages." },
      { property: "og:title", content: "FootCard" },
      { property: "og:description", content: "Player cards, scouting and comparisons for football fans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#10B981" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "FootCard" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icon-180.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const apply = (lng: string) => {
      const meta = languages.find((l) => l.code === lng) ?? languages.find((l) => l.code === lng.split("-")[0]);
      document.documentElement.lang = meta?.code ?? "en";
      document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
      setLang(meta?.code ?? "en");
    };
    i18n.on("languageChanged", apply);
    // Defer detection past hydration so the client first renders the same
    // markup the server produced (always English).
    const id = window.setTimeout(() => {
      detectAndApplyLanguage();
      apply(i18n.resolvedLanguage ?? "en");
    }, 0);
    return () => {
      window.clearTimeout(id);
      i18n.off("languageChanged", apply);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet key={lang} />
      <Toaster />
    </QueryClientProvider>
  );
}
