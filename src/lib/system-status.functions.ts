import { createServerFn } from "@tanstack/react-start";
import { getSystemStatus as readSystemStatus, type SystemStatus } from "./system-status.server";
import { ensureMidnightRefresh } from "./midnight-refresh.server";

/**
 * Server-only system status used by Home / Live to render an honest empty
 * state when the daily API quota is exhausted. Calling it also (re-)arms the
 * UTC-midnight cache invalidation + warm refresh, so any Home/Live visit keeps
 * the timing loop alive.
 */
export const getSystemStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<SystemStatus> => {
    ensureMidnightRefresh();
    return readSystemStatus();
  },
);
