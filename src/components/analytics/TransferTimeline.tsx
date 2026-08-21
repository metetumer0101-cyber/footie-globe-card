import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ArrowRight, History } from "lucide-react";
import { getPlayerTransfers } from "@/lib/live.functions";

/** Historical transfer timeline, served through the cached API proxy. */
export function TransferTimeline({ playerId }: { playerId: string }) {
  const { t } = useTranslation();
  const fetchTransfers = useServerFn(getPlayerTransfers);

  const { data, isLoading } = useQuery({
    queryKey: ["transfers", playerId],
    queryFn: () => fetchTransfers({ data: { playerId } }),
    staleTime: 60 * 60 * 1000,
  });

  const moves = data?.moves ?? [];
  if (!isLoading && moves.length === 0) return null;

  return (
    <section className="mt-3 rounded-2xl border border-border bg-secondary/30 p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold">
        <History className="h-4 w-4 text-accent" />
        {t("transferHistory", { defaultValue: "Transfer history" })}
      </h3>
      {isLoading ? (
        <div className="mt-2 h-10 animate-pulse rounded-xl bg-secondary" />
      ) : (
        <ul className="mt-2 space-y-1">
          {moves.map((m, i) => (
            <li key={`${m.from}-${m.to}-${i}`} className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">{m.from}</span>
              <ArrowRight className="h-3 w-3 text-primary" />
              <span className="font-semibold">{m.to}</span>
              {m.date && <span className="ml-auto text-muted-foreground">{m.date.slice(0, 4)}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
