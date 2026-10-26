import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  DEFAULT_DATE_FILTER,
  DateFilterValue,
} from "../components/DateFilterBar";

/*
 * Keeps a list page's tab, search, page and date filter in the URL, so
 * opening a record and coming back (browser back, or our back arrows)
 * returns to the same view — e.g. the Trash tab — instead of the default.
 */

const KEY = (path: string) => `listUrl:${path}`;

/** Where "back to the list" should go: the list as the user last left it. */
export const listUrl = (path: string) => {
  try {
    return path + (sessionStorage.getItem(KEY(path)) || "");
  } catch {
    return path;
  }
};

export interface ListUrlState {
  tab: string;
  search: string;
  page: number;
  dateFilter: DateFilterValue;
}

/** Initial values read from the current URL. */
export const readListUrlState = (
  params: URLSearchParams,
  defaultTab = "All",
): ListUrlState => ({
  tab: params.get("tab") || defaultTab,
  search: params.get("q") || "",
  page: Math.max(1, Number(params.get("page")) || 1),
  dateFilter: {
    field: (params.get("df") as any) || DEFAULT_DATE_FILTER.field,
    preset: params.get("dp") || DEFAULT_DATE_FILTER.preset,
    from: params.get("from") || "",
    to: params.get("to") || "",
    ordering: params.get("ord") || DEFAULT_DATE_FILTER.ordering,
  },
});

/** Mirror the list state into the URL (replace, so Back skips edits). */
export function useSyncListUrl(state: ListUrlState, defaultTab = "All") {
  const [, setParams] = useSearchParams();
  const location = useLocation();
  const { tab, search, page, dateFilter: d } = state;

  useEffect(() => {
    const next = new URLSearchParams();
    if (tab && tab !== defaultTab) next.set("tab", tab);
    if (search) next.set("q", search);
    if (page > 1) next.set("page", String(page));
    if (d.from || d.to) {
      next.set("df", d.field);
      next.set("dp", d.preset);
      if (d.from) next.set("from", d.from);
      if (d.to) next.set("to", d.to);
    }
    if (d.ordering !== DEFAULT_DATE_FILTER.ordering)
      next.set("ord", d.ordering);
    setParams(next, { replace: true });
    try {
      const qs = next.toString();
      sessionStorage.setItem(KEY(location.pathname), qs ? `?${qs}` : "");
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, page, d.field, d.preset, d.from, d.to, d.ordering]);
}
