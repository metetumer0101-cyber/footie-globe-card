import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLiveFeed } from "@/lib/live.functions";

export const LIVE_POLL_MS = 30_000;

/** Shared live-feed query: auto-polls every 30s and refreshes on tab focus/reconnect. */
export function useLiveFeed() {
  const fetchFeed = useServerFn(getLiveFeed);
  return useQuery({
    queryKey: ["live-feed"],
    queryFn: () => fetchFeed(),
    refetchInterval: LIVE_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: LIVE_POLL_MS / 2,
  });
}
