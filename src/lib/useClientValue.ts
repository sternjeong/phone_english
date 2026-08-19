"use client";

import { useRef, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Reads a client-only value (typically something from src/lib/storage.ts)
 * without the "setState directly inside an effect" pattern — this project
 * has no cross-tab sync needs, so `subscribe` is a no-op and callers just
 * get a fresh read on every render. `serverSnapshot` is what SSR/the first
 * hydration pass sees, before localStorage is reachable.
 *
 * `useSyncExternalStore` requires `getSnapshot` to return a *referentially
 * stable* value when the underlying data hasn't changed — our storage
 * helpers return a fresh array/object from JSON.parse on every call, which
 * otherwise makes every render look like "the store changed" and causes
 * React to bail out with "Maximum update depth exceeded" (caught by
 * actually running the app, not by tsc/lint). We cache the last snapshot
 * and only hand out a new reference when its serialized content differs.
 */
export function useClientValue<T>(getSnapshot: () => T, serverSnapshot: T): T {
  const cacheRef = useRef<{ raw: string; value: T } | null>(null);

  function cachedGetSnapshot(): T {
    const value = getSnapshot();
    const raw = JSON.stringify(value);
    if (cacheRef.current && cacheRef.current.raw === raw) {
      return cacheRef.current.value;
    }
    cacheRef.current = { raw, value };
    return value;
  }

  return useSyncExternalStore(noopSubscribe, cachedGetSnapshot, () => serverSnapshot);
}
