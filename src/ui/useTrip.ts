import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { getActiveTripId, listTrips, loadState } from "../db/repo";
import { runRules } from "../engine/rules";

/** Trips on this phone, the trip shown now (live from IndexedDB) and its derived issues. */
export function useTrip() {
  const trips = useLiveQuery(() => listTrips());
  const activeId = useLiveQuery(() => getActiveTripId(), [trips?.length]);
  const state = useLiveQuery(async () => (activeId ? (await loadState(activeId)) ?? null : null), [activeId]);
  const issues = useMemo(() => (state ? runRules(state) : []), [state]);
  return { trips, activeId, state, issues, loading: trips === undefined || state === undefined };
}
