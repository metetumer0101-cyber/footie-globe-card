import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshEntity } from "@/lib/freshness.functions";
import { cn } from "@/lib/utils";

function formatAgo(fetchedAt: number, t: TFunction): string {
  const mins = Math.max(0, Math.floor((Date.now() - fetchedAt) / 60_000));
  if (mins < 1) return t("freshness.updatedJustNow");
  if (mins < 60) return t("freshness.updatedMinutes", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("freshness.updatedHours", { count: hours });
  return t("freshness.updatedDays", { count: Math.floor(hours / 24) });
}

/**
 * Manual "refresh data" control with a last-updated badge. Busts the
 * server-side API cache for the entity and re-runs the page queries.
 */
export function RefreshDataButton({
  kind,
  id,
  apiId,
  name,
  fetchedAt,
}: {
  kind: "player" | "team";
  id: string;
  apiId?: number | undefined;
  name?: string | undefined;
  fetchedAt?: number | null | undefined;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const runRefresh = useServerFn(refreshEntity);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await runRefresh({
        data: {
          kind,
          id,
          ...(apiId != null && Number.isFinite(apiId) ? { apiId } : {}),
          ...(name ? { name } : {}),
        },
      });
      if (res.ok) {
        toast.success(t("freshness.refreshed"));
        await queryClient.invalidateQueries();
      } else {
        toast.info(t("freshness.wait", { seconds: res.retryAfterSeconds ?? 60 }));
      }
    } catch {
      toast.error(t("freshness.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {fetchedAt != null && (
        <span className="hidden text-[10px] text-muted-foreground sm:inline">
          {formatAgo(fetchedAt, t)}
        </span>
      )}
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={busy}
        aria-label={t("freshness.refresh")}
        title={t("freshness.refresh")}
        className="inline-flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
        {busy ? t("freshness.refreshing") : t("freshness.refresh")}
      </button>
    </div>
  );
}
