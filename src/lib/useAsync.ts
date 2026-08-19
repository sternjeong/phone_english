"use client";

import { useCallback, useEffect, useState } from "react";

type AsyncState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "error"; data?: undefined; error: string }
  | { status: "ready"; data: T; error?: undefined };

/**
 * Fetches server-backed data (src/lib/storage.ts / archive.ts, all
 * network calls now that the app has accounts) with loading/error states.
 * Genuine async I/O on mount is the canonical valid `useEffect` use case —
 * unlike the old localStorage reads, this really can't be done during
 * render, so no `useSyncExternalStore` trick here (see useClientValue.ts
 * for that pattern, still used for a couple of purely-local UI bits).
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    fn()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
    // `fn` is intentionally excluded — callers pass a fresh inline closure
    // every render; `deps` (plus `tick` for reload()) is what controls
    // when this should actually re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, reload } as AsyncState<T> & { reload: () => void };
}
