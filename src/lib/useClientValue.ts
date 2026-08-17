"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Reads a client-only value (typically something from src/lib/storage.ts)
 * without the "setState directly inside an effect" pattern — this project
 * has no cross-tab sync needs, so `subscribe` is a no-op and callers just
 * get a fresh read on every render. `serverSnapshot` is what SSR/the first
 * hydration pass sees, before localStorage is reachable.
 */
export function useClientValue<T>(getSnapshot: () => T, serverSnapshot: T): T {
  return useSyncExternalStore(noopSubscribe, getSnapshot, () => serverSnapshot);
}
