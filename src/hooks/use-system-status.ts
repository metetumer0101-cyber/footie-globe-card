import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSystemStatus } from "@/lib/system-status.functions";
import type { SystemStatus } from "@/lib/system-status.server";

/** Shared system-status query (quota exhausted / ok). Polls so the empty state
 * clears automatically once the midnight reset restores quota. */
export function useSystemStatus() {
  const fetchStatus = useServerFn(getSystemStatus);
  return useQuery<SystemStatus>({
    queryKey: ["system-status"],
    queryFn: () => fetchStatus(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
