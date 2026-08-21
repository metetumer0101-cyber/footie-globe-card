import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — FootCard Scout Account" },
      { name: "description", content: "Sign in to FootCard to save your XP, scout rank and leaderboard position." },
      { property: "og:title", content: "Sign in — FootCard" },
      { property: "og:description", content: "Create a FootCard scout account to track XP and ranks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/games", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/games` },
          });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t(mode === "signin" ? "auth.welcome" : "auth.checkEmail"));
    navigate({ to: "/games" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message ?? "OAuth error");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/games" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t(mode === "signin" ? "auth.signIn" : "auth.signUp")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>

        <form onSubmit={submit} className="card-surface space-y-3 rounded-3xl p-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.email")}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.password")}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-60"
          >
            {t(mode === "signin" ? "auth.signIn" : "auth.signUp")}
          </button>
          <button
            type="button"
            onClick={google}
            className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3 font-bold"
          >
            {t("auth.google")}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-sm text-muted-foreground underline"
        >
          {t(mode === "signin" ? "auth.needAccount" : "auth.haveAccount")}
        </button>
      </div>
    </AppShell>
  );
}
