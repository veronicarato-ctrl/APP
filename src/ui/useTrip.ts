import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { firstTripId, loadState } from "../db/repo";
import { runRules } from "../engine/rules";

/** Live trip state from IndexedDB plus the derived issues. */
export function useTrip() {
  const state = useLiveQuery(async () => {
    const id = await firstTripId();
    return id ? loadState(id) : undefined;
  });
  const issues = useMemo(() => (state ? runRules(state) : []), [state]);
  return { state, issues };
}
