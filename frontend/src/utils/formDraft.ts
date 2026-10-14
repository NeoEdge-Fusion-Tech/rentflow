import { useEffect, useRef, useState } from "react";

/*
 * Keeps an unsaved form in localStorage so a user who wanders off (another
 * app tab, another browser tab, a refresh) can pick up where they left off.
 */

const PREFIX = "formDraft:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // drafts older than a week are dropped

export interface Draft<T> {
  data: T;
  savedAt: number;
  orgId?: string | number | null;
}

export function loadDraft<T>(
  key: string,
  orgId?: string | number | null,
): Draft<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft<T>;
    const stale = Date.now() - (draft.savedAt || 0) > MAX_AGE_MS;
    const otherOrg =
      orgId != null &&
      draft.orgId != null &&
      String(draft.orgId) !== String(orgId);
    if (stale || otherOrg) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/**
 * Autosaves `data` under `key` (debounced) once `ready` is true and the data
 * differs from the pristine form (`baseline`). Returns the time of the last
 * autosave, for a "Draft saved" hint.
 */
export function useDraftAutosave<T>(
  key: string,
  data: T,
  {
    ready,
    baseline,
    orgId,
    delay = 600,
  }: {
    ready: boolean;
    baseline: string | null;
    orgId?: string | number | null;
    delay?: number;
  },
) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!ready || baseline === null) return;
    const serialized = JSON.stringify(data);
    const t = setTimeout(() => {
      try {
        if (serialized === baseline) {
          // Back to an untouched form: nothing worth keeping.
          localStorage.removeItem(PREFIX + keyRef.current);
          setSavedAt(null);
          return;
        }
        const now = Date.now();
        localStorage.setItem(
          PREFIX + keyRef.current,
          JSON.stringify({ data, savedAt: now, orgId } as Draft<T>),
        );
        setSavedAt(now);
      } catch {
        /* storage full or blocked: drafts are best-effort */
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, baseline, JSON.stringify(data), orgId]);

  return savedAt;
}

export const timeAgo = (ts: number) => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleString();
};
